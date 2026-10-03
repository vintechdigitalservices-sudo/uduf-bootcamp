# UDUF Africa — 2027 Active Leadership & Entrepreneurship Bootcamp

A four-page event site: home, about, registration with ticket generation, and a
staff-facing ticket verification desk. Plain HTML, CSS and JavaScript — no build
step, no framework, no runtime dependencies.

```
index.html        Home: hero, snapshot, experience, why attend, CTA
about.html        About the bootcamp
register.html     3-step registration -> payment -> ticket (on-screen + PDF)
verify.html       Staff tool: look up a code, check an attendee in

assets/css/main.css                    Design system + every component
assets/js/config.js                    Event data, ticket prices, backends
assets/js/utils.js                     DOM, formatting, validation, codes
assets/js/app.js                       Bootstraps the shared components
assets/js/components/*.js              Header, footer, icons, motion, ticket, PDF
assets/js/data/store.js                Data layer (localStorage | Firestore)
assets/js/data/qrcode.js               QR encoder, written from the spec
assets/js/pages/*.js                   One module per page
functions/index.js                     Cloud Functions for the live backend
firestore.rules                        Deny-by-default rules
```

## Running it

Open `index.html` directly, or serve the folder:

```bash
python -m http.server 8080
```

Everything works from `file://` except the Firestore backend, which needs an
`http(s)` origin.

## Shared header and footer

The header and footer exist once, in `assets/js/components/header.js` and
`footer.js`. Each page declares only a mount point:

```html
<header class="site-header" data-variant="overlay" data-page="home" data-component="header"></header>
<footer class="site-footer" data-page="home" data-component="footer"></footer>
```

`data-variant` is the only per-page difference — `overlay` for pages that open on
a dark hero, `solid` for the light register and verify pages. The markup is
otherwise byte-identical across all four pages, with `aria-current="page"` moving
to whichever nav item is active.

Changing the nav or the ticket catalogue is a one-line edit in
`assets/js/config.js`; every page picks it up.

## How a registration works

1. **Details** — validated on blur and on continue. Validation rules live in
   `assets/js/utils.js` (`RULES` + `MESSAGES`) and are shared by the server in
   `functions/index.js`, so both sides agree on what is valid.
2. **Ticket** — one of four ticket types, plus the terms consent.
3. **Review → payment** — the record is written through `Uduf.db`, which
   allocates a unique code, then payment is taken and the ticket is marked paid.
4. **Ticket** — rendered on screen with a QR code, downloadable as an A5 PDF.

`?code=UDUF-XXXXXX` on `register.html` brings the ticket back after a refresh, so
the confirmation email can link straight to it.

## Ticket codes

`crypto.getRandomValues` over an alphabet with the ambiguous glyphs removed
(`0/O`, `1/I/L`), formatted `UDUF-XXXXXX`. Uniqueness is checked on every write
in both the local adapter and the Cloud Function.

## The QR code

`assets/js/data/qrcode.js` is a from-scratch QR encoder (byte mode, versions
1–10, error correction L/M/Q/H) written to ISO/IEC 18004. It was validated
against the `qrcode` npm package — identical module matrices apart from one mask
selection — and every generated code decodes with `jsQR`.

The encoded payload is the ticket code itself, so a gate scanner that reads the
QR still gets something a human can type in if the scanner fails.

## The PDF ticket

`assets/js/components/pdf.js` is a small PDF writer (also dependency-free) that
lays out an A5 ticket: dark header, attendee block, ticket code, QR, and
instructions for gate staff. It uses the standard PDF fonts, so there is nothing
to embed and the file stays around 8 KB.

Note `Uduf.pdf.toBytes()` is used when building the download `Blob`: pdf.js
returns a latin1 string, and a `Blob` built from a string directly would be
UTF-8 encoded and corrupt every byte above 127.

## Data layer

`Uduf.db` has two adapters behind one interface:

| `DATA.backend` | Behaviour |
| --- | --- |
| `local` (default) | localStorage. Works everywhere, needs no setup, **not secure** |
| `firestore` | Firebase, via the CDN SDK loaded on demand |

`local` exists so the whole experience is testable offline. It is not a security
boundary: anyone with devtools can edit it. Before go-live, switch to `firestore`
and deploy the rules and functions below.

## Going live

**1. Create a Firebase project**, then enable Firestore, Authentication and
Cloud Functions.

**2. Add your config** to `assets/js/config.js`:

```js
var DATA = {
  backend: 'firestore',
  firebase: { apiKey: '...', authDomain: '...', projectId: '...', /* ... */ }
};
```

**3. Deploy the backend:**

```bash
cd functions
npm install
firebase deploy --only firestore:rules,functions
```

`firestore.rules` denies all client reads and writes to `attendees`. The browser
never lists the collection; staff verification goes through the `verifyTicket`
callable function, which reads a single document and returns only the fields
needed at the door (name, business, phone, ticket type, masked email).

**4. Add a payment provider.** `DATA.endpoints.checkout` is empty, so payment
currently runs in sandbox mode: the ticket is marked paid locally and the whole
flow is testable. Set it to your function URL to go live, and replace
`initialiseCharge` in `functions/index.js` with your provider's SDK call. Marking
a ticket paid must only ever happen in the `paymentWebhook`, never in the
browser.

**5. Configure secrets:**

```bash
firebase functions:config:set \
  uduf.webhooksecret="<PSP signing secret>" \
  uduf.secretkey="<PSP secret key>"
```

## Content you may want to change

All of these are placeholders in `assets/js/config.js`:

- `EVENT.venue` — currently `Lagos, Nigeria`
- `EVENT.email` / `EVENT.phone` — currently `hello@udufafrica.org` / `+234 800 000 0000`
- `EVENT.socials` — placeholder profile URLs
- `TICKETS` — Standard ₦25,000, Executive ₦75,000, Team (3 seats) ₦60,000, Student ₦10,000
- The same prices are repeated in `TICKET_PRICES` in `functions/index.js`;
  change them in both places.

`EVENT.copyrightYear` drives the footer copyright, so the site keeps saying
© 2027 after 2027 rather than silently rolling over to the current year.

## Accessibility and motion

Skip link on every page, a focus trap and focus restore in the mobile drawer,
`aria-current` on the active nav item, `aria-live` on the verification result,
visible focus rings, and a full `prefers-reduced-motion` path that disables the
hero canvas, reveal animations and the page transition. Tickets print cleanly —
the header, footer and buttons are stripped in `@media print`.
