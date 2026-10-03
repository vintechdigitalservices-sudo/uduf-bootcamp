/* =========================================================
   UDUF AFRICA — Global configuration
   Single source of truth for event data, navigation, tickets
   and contact details. Edit here, not in the markup.

   Every page, section, ticket card and footer string is driven
   from this file. Adding a ticket tier or changing the price is
   a one-line edit.
   ========================================================= */
(function (global) {
  'use strict';

  var EVENT = {
    org: 'UDUF AFRICA',
    legalName: 'UDUF Africa',
    copyrightYear: 2027,

    name: '2027 Active Leadership & Entrepreneurship Bootcamp',
    nameUpper: '2027 ACTIVE LEADERSHIP & ENTREPRENEURSHIP BOOTCAMP',

    /* Typed one after another in the hero, ending on the last. */
    themeLines: ['YOUR IDEA.', 'YOUR BUSINESS.', 'YOUR LEGACY.'],

    tagline: 'Building Enterprises That Stand the Test of Time',
    footerTagline: 'Get Inspired. Take Action. Transform Africa.',

    dates: '12\u201313 FEBRUARY 2027',
    datesShort: '12\u201313 Feb 2027',
    datesMetric: '12\u201313 FEB 2027',
    iso: '2027-02-12T08:00:00+01:00',

    venue: 'DOLLY HILL CONFERENCE HALL',
    venueSentence: 'Dolly Hill Conference Hall',
    duration: '2 FULL DAYS',
    capacity: '100\u2013150 SEATS',

    ticketPrefix: 'UDUF',
    codeLength: 6,

    /* Support inbox shown in the footer and on both inner pages. */
    email: 'reliefafrica@gmail.com',
    phones: ['09136981616', '09021773508'],

    currency: '\u20a6',

    socials: [
      { label: 'Instagram', icon: 'instagram', href: 'https://instagram.com/udufafrica' },
      { label: 'LinkedIn',  icon: 'linkedin',  href: 'https://linkedin.com/company/udufafrica' },
      { label: 'X',         icon: 'x',         href: 'https://x.com/udufafrica' },
      { label: 'Facebook',  icon: 'facebook',  href: 'https://facebook.com/udufafrica' }
    ]
  };

  /* Three routes only: /  /register  /verify
     Hrefs are relative so the site also works from a subfolder
     and straight off the filesystem. */
  var NAV = [
    { label: 'Home',          href: './',              key: 'home' },
    { label: 'Register',      href: './register.html', key: 'register' },
    { label: 'Verify Ticket', href: './verify.html',   key: 'verify' }
  ];

  /* Imagery.
     logo.jpg is the raw supplied file — it has a light plate baked in,
     so it is never displayed. logo.png and the -200/-400/-600 variants
     are cut from it with the plate removed and real alpha, which is what
     lets the mark float cleanly on both the dark hero and the white
     header. See README for the sizes.

     hero.jpg is a tall 1250x2000 crop, so it is the MOBILE hero.
     hero-portrait.jpg is misnamed in the source folder: it is the
     1500x1100 LANDSCAPE crop and serves desktop, where a full-bleed
     16:9 frame would otherwise upscale the tall crop by ~1.5x. */
  var ASSETS = {
    logo:      'public/logo.png',
    logoLg:    'public/logo-600.png',
    logoMd:    'public/logo-400.png',
    logoSm:    'public/logo-200.png',
    logoTiny:  'public/logo-200.png',
    icon:      'public/icon-192.png',

    heroWide:   'public/hero-portrait.jpg',  /* 1500x1100 landscape */
    heroTall:   'public/hero.jpg',            /* 1250x2000 portrait  */
    heroTallMd: 'public/hero-1000.jpg',       /* 625x1000           */
    heroTallSm: 'public/hero-640.jpg',        /* 400x640            */

    programme: 'public/programme.jpg',
    sessionA:  'public/session-1.jpg',
    sessionB:  'public/session-2.jpg'
  };

  /* The three-stage journey. */
  var JOURNEY = [
    {
      n: '01',
      title: 'YOUR IDEA',
      lede: 'From thought to opportunity.',
      points: ['Problems', 'Customers', 'Solutions', 'Validation']
    },
    {
      n: '02',
      title: 'YOUR BUSINESS',
      lede: 'From opportunity to enterprise.',
      points: ['Finance', 'Systems', 'People', 'Execution']
    },
    {
      n: '03',
      title: 'YOUR LEGACY',
      lede: 'From enterprise to impact.',
      points: ['Sustainability', 'Succession', 'Leadership', 'Lasting value']
    }
  ];

  /* The two-day programme. Titles only — the hierarchy does the work. */
  var PROGRAMME = [
    {
      key: 'one',
      label: 'DAY 01',
      title: 'YOUR IDEA',
      arc: ['Thought', 'Opportunity', 'Business'],
      sessions: [
        'Idea to Opportunity',
        'Idea to Business',
        'The Leader Behind the Idea',
        'Idea Lab'
      ]
    },
    {
      key: 'two',
      label: 'DAY 02',
      title: 'YOUR BUSINESS + YOUR LEGACY',
      arc: ['Build', 'Scale', 'Sustain'],
      sessions: [
        'Building a Business That Works',
        'Money, Growth & Decisions',
        'Building Beyond Yourself',
        'Legacy Blueprint'
      ]
    }
  ];

  var EXPERIENCE = [
    'TEACH',
    'PANEL',
    'Q&A',
    'PRACTICAL EXERCISE',
    'REFLECTION',
    'ACTION PLAN'
  ];

  var ATTENDEES = [
    'ASPIRING ENTREPRENEURS',
    'BUSINESS OWNERS',
    'YOUNG PROFESSIONALS',
    'EMERGING LEADERS',
    'EMPLOYERS & EMPLOYEES',
    'INNOVATORS'
  ];

  /* Ticket catalogue. `id` is what gets persisted to Firestore.
     Add, rename or delete tiers here — the register page builds its
     selection cards and the price badge from this list, and the
     ticket renderer, verify desk and PDF all read the same data. */
  var TICKETS = [
    { id: 'INDIVIDUAL', name: 'Individual', note: 'Full two-day access',            price: 15000, featured: true },
    { id: 'GROUP',      name: 'Group (3)',  note: 'Three attendees, one business',  price: 40000 },
    { id: 'STUDENT',    name: 'Student',    note: 'Valid student ID required',      price: 10000 }
  ];

  /* Data layer wiring.
     `local` keeps the whole site working with zero configuration.
     Switch to `firestore` and paste your project config to go live. */
  var DATA = {
    backend: 'local',            /* 'local' | 'firestore' */
    collection: 'attendees',
    firebase: {
      apiKey: '', authDomain: '', projectId: '',
      storageBucket: '', messagingSenderId: '', appId: ''
    },
    endpoints: { checkout: '', verify: '' },
    /* Registration completes without a live gateway until checkout is set. */
    sandboxPayments: true
  };

  global.Uduf = global.Uduf || {};
  global.Uduf.config = {
    EVENT: EVENT, NAV: NAV, ASSETS: ASSETS,
    JOURNEY: JOURNEY, PROGRAMME: PROGRAMME, EXPERIENCE: EXPERIENCE,
    ATTENDEES: ATTENDEES,
    TICKETS: TICKETS, DATA: DATA
  };
})(window);