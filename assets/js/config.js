/* =========================================================
   UDUF AFRICA — Global configuration
   Single source of truth for event data, navigation, tickets
   and contact details. Edit here, not in the markup.
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
    iso: '2027-02-12T08:00:00+01:00',

    venue: 'Dolly Hill Conference Hall',
    venueLine: 'Dolly Hill Conference Hall',
    duration: '2 DAYS',
    capacity: '100\u2013150 PARTICIPANTS',

    ticketPrefix: 'UDUF',
    codeLength: 6,

    /* All three are rendered as real clickable links. */
    email: 'udufafrica@gmail.com',
    phones: ['09136981616', '09021773508'],

    currency: '\u20a6',

    socials: [
      { label: 'Instagram', icon: 'instagram', href: 'https://instagram.com/udufafrica' },
      { label: 'LinkedIn',  icon: 'linkedin',  href: 'https://linkedin.com/company/udufafrica' },
      { label: 'X',         icon: 'x',         href: 'https://x.com/udufafrica' },
      { label: 'Facebook',  icon: 'facebook',  href: 'https://facebook.com/udufafrica' }
    ]
  };

  /* Three primary pages. Nothing else. */
  var NAV = [
    { label: 'Home',          href: 'index.html',    key: 'home' },
    { label: 'Register',      href: 'register.html', key: 'register' },
    { label: 'Verify Ticket', href: 'verify.html',   key: 'verify' }
  ];

  /* Imagery. Swap these paths if you swap the files. */
  var ASSETS = {
    logo: 'public/logo.jpg',
    logoSmall: 'public/logo-256.jpg',
    logoTiny: 'public/logo-128.jpg',
    hero: 'public/hero.jpg',
    heroMd: 'public/hero-1000.jpg',
    heroSm: 'public/hero-640.jpg',
    heroPortrait: 'public/hero-portrait.jpg',
    programme: 'public/programme.jpg',
    sessionA: 'public/session-1.jpg',
    sessionB: 'public/session-2.jpg'
  };

  /* The three-stage journey — drives the home page. */
  var JOURNEY = [
    {
      n: '01',
      title: 'YOUR IDEA',
      lede: 'From thought to opportunity.',
      points: ['Problems.', 'Customers.', 'Solutions.', 'Validation.']
    },
    {
      n: '02',
      title: 'YOUR BUSINESS',
      lede: 'From opportunity to enterprise.',
      points: ['Finance.', 'Systems.', 'People.', 'Execution.']
    },
    {
      n: '03',
      title: 'YOUR LEGACY',
      lede: 'From enterprise to impact.',
      points: ['Sustainability.', 'Succession.', 'Leadership.', 'Lasting value.']
    }
  ];

  /* The two-day programme. Titles only — the hierarchy does the work. */
  var PROGRAMME = [
    {
      key: 'one',
      label: 'DAY ONE',
      title: 'YOUR IDEA',
      arc: ['From Thought', 'Opportunity', 'Business'],
      sessions: [
        'Idea to Opportunity',
        'Idea to Business',
        'The Leader Behind the Idea',
        'Idea Lab'
      ]
    },
    {
      key: 'two',
      label: 'DAY TWO',
      title: 'YOUR BUSINESS + YOUR LEGACY',
      arc: ['Build', 'Scale', 'Sustain'],
      sessions: [
        'Building a Business That Works',
        'Money, Growth & Decisions',
        'Building Beyond Yourself',
        'From Business to Legacy',
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

  var TICKER = [
    '12\u201313 FEBRUARY 2027',
    'DOLLY HILL CONFERENCE HALL',
    '2 DAYS',
    '100\u2013150 PARTICIPANTS',
    'YOUR IDEA. YOUR BUSINESS. YOUR LEGACY.'
  ];

  /* Ticket catalogue. `id` is what gets persisted. */
  var TICKETS = [
    { id: 'STANDARD', name: 'Standard',  note: 'Full two-day access',            price: 25000 },
    { id: 'EXECUTIVE', name: 'Executive', note: 'Front-row seating + lounge',     price: 75000, featured: true },
    { id: 'TEAM',      name: 'Team (3)',  note: 'Three attendees, one business',  price: 60000 },
    { id: 'STUDENT',   name: 'Student',   note: 'Valid student ID required',      price: 10000 }
  ];

  /* Data layer wiring.
     Swap `backend` to 'firestore' once Firebase is configured. */
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
    ATTENDEES: ATTENDEES, TICKER: TICKER,
    TICKETS: TICKETS, DATA: DATA
  };
})(window);
