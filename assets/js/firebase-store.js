/* ============================================================
   UDUF Bootcamp — data layer
   --------------------------------------------------------
   Persists registrations to Firebase Firestore (client SDK).

   Security model:
   - Clients may CREATE registrations but only in a PENDING state.
     Firestore rules force paymentStatus to remain
     'awaiting_verification' / 'pending_payment' and never allow a
     user to set ticketCode, ticketStatus or to approve themselves.
   - Payment receipts are uploaded straight to the organisation's
     Cloudinary account (unsigned preset); only the returned
     receiptUrl is stored here — never the file itself.
   - Public ticket records live in `tickets/{code}`. Issue/update is
     gated by Firestore rules to authenticated admins only (an admin
     is any user whose UID has a record in `admins/{uid}`) — there is
     NO serverless backend.
   - The admin dashboard signs in with Firebase Auth (email/password)
     and talks to Firestore directly through these rules.
   - If Firestore is unavailable (offline / CDN blocked / demo) we
     fall back to a localStorage demo mode that pages through the
     whole flow with an immediately issued ticket.
   ============================================================ */

(function () {
  'use strict';

  const CFG = window.UDUF;
  if (!CFG) return;

  let db = null;

  function init() {
    if (db) return db;
    try {
      if (typeof firebase === 'undefined' || !firebase.firestore) return null;
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(CFG.firebase);
      }
      db = firebase.firestore();
    } catch (err) {
      db = null;
    }
    return db;
  }

  function isLive() {
    return !!CFG && !!CFG.firebase && !!init();
  }

  /* ---------------- Auth (email / password) ----------------
     Powers the admin dashboard. Sign-in requires the Email/Password
     provider to be enabled in Firebase console. */

  function initAuth() {
    if (typeof firebase === 'undefined' || !firebase.auth) return null;
    try {
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(CFG.firebase);
      }
      return firebase.auth();
    } catch (err) {
      return null;
    }
  }

  async function signIn(email, password) {
    const auth = initAuth();
    if (!auth) return { ok: false, message: 'Firebase Auth is not available.' };
    try {
      const cred = await auth.signInWithEmailAndPassword(String(email || '').trim(), String(password || ''));
      return { ok: true, user: cred.user };
    } catch (err) {
      let message = 'Sign-in failed.';
      if (err && err.code) {
        if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].indexOf(err.code) !== -1) {
          message = 'Wrong email or password.';
        } else if (err.code === 'auth/invalid-email') {
          message = 'That email address does not look right.';
        } else if (err.code === 'auth/user-disabled') {
          message = 'This account has been disabled.';
        } else {
          message = err.message || message;
        }
      }
      return { ok: false, message };
    }
  }

  async function signOut() {
    const auth = initAuth();
    if (!auth) return;
    try {
      await auth.signOut();
    } catch (err) {}
  }

  /* Subscribes to auth state. fn(userOrNull) where user has
     { uid, email }. Returns an unsubscribe function. */
  function onAuth(fn) {
    const auth = initAuth();
    if (!auth) {
      fn(null);
      return function () {};
    }
    return auth.onAuthStateChanged(function (user) {
      fn(user ? { uid: user.uid, email: user.email || '' } : null);
    });
  }

  function currentUser() {
    const auth = initAuth();
    if (!auth || !auth.currentUser) return null;
    return { uid: auth.currentUser.uid, email: auth.currentUser.email || '' };
  }

  function firestoreRef() {
    return isLive() ? db : null;
  }

  /* ---------------- Demo (localStorage) store ---------------- */

  function demoAll() {
    try {
      return JSON.parse(localStorage.getItem(CFG.storeKey)) || [];
    } catch {
      return [];
    }
  }

  function demoSave(list) {
    try {
      localStorage.setItem(CFG.storeKey, JSON.stringify(list));
    } catch (err) {}
  }

  function demoFindRef(refId) {
    const key = String(refId || '').trim().toUpperCase();
    return demoAll().find((r) => String(r.refId || r.code || '').toUpperCase() === key) || null;
  }

  function demoCheckRefUsed(refId) {
    return !!demoFindRef(refId);
  }

  function demoCheckCodeUsed(code) {
    const key = String(code || '').trim().toUpperCase();
    return demoAll().some(
      (r) =>
        (r.code && String(r.code).toUpperCase() === key) ||
        ((r.ticketCodes || []).some((c) => String(c).toUpperCase() === key))
    );
  }

  /* ---------------- ID / code generation ---------------- */

  const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function randomRef() {
    let s = '';
    for (let i = 0; i < 8; i++) s += ALNUM[Math.floor(Math.random() * ALNUM.length)];
    return CFG.refPrefix + s;
  }

  async function makeRefId() {
    for (let i = 0; i < 40; i++) {
      const id = randomRef();
      if (isLive()) {
        const snap = await db.collection('registrations').doc(id).get();
        if (!snap.exists) return id;
      } else if (!demoCheckRefUsed(id)) {
        return id;
      }
    }
    return randomRef() + '-' + Date.now().toString().slice(-4);
  }

  function randomBlock() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  function makeCode() {
    return `UDUF-${randomBlock()}-${randomBlock()}`;
  }

  async function makeTicketCodes(count) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      let code = '';
      for (let attempt = 0; attempt < 40; attempt++) {
        const candidate = makeCode();
        let used = false;
        if (isLive()) {
          const snap = await db.collection('tickets').doc(candidate).get();
          used = !!snap.exists;
        } else {
          used = demoCheckCodeUsed(candidate);
        }
        if (!used) {
          code = candidate;
          break;
        }
      }
      if (!code) code = makeCode();
      codes.push(code);
    }
    return codes;
  }

  function stamp(d = new Date()) {
    return d.toISOString();
  }

  function guardPayments(p) {
    const ok = ['pending_payment', 'awaiting_verification', 'pending_verification', 'verified', 'rejected'];
    return ok.indexOf(p) !== -1 ? p : 'pending_payment';
  }

  /* ---------------- Registration ---------------- */

  /**
   * data: { ticketType, ticketLabel, amount, paymentMethod,
   *         paymentStatus, status, purchaser, participants,
   *         receiptUrl, receiptName, amountPaid, paymentDate,
   *         paymentSubmittedAt, whatsapp }
   * Returns { ok, refId, record } — demo mode confirms and issues.
   */
  async function createRegistration(data) {
    const refId = await makeRefId();
    const base = {
      refId,
      ticketType: data.ticketType,
      ticketLabel: data.ticketLabel,
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod === 'online' ? 'online' : 'manual',
      paymentStatus: guardPayments(data.paymentStatus || 'pending_payment'),
      status: 'pending',
      ticketStatus: 'none',
      ticketCode: '',
      ticketCodes: [],
      purchaser: data.purchaser || {},
      participants: data.participants || [],
      receiptUrl: data.receiptUrl || null,
      receiptName: data.receiptName || null,
      amountPaid: Number(data.amount),
      paymentDate: data.paymentDate || null,
      paymentSubmittedAt: data.paymentSubmittedAt || stamp(),
      whatsapp: data.whatsapp || { sent: false, at: null },
      createdAt: stamp(),
      updatedAt: stamp(),
    };

    if (!isLive()) {
      /* Demo mode: there is no administrator to verify, so the ticket
         is issued immediately so the whole pickup flow can be tested
         offline. Production (Firestore) always waits for approval. */
      base.paymentStatus = 'verified';
      base.status = 'approved';
      base.ticketStatus = 'generated';
      const codes = await makeTicketCodes(base.participants.length || 1);
      base.ticketCodes = codes;
      base.ticketCode = codes[0];
      base.participants = (base.participants || []).map((p, i) => ({ ...p, ticketCode: codes[i] }));
      demoWrite(base);
      return { ok: true, refId, record: base };
    }

    try {
      await db.collection('registrations').doc(refId).set({
        ...base,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true, refId, record: base };
    } catch (err) {
      return { ok: false, message: err && err.message ? err.message : 'Could not save your registration.' };
    }
  }

  /**
   * Move a PENDING registration forward (public, rules-gated).
   * patch may carry receiptUrl / receiptName / paymentStatus
   * (pending_payment -> awaiting_verification) / whatsapp / source.
   */
  async function updateRegistration(refId, patch) {
    if (!isLive()) {
      const list = demoAll();
      const idx = list.findIndex((r) => String(r.refId).toUpperCase() === String(refId).toUpperCase());
      if (idx === -1) return { ok: false, message: 'Registration not found.' };
      list[idx] = { ...list[idx], ...patch, updatedAt: stamp() };
      demoSave(list);
      return { ok: true, record: list[idx] };
    }
    try {
      await db.collection('registrations').doc(refId).update({
        ...patch,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err && err.message ? err.message : 'Could not update your registration.' };
    }
  }

  /* ---------------- Lookups ---------------- */

  async function getRegistration(refId) {
    const id = String(refId || '').trim().toUpperCase();
    if (!id) return null;
    if (!isLive()) return demoFindRef(id) || null;
    try {
      const ref = db.collection('registrations').doc(id);
      const snap = await ref.get();
      if (!snap.exists) return null;
      return flatten(snap.data());
    } catch (err) {
      return null;
    }
  }

  async function getTicket(code) {
    const key = String(code || '').trim().toUpperCase();
    if (!key) return null;
    if (!isLive()) {
      const row = demoAll().find((r) => {
        if (String(r.code || '').toUpperCase() === key) return true;
        const target = (r.participants || []).find((p) => String(p.ticketCode || '').toUpperCase() === key);
        return !!target;
      });
      if (!row) return null;
      let fullName = row.fullName || (row.purchaser && row.purchaser.fullName) || '';
      if (row.participants && row.participants.length) {
        const p = row.participants.find((x) => String(x.ticketCode || '').toUpperCase() === key);
        if (p) fullName = p.fullName;
      }
      return {
        code: key,
        refId: row.refId,
        fullName,
        ticketType: row.ticketType,
        ticketLabel: row.ticketLabel,
        status: row.ticketStatus === 'checked_in' ? 'checked_in' : 'valid',
      };
    }
    try {
      const snap = await db.collection('tickets').doc(key).get();
      if (!snap.exists) return null;
      return flatten(snap.data());
    } catch (err) {
      return null;
    }
  }

  /* ---------------- Admin-generated ticket mirror (demo) ---------------- */

  function demoWrite(record) {
    const list = demoAll();
    const idx = list.findIndex((r) => String(r.refId).toUpperCase() === String(record.refId).toUpperCase());
    if (idx !== -1) list[idx] = record;
    else list.push(record);
    demoSave(list);
  }

  /* ---------------- misc ---------------- */

  function flatten(doc) {
    const out = {};
    Object.keys(doc || {}).forEach((k) => {
      const v = doc[k];
      out[k] = v && typeof v.toDate === 'function' ? v.toDate().toISOString() : v;
    });
    return out;
  }

  window.UDUFFire = {
    isLive,
    createRegistration,
    updateRegistration,
    getRegistration,
    getTicket,
    makeTicketCodes,
    now: stamp,
    auth: {
      signIn,
      signOut,
      onAuth,
      currentUser,
    },
    db: firestoreRef,
  };
})();