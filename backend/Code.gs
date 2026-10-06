/**
 * ============================================================
 * UDUF Africa — Bootcamp Registration Backend
 * Google Apps Script (Google Sheet as the database)
 * ============================================================
 *
 * SETUP
 * -----
 * 1. Create a Google Sheet. In the first row put these headers:
 *
 *      Code | Full Name | Phone | Email | Age | Business | Address |
 *      Ticket Type | Amount | Status | Registered At | Confirmed At | Checked In At
 *
 * 2. script.google.com -> New project. Delete the placeholder code.
 * 3. Paste this file into Code.gs.
 * 4. Set SHEET_ID below to the ID from the sheet URL
 *    https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit
 * 5. Save. Click "Run" once on setup() and grant permission
 *    (it will ask you to authorise access to the sheet).
 * 6. Deploy -> New deployment -> type "Web app"
 *      Execute as:          Me
 *      Who has access:      Anyone
 *    Copy the .../exec URL into assets/js/config.js -> endpoint
 *
 * STATUS FLOW
 * -----------
 *   confirmed   -> ticket issued on registration   (verifies as valid)
 *   checked_in  -> already used for entry          (verifies as used)
 *
 * Admin helpers run from the editor: checkIn(code), undoCheckIn(code),
 * listCodes()
 * ============================================================ */

/* ---------- CONFIG ---------- */

/** The ID between /d/ and /edit in your Google Sheet URL. */
var SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';

/** Sheet tab name. */
var SHEET_NAME = 'Registrations';

var CODE_PREFIX = 'UDUF';
var EVENT_NAME = '2027 Active Leadership & Entrepreneurship Bootcamp';

/* ---------- Column layout ---------- */
var COL = {
  CODE: 0,
  NAME: 1,
  PHONE: 2,
  EMAIL: 3,
  AGE: 4,
  BUSINESS: 5,
  ADDRESS: 6,
  TICKET: 7,
  AMOUNT: 8,
  STATUS: 9,
  REGISTERED_AT: 10,
  CONFIRMED_AT: 11,
  CHECKED_IN_AT: 12,
};

var HEADERS = [
  'Code',
  'Full Name',
  'Phone',
  'Email',
  'Age',
  'Business / Organization',
  'Address',
  'Ticket Type',
  'Amount',
  'Status',
  'Registered At',
  'Confirmed At',
  'Checked In At',
];

/* ============================================================
   ENTRY POINTS
   ============================================================ */

/** GET /exec -> health check. Also confirms the sheet is reachable. */
function doGet() {
  return json({ ok: true, service: 'UDUF Bootcamp backend', ready: !!getSheet_() });
}

/** POST /exec -> { action: 'register' | 'verify' } */
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = body.action;

    if (action === 'register') return json(register_(body));
    if (action === 'verify') return json(verify_(body.code));

    return json({ ok: false, message: 'Unknown action.' });
  } catch (err) {
    return json({ ok: false, message: 'Server error: ' + err.message });
  }
}

/* ============================================================
   ACTIONS
   ============================================================ */

function register_(data) {
  var sheet = getSheet_();
  if (!sheet) return { ok: false, message: 'Registration is not available right now.' };

  var name = clean(data.fullName);
  var phone = clean(data.phone);
  var email = clean(data.email);
  var address = clean(data.address);
  var business = clean(data.business);
  var age = Number(data.age);
  var ticketType = clean(data.ticketType) || 'Individual Ticket';

  /* Never trust the client */
  if (!name || !phone || !email || !address || !age) {
    return { ok: false, message: 'Please complete all required fields.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, message: 'Enter a valid email address.' };
  }
  if (age < 16 || age > 100) {
    return { ok: false, message: 'Attendees must be between 16 and 100.' };
  }

  var code = generateCode_(sheet);

  sheet.appendRow([
    code,
    name,
    phone,
    email,
    age,
    business,
    address,
    ticketType,
    '',
    'confirmed',
    new Date().toISOString(),
    '',
    '',
  ]);

  /* Registration is free: the ticket is confirmed the moment the row
     is written, so the code can be handed straight back. */
  return {
    ok: true,
    code: code,
    status: 'confirmed',
    message: 'Ticket issued.',
  };
}

function verify_(rawCode) {
  var sheet = getSheet_();
  if (!sheet) return { ok: false, message: 'Verification is not available right now.' };

  var code = clean(rawCode).toUpperCase();
  if (!code) return { ok: true, status: 'not_found' };

  var row = findRow_(sheet, code);
  if (row === -1) return { ok: true, status: 'not_found' };

  var status = String(sheet.getRange(row + 1, COL.STATUS + 1).getValue() || '').trim();
  var values = sheet.getRange(row + 1, 1, 1, HEADERS.length).getValues()[0];

  var ticket = {
    code: values[COL.CODE],
    fullName: values[COL.NAME],
    phone: values[COL.PHONE],
    email: values[COL.EMAIL],
    ticketType: values[COL.TICKET],
    checkInAt: formatStamp_(values[COL.CHECKED_IN_AT]),
  };

  if (status === 'confirmed') return { ok: true, status: 'valid', ticket: ticket };
  if (status === 'checked_in') return { ok: true, status: 'checked_in', ticket: ticket };

  /* Blank or anything unrecognised is not a valid ticket */
  return { ok: true, status: 'not_found' };
}

/* ============================================================
   ADMIN HELPERS — run these from the Apps Script editor
   ============================================================ */

/**
 * Mark one ticket as used for entry.
 * checkIn('UDUF-1234-5678')
 */
function checkIn(code) {
  var sheet = getSheet_();
  if (!sheet) throw new Error('Sheet not available.');

  var row = findRow_(sheet, clean(code).toUpperCase());
  if (row === -1) return 'No ticket found for ' + code + '.';

  sheet.getRange(row + 1, COL.STATUS + 1).setValue('checked_in');
  sheet.getRange(row + 1, COL.CHECKED_IN_AT + 1).setValue(new Date().toISOString());
  return 'Checked in ' + code + '.';
}

/**
 * Undo a check-in if the front desk made a mistake.
 * undoCheckIn('UDUF-1234-5678')
 */
function undoCheckIn(code) {
  var sheet = getSheet_();
  if (!sheet) throw new Error('Sheet not available.');

  var row = findRow_(sheet, clean(code).toUpperCase());
  if (row === -1) return 'No ticket found for ' + code + '.';

  sheet.getRange(row + 1, COL.STATUS + 1).setValue('confirmed');
  sheet.getRange(row + 1, COL.CHECKED_IN_AT + 1).setValue('');
  return 'Reversed check-in for ' + code + '.';
}

/** Creates the header row if the sheet is empty. Run once. */
function setup() {
  var sheet = getSheet_();
  if (!sheet) throw new Error('Sheet not found. Check SHEET_ID.');

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  return 'Sheet ready: "' + SHEET_NAME + '" (' + sheet.getLastRow() + ' rows).';
}

/** Full registration list, for emailing or printing. */
function listRegistrations() {
  var sheet = getSheet_();
  if (!sheet) throw new Error('Sheet not available.');
  var last = sheet.getLastRow();
  if (last < 2) return [];

  var out = [];
  var data = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  for (var i = 0; i < data.length; i++) {
    out.push({
      code: data[i][COL.CODE],
      name: data[i][COL.NAME],
      phone: data[i][COL.PHONE],
      email: data[i][COL.EMAIL],
      ticketType: data[i][COL.TICKET],
      amount: data[i][COL.AMOUNT],
      status: data[i][COL.STATUS],
    });
  }
  return out;
}

/** Every ticket code as a single comma-separated string. */
function listCodes() {
  var sheet = getSheet_();
  if (!sheet) throw new Error('Sheet not available.');
  var last = sheet.getLastRow();
  if (last < 2) return 'No registrations yet.';

  var codes = sheet.getRange(2, COL.CODE + 1, last - 1, 1).getValues();
  return codes
    .map(function (r) { return String(r[0] || '').trim(); })
    .filter(Boolean)
    .join(', ');
}

/* ============================================================
   HELPERS
   ============================================================ */

function getSheet_() {
  if (!SHEET_ID || SHEET_ID === 'PASTE_YOUR_SHEET_ID_HERE') return null;
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  } catch (err) {
    return null;
  }
}

function findRow_(sheet, code) {
  if (!code) return -1;
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var codes = sheet.getRange(2, COL.CODE + 1, last - 1, 1).getValues();
  for (var i = 0; i < codes.length; i++) {
    if (String(codes[i][0] || '').trim().toUpperCase() === code) return i + 2;
  }
  return -1;
}

/** UDUF-XXXX-XXXX, checked against existing codes so it is always unique. */
function generateCode_(sheet) {
  for (var attempt = 0; attempt < 40; attempt++) {
    var candidate = CODE_PREFIX + '-' + rand4_() + '-' + rand4_();
    if (findRow_(sheet, candidate) === -1) return candidate;
  }
  return CODE_PREFIX + '-' + new Date().getTime();
}

function rand4_() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function clean(v) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
}

function formatStamp_(v) {
  if (!v) return '';
  var d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}