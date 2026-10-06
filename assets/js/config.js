/* ============================================================
   UDUF Bootcamp — site configuration
   --------------------------------------------------------
   EDIT THIS FILE to set prices, Firebase project and channel links.
   See README.md for the full setup.
   ============================================================ */

window.UDUF = {
  /* --------------------------------------------------------
     FIREBASE (client SDK)
     --------------------------------------------------------
     Public web configuration — safe for the browser.

     PRIVILEGED setup (the service-account / admin SDK JSON) must
     NEVER be placed in frontend files. It is used only inside the
     serverless API (api/admin.js) via the FIREBASE_SERVICE_ACCOUNT
     environment variable. See README.md.
     -------------------------------------------------------- */
  firebase: {
    apiKey: 'AIzaSyAhN5gEdNvN-9cY5XwJodyfZ_zF11VQr2w',
    authDomain: 'original-concert.firebaseapp.com',
    projectId: 'original-concert',
    storageBucket: 'original-concert.firebasestorage.app',
    messagingSenderId: '1013926515363',
    appId: '1:1013926515363:web:06978260900aa60fd3e516',
  },

  /* --------------------------------------------------------
     LEGACY APPS-SCRIPT ENDPOINT
     --------------------------------------------------------
     Unused. The site now persists to Firebase Firestore.
     Left empty; kept only for the old Google-Sheet backend.
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
    email: 'udufafrica@gmail.com',
  },

  /* --------------------------------------------------------
     TICKETS (official pricing — there is NO free ticket)
     -------------------------------------------------------- */
  tickets: {
    individual: {
      id: 'individual',
      label: 'Individual Ticket',
      price: 15000,
      slots: 1,
      perPerson: '₦15,000',
      note: '1 participant',
    },
    group: {
      id: 'group',
      label: 'Group Ticket',
      price: 50000,
      slots: 5,
      perPerson: '₦10,000 per person',
      note: '5 participants',
    },
    currency: '₦',
    format(amount) {
      return '₦' + Number(amount || 0).toLocaleString('en-NG');
    },
  },

  /* --------------------------------------------------------
     PAYMENT
     -------------------------------------------------------- */
  payment: {
    /* Official Selar store. Both ticket options live here. */
    selarStore: 'https://selar.com/m/uduf-africa',

    /* Manual bank payment details — do not change. */
    bank: {
      accountName: 'Ultimate Destiny Uplifters Foundation',
      bank: 'Zenith Bank',
      accountNumber: '1016991454',
    },

    /* WhatsApp verification number (digits only, as used by wa.me).
       Leave '' until supplied, e.g. '2348012345678'. */
    whatsappVerifyNumber: '',

    /* Official WhatsApp group — only shown once payment is verified. */
    whatsappGroup:
      'https://chat.whatsapp.com/DKFvf9MXGKI9pOGrRZjdUc?s=cl&p=a&mlu=4&ilr=4&iam=2',
  },

  /* --------------------------------------------------------
     STORAGE
     -------------------------------------------------------- */
  storeKey: 'uduf.registrations.v2',
  refPrefix: 'UDUF-REG-',

  /* Legacy default ticket used by the shared renderer fallback. */
  ticketType: 'Individual Ticket',
};