# UDUF Africa — 2027 Active Leadership & Entrepreneurship Bootcamp

Three-page static site: home, registration and ticket verification.

**Registration is free.** Submitting the form issues a confirmed ticket and a
scannable QR code immediately — there is no payment step.

```
index.html        Home (typing hero)
register.html     Registration — ticket + QR issued on submit
verify.html       Ticket verification — shows the ticket again with its QR

assets/css/main.css      Design system
assets/js/config.js      ← the only file you must edit
assets/js/app.js         Shared runtime (header, footer, QR + ticket renderer)
assets/js/qr.js          Self-contained QR encoder (no network, no service)
assets/js/pages/*.js     Per-page behaviour
backend/Code.gs          Google Apps Script backend (registrations + tickets)
public/                  Images, icons, manifest
```

## Quick preview

The site is static, so any local server works:

```bash
python -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly with `file://` also previews fine, but the
backend requires `http(s)`.

---

## 1. Point the site at your backend

Registrations have somewhere to go only after you create the backend. Until
then the site runs in **offline demo mode**: tickets are stored in the browser
and nothing is sent anywhere.

### Create the Google Sheet

Create a Google Sheet. Row 1 must be:

```
Code | Full Name | Phone | Email | Age | Business / Organization | Address |
Ticket Type | Amount | Status | Registered At | Confirmed At | Checked In At
```

`Amount` is unused now that registration is free — leave it blank.

### Create the Apps Script

1. [script.google.com](https://script.google.com) → **New project**
2. Delete the placeholder code, paste in `backend/Code.gs`
3. Set `SHEET_ID` near the top to the ID from your sheet URL
   (`https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`)
4. Save, then pick `setup` from the function dropdown and click **Run**.
   Approve the permission prompt.
5. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the `.../exec` URL

### Connect it

In `assets/js/config.js`:

```js
endpoint: 'https://script.google.com/macros/s/AKfy.../exec',
```

That is the only required change.

---

## 2. How tickets work

A row is written with `Status = confirmed` the moment the form is submitted,
and the code comes straight back to the page. There is nothing to approve.

| Status | Meaning | Verify result |
|---|---|---|
| `confirmed` | Ticket issued | **Valid** |
| `checked_in` | Already used for entry | Already used |
| anything else | Not a ticket | Invalid |

### At the door

Scan the QR at `verify.html`, or type/paste the code. Both
`UDUF-1234-5678` and the raw scanned string `UDUF2027/UDUF-1234-5678` work —
the page normalises whatever it is given.

Run `checkIn('UDUF-1234-5678')` from the Apps Script editor after a ticket has
been used. `undoCheckIn()` reverses a mistake. `listCodes()` dumps every code.

---

## Ticket codes and the QR

Codes are `UDUF-XXXX-XXXX`, generated server-side and checked for uniqueness.

The QR payload is `UDUF2027/<CODE>` — for example `UDUF2027/UDUF-1234-5678`.
That is deliberately alphanumeric-only (A–Z, 0–9, `-`, `/`), which keeps the
symbol in its most compact QR mode so it scans quickly on an old phone.

`assets/js/qr.js` is a complete QR encoder (ISO/IEC 18004: Reed–Solomon
correction, block interleaving, all eight data masks with penalty scoring, BCH
format and version info, versions 1–10, EC levels L/M/Q/H). It runs entirely in
the browser — ticket codes are never sent to a third-party QR service. Output
was verified module-for-module against the `qrcode` reference implementation
across all four EC levels.

---

## Optional: Firestore instead of Google Sheets

Keep `register.js` and `verify.js` as they are and replace the `Util.post`
calls in `assets/js/app.js` with your own functions. The response contract
they expect is:

```js
// register
{ ok: true, code: 'UDUF-1234-5678', status: 'confirmed' }

// verify
{ ok: true, status: 'valid' | 'checked_in' | 'not_found', ticket: {
    code, fullName, ticketType
} }
```

---

## Design notes

Colours come from the UDUF logo: near-black `#0A0A0C` with amber `#F0871E`.
They live in `:root` at the top of `main.css` — change `--amber` and `--ink`
to re-skin the whole site.

**There are no gradients anywhere.** Every surface, button, scrim and overlay
is a flat colour; image legibility comes from a single flat `rgba()` scrim
rather than a gradient fade.

Type is **Barlow Condensed** for display and **Inter** for body, loaded from
Google Fonts with system fallbacks.

The hero types three lines in sequence and only then reveals the countdown and
buttons. Every animation collapses to a static layout under
`prefers-reduced-motion: reduce`.

### Page weight

Kept deliberately lean — about **140 KB** for a first visit on mobile:

- Hero uses `srcset` (640w / 1000w / 2000w), so phones fetch a 43 KB image
  instead of the 237 KB original.
- Header/footer logo is a 240×84 / 20 KB asset, not the 997×348 / 143 KB one.
- Below-the-fold images are `loading="lazy"`, sized and aspect-ratio hinted.
- `assets/js/qr.js` is loaded only on `register.html` and `verify.html`.

---

## Before you launch

- [ ] `SHEET_ID` set in `backend/Code.gs` and `setup()` run once
- [ ] Web app deployed with access set to **Anyone**
- [ ] `endpoint` pasted into `assets/js/config.js`
- [ ] `reliefafrica@gmail.com` correct in `config.js`
- [ ] Ticket codes and QR codes tested on the actual door device
