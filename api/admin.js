/* ============================================================
   UDUF Bootcamp — Admin API (Vercel serverless function)
   --------------------------------------------------------
   This function is the ONLY place privileged Firebase admin
   credentials are used. It never runs in the browser and the
   service-account secret is never shipped to the frontend.

   Deploy requirements (set in Vercel > Project > Environment
   Variables):
     FIREBASE_SERVICE_ACCOUNT   JSON string of the admin SDK key
     ADMIN_PASSWORD             a strong password for this dashboard

   Locally, if a *-firebase-adminsdk-*.json file exists in the
   repo root it is used instead (that file is git-ignored).

   Actions (all require the x-admin-password header):
     GET  ?action=list&status=pending_verification|pending_payment|all
     GET  ?action=get&id=<refId>
     POST ?action=approve  {"id": "<refId>"}
     POST ?action=reject   {"id": "<refId>", "reason": "..."}
     POST ?action=checkin  {"code": "UDUF-XXXX-XXXX"}
     POST ?action=uncheckin {"code": "UDUF-XXXX-XXXX"}
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');

let admin = null;
let initialized = false;

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  const root = path.join(__dirname, '..');
  const files = fs.readdirSync(root).filter((f) => /-firebase-adminsdk-.*\.json$/.test(f));
  if (files.length) {
    return JSON.parse(fs.readFileSync(path.join(root, files[0]), 'utf8'));
  }
  return null;
}

function getAdmin() {
  if (initialized) return admin;
  initialized = true;
  try {
    admin = require('firebase-admin');
    const serviceAccount = loadServiceAccount();
    if (!serviceAccount) {
      admin = null;
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured.');
    }
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
  } catch (err) {
    admin = null;
    throw err;
  }
  return admin;
}

function json(res, code, body) {
  res.status(code).setHeader('Content-Type', 'application/json');
  res.status(code).setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function bodyOf(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function authorized(req) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const given = req.headers['x-admin-password'] || '';
  return given === expected;
}

/* ---------------- helpers ---------------- */

function clean(v) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
}

function randomBlock() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function makeTicketCodes(db, count) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    let code = '';
    for (let attempt = 0; attempt < 40; attempt++) {
      const candidate = `UDUF-${randomBlock()}-${randomBlock()}`;
      const snap = await db.collection('tickets').doc(candidate).get();
      if (!snap.exists) {
        code = candidate;
        break;
      }
    }
    if (!code) code = `UDUF-${randomBlock()}-${Date.now().toString().slice(-6)}`;
    codes.push(code);
  }
  return codes;
}

function serializable(doc) {
  const out = {};
  Object.keys(doc || {}).forEach((k) => {
    const v = doc[k];
    out[k] = v && typeof v.toDate === 'function' ? v.toDate().toISOString() : v;
  });
  return out;
}

async function listRegistrations(adminSdk, status) {
  const db = adminSdk.firestore();
  let q = db.collection('registrations');
  if (status === 'pending_verification' || status === 'pending_payment' || status === 'verified' || status === 'rejected') {
    q = q.where('paymentStatus', '==', status);
  }
  const snap = await q.limit(500).get();
  const rows = [];
  snap.forEach((d) => {
    const r = serializable(d.data());
    rows.push({
      refId: r.refId,
      fullName: (r.purchaser && r.purchaser.fullName) || r.fullName || '',
      ticketType: r.ticketType,
      ticketLabel: r.ticketLabel,
      amount: r.amount,
      paymentMethod: r.paymentMethod,
      paymentStatus: r.paymentStatus,
      ticketStatus: r.ticketStatus,
      hasReceipt: !!(r.receipt && r.receipt.data),
      participantCount: (r.participants || []).length,
      createdAt: r.createdAt || '',
      rejectionReason: r.rejectionReason || '',
    });
  });
  rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return rows;
}

async function approveRegistration(adminSdk, refId) {
  const db = adminSdk.firestore();
  const ref = db.collection('registrations').doc(String(refId).trim().toUpperCase());
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Registration not found.');
  const reg = snap.data();

  if (reg.paymentStatus === 'verified') {
    throw new Error('This registration has already been approved.');
  }
  if (reg.paymentStatus !== 'pending_verification' && reg.paymentStatus !== 'pending_payment') {
    throw new Error(`Cannot approve a registration in status "${reg.paymentStatus}".`);
  }

  const participants = Array.isArray(reg.participants) && reg.participants.length ? reg.participants : [
    { fullName: (reg.purchaser && reg.purchaser.fullName) || '', phone: '', email: '', age: '' },
  ];

  const codes = await makeTicketCodes(db, participants.length);
  const batch = db.batch();
  const now = adminSdk.firestore.FieldValue.serverTimestamp();

  participants.forEach((p, i) => {
    batch.set(db.collection('tickets').doc(codes[i]), {
      code: codes[i],
      refId: reg.refId,
      fullName: clean(p.fullName),
      ticketType: reg.ticketType || 'individual',
      ticketLabel: reg.ticketLabel || 'Individual Ticket',
      status: 'valid',
      createdAt: now,
    });
  });

  batch.update(ref, {
    paymentStatus: 'verified',
    ticketStatus: 'generated',
    ticketCode: codes[0],
    ticketCodes: codes,
    participants: participants.map((p, i) => ({ ...p, ticketCode: codes[i] })),
    reviewedAt: now,
    reviewedBy: 'admin',
    rejectionReason: '',
  });

  await batch.commit();
  return { codes, refId: reg.refId };
}

async function rejectRegistration(adminSdk, refId, reason) {
  const db = adminSdk.firestore();
  const ref = db.collection('registrations').doc(String(refId).trim().toUpperCase());
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Registration not found.');
  const reg = snap.data();

  if (reg.paymentStatus === 'verified') {
    throw new Error('This registration is already verified. Use a reject only before approval.');
  }

  await ref.update({
    paymentStatus: 'rejected',
    ticketStatus: 'none',
    rejectionReason: clean(reason) || 'Payment could not be verified.',
    reviewedAt: adminSdk.firestore.FieldValue.serverTimestamp(),
    reviewedBy: 'admin',
  });
  return { ok: true };
}

async function checkInTicket(adminSdk, codeRaw, reverse) {
  const db = adminSdk.firestore();
  const code = clean(codeRaw).toUpperCase();
  if (!code) throw new Error('Ticket code is required.');

  const ref = db.collection('tickets').doc(code);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('No ticket found for ' + code + '.');

  const ticket = snap.data();
  const now = adminSdk.firestore.FieldValue.serverTimestamp();

  await ref.update(reverse
    ? { status: 'valid', checkedInAt: null }
    : { status: 'checked_in', checkedInAt: now });

  /* Reflect "used" on the parent registration when every ticket in
     that purchase has been scanned (or it was a single ticket). */
  if (ticket.refId) {
    const regRef = db.collection('registrations').doc(String(ticket.refId).trim().toUpperCase());
    const regSnap = await regRef.get();
    if (regSnap.exists) {
      const reg = regSnap.data();
      const codes = Array.isArray(reg.ticketCodes) && reg.ticketCodes.length ? reg.ticketCodes : [reg.ticketCode];
      const codeSnaps = await Promise.all(codes.map((c) => db.collection('tickets').doc(String(c).toUpperCase()).get()));
      const allUsed = codeSnaps.every((s) => s.exists && s.data().status === 'checked_in');
      await regRef.update({ ticketStatus: allUsed ? 'checked_in' : 'generated' });
    }
  }

  return { ok: true, code };
}

/* ---------------- handler ---------------- */

module.exports = async function handler(req, res) {
  if (!authorized(req)) {
    return json(res, 401, { ok: false, message: 'Unauthorized.' });
  }

  let adminSdk;
  try {
    adminSdk = getAdmin();
  } catch (err) {
    return json(res, 500, { ok: false, message: 'Server not configured: ' + err.message });
  }

  try {
    const action = req.query && req.query.action ? req.query.action : '';

    if (req.method === 'GET' && action === 'list') {
      const rows = await listRegistrations(adminSdk, req.query.status || 'pending_verification');
      return json(res, 200, { ok: true, rows });
    }

    if (req.method === 'GET' && action === 'get') {
      const id = String(req.query.id || '').trim().toUpperCase();
      const db = adminSdk.firestore();
      const snap = await db.collection('registrations').doc(id).get();
      if (!snap.exists) return json(res, 404, { ok: false, message: 'Registration not found.' });
      return json(res, 200, { ok: true, registration: serializable(snap.data()) });
    }

    const body = req.method === 'POST' ? await bodyOf(req) : {};
    if (req.method === 'POST' && action === 'approve') {
      const out = await approveRegistration(adminSdk, body.id || body.refId);
      return json(res, 200, { ok: true, ...out });
    }

    if (req.method === 'POST' && action === 'reject') {
      await rejectRegistration(adminSdk, body.id || body.refId, body.reason);
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && (action === 'checkin' || action === 'uncheckin')) {
      const out = await checkInTicket(adminSdk, body.code, action === 'uncheckin');
      return json(res, 200, out);
    }

    return json(res, 404, { ok: false, message: 'Unknown action.' });
  } catch (err) {
    return json(res, 400, { ok: false, message: err.message || 'Server error.' });
  }
};