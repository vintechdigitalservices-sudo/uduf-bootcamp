# UDUF Africa — 2027 Active Leadership & Entrepreneurship Bootcamp

Static site with a paid ticketing flow:

- **Home** (`index.html`) — hero, details, ticket prices
- **Register** (`register.html`) — ticket wizard: choose **Individual (₦15,000)** or **Group (₦50,000 / 5 participants)**, then pay via **Selar (online)** or **bank transfer (manual)**, submit details and a payment receipt
- **Verify** (`verify.html`) — check any ticket code or registration ID
- **Admin** (`admin.html`) — password-protected dashboard to approve/reject payments and check in tickets

```
index.html                Home
register.html             Ticket wizard (paid)
verify.html               Status / ticket lookup
admin.html                Admin dashboard (needs /api/admin)
404.html                  Not-found page

assets/css/main.css       Design system (+ wizard/admin styles)
assets/js/config.js       ← the only file you must edit
assets/js/firebase-store.js   Firestore store + offline demo fallback
assets/js/app.js          Shared runtime (header, footer, ticket renderer, money)
assets/js/qr.js           Self-contained QR encoder (no network, no service)
assets/js/pages/*.js      Per-page behaviour (register, verify, admin, home)

api/admin.js              Vercel serverless admin API (firebase-admin)
package.json              Server dependency (firebase-admin)
firestore.rules           Firestore security rules
backend/Code.gs           LEGACY Google Apps Script backend (unused, kept for reference)
public/                   Images, icons, manifest
```

## Ticket prices

- **Individual** — ₦15,000 (1 participant)
- **Group** — ₦50,000 (5 participants, ₦10,000 per person)

There is **no free ticket**. Every person's full name, phone, email and age are
required for each participant.

## Flow

1. Pick a ticket and a payment method.
2. **Online:** register → pay on Selar (`https://selar.com/m/uduf-africa`) →
   come back (or check your status) once the payment is confirmed.
   **Manual:** transfer to the bank shown on the page and upload a receipt.
3. Registration is saved as **pending** — the admin reviews the receipt/Selar
   payment and either approves (issuing one ticket per participant) or rejects.
4. On approval the attendee sees their ticket and QR, plus the **WhatsApp
   group** link.

Payment statuses: `pending_payment` (chose Selar, hasn't paid) →
`pending_verification` (receipt/Selar submitted, awaiting review) →
`verified` / `rejected`. Ticket status: `none` → `generated` → `checked_in`.

## Quick preview

The site is static, so any local server works:

```bash
python -m http.server 8000
# open http://localhost:8000
```

Without Firestore credentials the site runs in **offline demo mode**: data is
kept in the browser's localStorage and tickets are issued instantly (there is
no admin) so the whole flow stays testable.

## Production setup

### 1. Firebase (Free/Blaze, Firestore in `original-concert`)

1. In `assets/js/config.js`, the `firebase` object already contains the public
   web config for the project.
2. Load `firestore.rules` into **Firestore → Rules** (in
   Console → Firestore → Rules). These allow anyone to *create a pending*
   registration and read their own, block listing, and keep ticket writes
   server-only.
3. Optional: set Firestore **Indexes** for `registrations` combined queries if
   you add any in the admin API.

### 2. Admin API on Vercel

`api/admin.js` is the only place privileged admin credentials exist. In
**Vercel → Project → Settings → Environment Variables** set:

| Variable | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON string of the Firebase **Admin SDK** service-account key (Project Settings → Service accounts → Generate new private key) |
| `ADMIN_PASSWORD` | a strong password the admin dashboard uses |

Locally it falls back to reading the git-ignored
`*-firebase-adminsdk-*.json` file in the repo root (that file must never be
deployed or referenced by any browser code — `.gitignore` already excludes it).

Install the server dependency:

```bash
npm install   # installs firebase-admin
```

### 3. Deploy

```bash
npx vercel
npx vercel --prod
```

`vercel.json` serves the repo root as-is (`outputDirectory: "."`), enables
clean URLs, and rewrites `/register`, `/verify` and `/admin` to their `.html`
files. Keep the default root directory, or choose a null/buildless preset —
the `api/` folder is picked up automatically as a serverless function.

## At the door

Open `admin.html` (or `/admin`), sign in with `ADMIN_PASSWORD`, open the
**Check-in** tab and scan/type the QR payload. Both `UDUF-1234-5678` and the
raw scanned `UDUF2027/UDUF-1234-5678` work. `Undo` reverses a mistaken scan.

Attendees can re-open `verify.html` and enter their ticket code or their
`UDUF-REG-XXXXXXXX` registration ID to see/print their tickets.

## Backend references (legacy)

`backend/Code.gs` is the original Google Apps Script backend (free-ticket era,
Google Sheet storage). It is **no longer used** — registrations now live in
Firestore and tickets are issued by the admin API. The file is kept only for
reference.

## Design notes

Colours come from the UDUF logo: near-black `#0A0A0C` with amber `#F0871E`,
living in `:root` at the top of `main.css` (`--amber`, `--ink`, …).

- No gradients anywhere — flat surfaces and flat `rgba()` scrims.
- Type: **Barlow Condensed** (display) + **Inter** (body) via Google Fonts.
- `assets/js/qr.js` is a complete ISO/IEC 18004 QR encoder (all 4 EC levels,
  versions 1–10) that runs fully in the browser — codes are never sent to a
  third-party service. The QR payload is `UDUF2027/<CODE>`.
- Everything collapses to a static layout under `prefers-reduced-motion`.

### Page weight

- Hero uses `srcset` (640w / 1000w / 2000w) so phones fetch a 43 KB image.
- Header/footer logo is the small 240×84 asset, not the full-size one.
- Below-the-fold images are `loading="lazy"`, sized and aspect-ratio hinted.

## Before you launch

- [ ] `firestore.rules` deployed to Firestore
- [ ] `FIREBASE_SERVICE_ACCOUNT` and `ADMIN_PASSWORD` set in Vercel
- [ ] `npm install` run so `api/admin.js` has `firebase-admin`
- [ ] `payment.whatsappVerifyNumber` set in `assets/js/config.js` so the
      "verify via WhatsApp" button appears
- [ ] Prices/bank details confirmed in `assets/js/config.js`
- [ ] Approve a real test registration and confirm tickets + QR render
- [ ] Check-in scanned on the actual door device
- [ ] Site-wide grep for "free"/"complimentary" comes back empty