/* =========================================================
   UDUF Africa — Cloud Functions
   ------------------------------------------------------------
   These are the only components allowed to decide that a
   ticket is valid or that an attendee has been paid.

     createCheckout   browser -> server, returns a payment link
     paymentWebhook   PSP    -> server, marks the ticket paid
     verifyTicket     staff  -> server, atomic check-in

   Deploy:
     cd functions && npm install && firebase deploy --only functions

   Required environment:
     firebase functions:config:set  \
       uduf.secretkey="<PSP secret key>" \
       uduf.webhooksecret="<webhook signing secret>"

   Swap PSP_SECRET for your provider (Paystack / Flutterwave).
   The code below is written against a generic
   `PSP_SECRET` + HMAC-verified webhook so it is not tied to
   one vendor; adapt `initialiseCharge` to your provider's SDK.
   ========================================================= */

'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();

const db = admin.firestore();
const ATTENDEES = 'attendees';

const CODE_ALPHABET = '23456789ABCDEHJKMNPQRSTUVWXYZ'; /* no 0/O/1/I/L */
const TICKET_PRICES = {
  STANDARD: 25000,
  EXECUTIVE: 75000,
  TEAM: 60000,
  STUDENT: 10000
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const PHONE_RE = /^\+?[\d\s()-.]+$/;
const NAME_RE = /^[\p{L}][\p{L}\p{M}'.\- ]*$/u;

/* ---------- helpers ---------- */

function randomCode(length) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return `UDUF-${out}`;
}

/**
 * Reserve a ticket code that is not already taken.
 * Document IDs are the ticket codes, so "taken" is a simple
 * existence check — no scan of the collection required.
 */
async function reserveCode(attempts = 8) {
  for (let i = 0; i < attempts; i++) {
    const code = randomCode(6);
    const ref = db.collection(ATTENDEES).doc(code);
    /* eslint-disable no-await-in-loop */
    const snap = await ref.get();
    if (!snap.exists) return { code, ref };
  }
  throw new Error('Could not allocate a unique ticket code.');
}

function clean(value, max) {
  return String(value === undefined || value === null ? '' : value).trim().slice(0, max);
}

function validate(payload) {
  const errors = [];
  const fullName = clean(payload.fullName, 80);
  const phone = clean(payload.phone, 20);
  const email = clean(payload.email, 160).toLowerCase();
  const business = clean(payload.business, 120);
  const address = clean(payload.address, 200);
  const age = Number(payload.age);
  const ticketType = clean(payload.ticketType, 20);

  if (fullName.length < 2 || !NAME_RE.test(fullName)) errors.push('fullName');
  if (phone.replace(/\D/g, '').length < 7 || !PHONE_RE.test(phone)) errors.push('phone');
  if (!EMAIL_RE.test(email)) errors.push('email');
  if (business.length < 2) errors.push('business');
  if (address.length < 5) errors.push('address');
  if (!Number.isInteger(age) || age < 16 || age > 100) errors.push('age');
  if (!Object.prototype.hasOwnProperty.call(TICKET_PRICES, ticketType)) errors.push('ticketType');

  return {
    errors,
    data: { fullName, phone, email, business, address, age, ticketType }
  };
}

/** Minimal HMAC-SHA256 signature check for the PSP webhook. */
function verifySignature(rawBody, signature) {
  const secret = functions.config().uduf && functions.config().uduf.webhooksecret;
  if (!secret) return false;
  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(signature || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- 1. createCheckout ---------- */

exports.createCheckout = functions.https.onCall(async (data) => {
  const { errors, data: clean_ } = validate(data || {});
  if (errors.length) {
    throw new functions.https.HttpsError('invalid-argument', `Invalid fields: ${errors.join(', ')}`);
  }

  const amount = TICKET_PRICES[clean_.ticketType];
  const { code, ref } = await reserveCode();

  const record = {
    fullName: clean_.fullName,
    phone: clean_.phone,
    email: clean_.email,
    business: clean_.business,
    address: clean_.address,
    age: clean_.age,
    ticketType: clean_.ticketType,
    amount,
    currency: 'NGN',
    ticketCode: code,
    qrCode: null,
    paymentStatus: 'pending',
    paymentRef: null,
    checkedIn: false,
    checkedInAt: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    userAgent: clean(data.userAgent, 200)
  };

  await ref.set(record);

  /* Replace with your provider's "create transaction" call.
     It must return a URL the attendee is redirected to. */
  const paymentUrl = `https://checkout.example/uduf/${code}`;

  return { ticketCode: code, amount, currency: 'NGN', paymentUrl };
});

/* ---------- 2. paymentWebhook ---------- */

exports.paymentWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  if (!verifySignature(req.rawBody, req.get('x-signature'))) {
    return res.status(401).send('Bad signature');
  }

  const payload = req.body || {};
  const code = clean(payload.ticketCode, 32).toUpperCase();
  const status = clean(payload.status, 20).toLowerCase();
  const reference = clean(payload.reference, 120);

  if (!code || status !== 'success' || !reference) {
    return res.status(400).send('Incomplete payload');
  }

  const ref = db.collection(ATTENDEES).doc(code);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).send('Unknown ticket');

  /* Idempotent: a retried webhook must not downgrade a paid ticket. */
  if (snap.get('paymentStatus') !== 'paid') {
    await ref.update({
      paymentStatus: 'paid',
      paymentRef: reference,
      qrCode: code,
      paidAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  /* TODO: email the ticket to snap.get('email') here. */
  return res.status(200).json({ ok: true });
});

/* ---------- 3. verifyTicket (staff check-in) ---------- */

exports.verifyTicket = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Staff sign-in required.');
  }

  const code = clean(data && data.code, 32).toUpperCase();
  if (!/^UDUF-[A-Z0-9]{4,12}$/.test(code)) {
    throw new functions.https.HttpsError('invalid-argument', 'Malformed ticket code.');
  }

  const ref = db.collection(ATTENDEES).doc(code);

  /* Atomic: a second scan of the same code fails instead of
     double-recording the attendee. */
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { ok: false, reason: 'not_found' };

    const r = snap.data();
    if (r.paymentStatus !== 'paid') return { ok: false, reason: 'unpaid' };
    if (r.checkedIn) {
      return { ok: false, reason: 'already', checkedInAt: r.checkedInAt };
    }

    tx.update(ref, {
      checkedIn: true,
      checkedInAt: admin.firestore.FieldValue.serverTimestamp(),
      checkedInBy: context.auth.uid
    });

    /* Only what gate staff need. No email, no address, no age. */
    return {
      ok: true,
      record: {
        fullName: r.fullName,
        business: r.business,
        phone: r.phone,
        ticketType: r.ticketType,
        ticketCode: r.ticketCode,
        emailHint: r.email ? r.email.replace(/^(.{1,2}).*(@.*)$/, '$1•••$2') : ''
      }
    };
  });
});
