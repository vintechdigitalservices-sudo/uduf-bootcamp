# UDUF Africa — 2027 Active Leadership & Entrepreneurship Bootcamp

Static site with a paid ticketing flow:

- **Home** (`index.html`) — hero, details, ticket prices
- **Register** (`register.html`) — ticket wizard: choose **Individual (₦15,000)** or **Group (₦50,000 / 5 participants)**, then pay via **Selar (online)** or **bank transfer (manual)**, submit details and a payment receipt
- **Verify** (`verify.html`) — check any ticket code or registration ID
- **Admin** (`admin.html`) — Firebase-Auth-protected dashboard to approve/reject payments and check in tickets

```
index.html                Home
register.html             Ticket wizard (paid)
verify.html               Status / ticket lookup
admin.html                Admin dashboard (sign in with email + password)
404.html                  Not-found page

assets/css/main.css       Design system (+ wizard/admin styles)
assets/js/config.js       ← the only file you must edit
assets/js/firebase-store.js   Firestore store + auth + offline demo fallback
assets/js/app.js          Shared runtime (header, footer, ticket renderer, money)
assets/js/qr.js           Self-contained QR encoder (no network, no service)
assets/js/pages/*.js      Per-page behaviour (register, verify, admin, home)

firestore.rules           Firestore security rules (the security boundary)
backend/Code.gs           LEGACY Google Apps Script backend (unused, kept for reference)
public/                   Images, icons, manifest
```

There is **no serverless backend**. The admin dashboard signs in with Firebase
Auth (email/password) and talks to Firestore directly; `firestore.rules` is
what stops ordinary users from approving, rejecting, minting or checking in
tickets. Paying receipts go straight to the organisation's Cloudinary account;
only the returned URL is stored.

## Ticket prices

- **Individual** — ₦15,000 (1 participant)
- **Group** — ₦50,000 (5 participants, ₦10,000 per person)

There is **no free ticket**. Every person's full name, phone, email and age are
required for each participant.

## Flow

1. **Select ticket** → **payment method** → **registration details**.
2. **Online:** choosing "Pay Online" opens the Selar store
   (`https://selar.com/m/uduf-africa`) immediately; the user pays there, then
   comes back, submits the details form and lands on the pending screen.
   **Manual:** direct bank transfer to UDUF Africa, then upload the receipt
   (JPG/PNG/PDF ≤ 20 MB) on the payment step.
3. Registration is stored as **pending** (`paymentStatus: "awaiting_verification"`,
   `status: "pending"`). An admin reviews the payment and either approves
   (issuing one ticket per participant) or rejects.
4. On approval the attendee sees their ticket(s) + QR, plus the **WhatsApp
   group** link.

Statuses: `pending_payment` (chose Selar, hasn't paid) →
`awaiting_verification` (receipt/Selar submitted, awaiting review) →
`verified`/`status: approved` or `rejected`. Ticket status:
`none` → `generated` → `checked_in`.

## Who can access the admin dashboard

An admin is any Firebase Auth user whose UID has a record in
`admins/{uid}` in Firestore (checked by `firestore.rules`). To grant admin:

1. Enable **Authentication → Sign-in method → Email/Password** in the Firebase
   console.
2. Create the user (or use an existing one) and copy their UID.
3. In Firestore, create `admins/<UID>` with `{ email: "...", role: "admin" }`.
   (The Admin SDK bypasses rules, so provisioning can also be done with a
   one-off Node script using the service-account key.)
4. Sign in at `admin.html` with email + password.

The service-account key (`*-firebase-adminsdk-*.json`) is git-ignored and must
never be shipped to browser code or committed.

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

1. **Firebase** — `assets/js/config.js` already contains the public web
   config for the `original-concert` project.
2. **Enable Email/Password auth** — Firebase console → Authentication →
   Sign-in method → Email/Password → Enable.
3. **Deploy `firestore.rules`** — Console → Firestore → Rules. These rules:
   - let anyone create/read/limited-update a *pending* registration,
   - let nobody list registrations except admins,
   - let nobody self-approve, change prices, or write to `tickets/`,
   - allow only admins to list, approve, reject and issue tickets.
4. **Cloudinary** — payment receipts reuse the existing account
   (`dt5s5zbjy`, unsigned preset `UNDER45CEOs_registration_portal`). The preset
   must be **unsigned** for browser uploads. Images and PDFs are accepted.
5. **Provision the admin user** as described above.
6. Deploy the plain static files to any host (GitHub Pages, Netlify,
   Cloudflare Pages, a plain web server…) — nothing server-side is required.

> Note: unsigned Cloudinary uploads are typically capped below 20 MB by
> Cloudinary's own plan limits even though the form accepts 20 MB files.
> If a large file is rejected, Cloudinary's error message is shown to the user.

## At the door

Open `admin.html`, sign in, open the **Check-in** tab and scan/type the QR
payload. Both `UDUF-1234-5678` and the raw scanned `UDUF2027/UDUF-1234-5678`
work. `Undo` reverses a mistaken scan.

Attendees can re-open `verify.html` and enter their ticket code or their
`UDUF-REG-XXXXXXXX` registration ID to see/print their tickets.

## Backend references (legacy)

`backend/Code.gs` is the original Google Apps Script backend (free-ticket era,
Google Sheet storage). It is **no longer used** — registrations now live in
Firestore and tickets are issued by admins through Firestore rules. The file is
kept only for reference.

## Design notes

Colours come from the UDUF logo: near-black `#0A0A0C` with amber `#F0871E`,
living in `:root` at the top of `main.css` (`--amber`, `--ink`, …).

- No gradients anywhere — flat surfaces and flat `rgba()` scrims.
- Type: **Barlow Condensed** (display) + **Inter** (body) via Google Fonts.
- `assets/js/qr.js` is a complete ISO/IEC 18004 QR encoder (all 4 EC levels,
  versions 1–10) that runs fully in the browser — codes are never sent to a
  third-party service. The QR payload is `UDUF2027/<CODE>`.
- Everything collapses to a static layout under `prefers-reduced-motion`.

## Before you launch

- [ ] Email/Password auth enabled in Firebase console
- [ ] `firestore.rules` deployed to Firestore
- [ ] Admin user created and `admins/{uid}` present
- [ ] Cloudinary unsigned preset `UNDER45CEOs_registration_portal` confirmed
- [ ] `payment.whatsappVerifyNumber` set in `assets/js/config.js` so the
      "verify via WhatsApp" button appears
- [ ] Prices/bank/Cloudinary details confirmed in `assets/js/config.js`
- [ ] Approve a real test registration and confirm tickets + QR render
- [ ] Check-in scanned on the actual door device
- [ ] Site-wide grep for "free"/"complimentary" comes back empty