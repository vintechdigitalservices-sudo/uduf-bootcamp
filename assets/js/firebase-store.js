/* ============================================================
   UDUF Bootcamp — data layer
   --------------------------------------------------------
   Persists registrations to Firebase Firestore (client SDK).

   Security model:
   - Clients may CREATE registrations but only in a PENDING state.
     Firestore rules force paymentStatus to remain
     'pending_payment' / 'pending_verification' and never allow a
     user to set ticketCode, ticketStatus or to approve themselves.
   - Public ticket records live in `tickets/{code}`, written ONLY by
     the admin SDK (api/admin.js) after verification.
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
    const ok = ['pending_payment', 'pending_verification', 'verified', 'rejected'];
    return ok.indexOf(p) !== -1 ? p : 'pending_payment';
  }

  /* ---------------- Registration ---------------- */

  /**
   * data: { ticketType, ticketLabel, amount, paymentMethod,
   *         purchaser, participants, receipt, whatsapp }
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
      ticketStatus: 'none',
      ticketCode: '',
      ticketCodes: [],
      purchaser: data.purchaser || {},
      participants: data.participants || [],
      receipt: data.receipt || null,
      whatsapp: data.whatsapp || { sent: false, at: null },
      createdAt: stamp(),
      updatedAt: stamp(),
    };

    if (!isLive()) {
      /* Demo mode: there is no administrator to verify, so the ticket
         is issued immediately so the whole pickup flow can be tested
         offline. Production (Firestore) always waits for approval. */
      base.paymentStatus = 'verified';
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
   * Move a pending registration forward (smartContract-safe update).
   * patch: { paymentStatus, receipt, whatsapp, updatedAt, ... }
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
  };
})();