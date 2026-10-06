/* ============================================================
   UDUF Bootcamp — site configuration
   --------------------------------------------------------
   EDIT THIS FILE to connect the site to your backend.
   See README.md for a step-by-step setup.
   ============================================================ */

window.UDUF = {
  /* --------------------------------------------------------
     BACKEND ENDPOINT
     --------------------------------------------------------
     Where registrations are POSTed and tickets are verified.

     This is a Google Apps Script web-app URL. To create one:
       1. script.google.com -> New project
       2. Paste backend/Code.gs from this repo into Code.gs
       3. Deploy -> New deployment -> Web app
          - Execute as: Me
          - Who has access: Anyone
       4. Copy the /exec URL and paste it below.

     Leave as '' to run in offline demo mode: registrations are
     stored only in the browser and never reach a server.
     -------------------------------------------------------- */
  endpoint: '',

  /* --------------------------------------------------------
     EVENT
     -------------------------------------------------------- */
  event: {
    name: '2027 Active Leadership & Entrepreneurship Bootcamp',
    org: 'UDUF Africa',
    tagline: 'Your Idea. Your Business. Your Legacy.',
    start: '2027-02-12T09:00:00+01:00',
    end: '2027-02-13T17:00:00+01:00',
    dateLabel: '12–13 February 2027',
    venue: 'Dolly Hill Conference Hall',
    email: 'reliefafrica@gmail.com',
  },

  /* --------------------------------------------------------
     TICKETS
     --------------------------------------------------------
     Registration is free — a confirmed ticket is issued the moment
     the form is submitted, together with a scannable QR code.
     -------------------------------------------------------- */
  ticketType: 'Individual Ticket',

  /* --------------------------------------------------------
     STORAGE
     --------------------------------------------------------
     localStorage key for offline demo-mode registrations.
     -------------------------------------------------------- */
  storeKey: 'uduf.registrations.v1',
};