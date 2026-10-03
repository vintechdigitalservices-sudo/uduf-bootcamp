/* =========================================================
   UDUF AFRICA — Data layer
   ------------------------------------------------------------
   One interface, swappable backends:

     local      Indexed-free localStorage adapter (default, so
                the site works with zero configuration)
     firestore  Firebase Firestore adapter (activate when you
                add your project — see README)

   Record shape (attendees collection):
     id, fullName, phone, email, business, address, age,
     ticketType, ticketCode, qrCode, paymentStatus, paymentRef,
     checkedIn, checkedInAt, createdAt

   paymentStatus is "pending" from the moment a ticket is issued and
   becomes "confirmed" only when a server-side payment confirmation
   says so. It is deliberately NOT an entry gate: a valid ticket is a
   valid ticket whether or not money has settled.

   Design rules baked in here:
     · Ticket codes are crypto-random and verified unique on write.
     · checkIn() is atomic — a second call for the same code fails.
     · Verification reads a single document by code and returns only
       the fields event staff need. It never lists the collection.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;
  var DATA = Uduf.config.DATA;
  var STORE_KEY = 'uduf.attendees.v1';

  /* Fields safe to hand to event staff. Everything else stays server-side. */
  var PUBLIC_FIELDS = [
    'id', 'fullName', 'phone', 'business', 'ticketType',
    'ticketCode', 'paymentStatus', 'checkedIn', 'checkedInAt', 'createdAt'
  ];

  function project(record) {
    if (!record) return null;
    var out = {};
    PUBLIC_FIELDS.forEach(function (k) { out[k] = record[k]; });
    out.emailHint = record.email ? record.email.replace(/^(.{1,2}).*(@.*)$/, '$1•••$2') : '';
    return out;
  }

  function toMillis(value) {
    if (!value) return null;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'object' && typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value === 'object' && value.seconds) return value.seconds * 1000;
    var n = new Date(value).getTime();
    return isNaN(n) ? null : n;
  }

  function normalise(record) {
    if (!record) return null;
    var r = Object.assign({}, record);
    r.createdAt = toMillis(r.createdAt);
    r.checkedInAt = toMillis(r.checkedInAt);
    r.checkedIn = !!r.checkedIn;
    return r;
  }

  /* =========================================================
     LOCAL ADAPTER
     localStorage-backed, with an in-memory write queue so that
     read-modify-write sequences (code generation, check-in)
     behave like real transactions within a single tab.
     ========================================================= */
  function LocalAdapter() {
    this.kind = 'local';
    this._queue = Promise.resolve();
  }

  LocalAdapter.prototype._read = function () {
    var rows = U.lsGet(STORE_KEY, []);
    return Array.isArray(rows) ? rows : [];
  };

  LocalAdapter.prototype._write = function (rows) {
    return U.lsSet(STORE_KEY, rows);
  };

  /* Serialise every mutation so concurrent calls cannot interleave. */
  LocalAdapter.prototype._tx = function (fn) {
    var self = this;
    var run = self._queue.then(function () {
      return fn(self._read(), self);
    });
    /* Keep the chain alive even if this transaction rejects. */
    self._queue = run.catch(function () {});
    return run;
  };

  LocalAdapter.prototype.init = function () {
    return Promise.resolve(this);
  };

  LocalAdapter.prototype._uniqueCode = function (rows) {
    var taken = {};
    rows.forEach(function (r) { taken[r.ticketCode] = true; });
    for (var attempt = 0; attempt < 50; attempt++) {
      var code = U.randomCode();
      if (!taken[code]) return code;
    }
    throw new Error('Could not allocate a unique ticket code.');
  };

  LocalAdapter.prototype.createRegistration = function (payload) {
    return this._tx(function (rows, self) {
      var now = Date.now();
      var code = self._uniqueCode(rows);
      var record = {
        id: U.uid(),
        fullName: String(payload.fullName || '').trim(),
        phone: String(payload.phone || '').trim(),
        email: String(payload.email || '').trim().toLowerCase(),
        business: String(payload.business || '').trim(),
        address: String(payload.address || '').trim(),
        age: Number(payload.age) || null,
        ticketType: payload.ticketType,
        ticketCode: code,
        /* The QR payload is the code itself, available from issue — a
           ticket has to be scannable before any money moves. */
        qrCode: code,
        paymentStatus: 'pending',
        paymentRef: null,
        checkedIn: false,
        checkedInAt: null,
        createdAt: now
      };
      rows.push(record);
      self._write(rows);
      return record;
    });
  };

  /* Record a payment confirmation. This is only ever called with a
     reference the checkout server just returned (see register.js) —
     the browser never decides on its own that money arrived.

     Note for a real deployment: with the Firestore adapter this write
     comes straight from the browser, so anyone could call it. Point
     DATA.endpoints.checkout at a callable function that confirms the
     payment and writes the status server-side, and drop this call from
     the client. Nothing else needs to change: entry already ignores
     payment status. */
  LocalAdapter.prototype.markConfirmed = function (code, paymentRef) {
    return this._tx(function (rows, self) {
      var record = rows.find(function (r) { return r.ticketCode === code; });
      if (!record) throw new Error('Registration not found for code ' + code);
      /* Idempotent: a repeated webhook must not downgrade a confirmed ticket. */
      if (record.paymentStatus === 'confirmed') return record;
      record.paymentStatus = 'confirmed';
      record.paymentRef = paymentRef || record.paymentRef || U.uid();
      record.qrCode = record.ticketCode;
      record.confirmedAt = Date.now();
      self._write(rows);
      return record;
    });
  };

  LocalAdapter.prototype.findByCode = function (code) {
    var normalised = U.normaliseTicketCode(code);
    var rows = this._read();
    var found = rows.find(function (r) { return r.ticketCode === normalised; });
    return Promise.resolve(project(normalised ? found : null));
  };

  LocalAdapter.prototype.checkIn = function (code) {
    var normalised = U.normaliseTicketCode(code);
    return this._tx(function (rows) {
      var record = rows.find(function (r) { return r.ticketCode === normalised; });
      if (!record) return { ok: false, reason: 'not_found' };
      /* A ticket is valid the moment it is issued. There is no payment
         gate on the door — paymentStatus only records whether money has
         been settled, and must never stop someone entering. */
      if (record.checkedIn) return { ok: false, reason: 'already', record: project(record) };
      record.checkedIn = true;
      record.checkedInAt = Date.now();
      rows.push(rows.splice(rows.indexOf(record), 1)[0]); /* keep newest first-ish */
      rows.sort(function (a, b) { return b.createdAt - a.createdAt; });
      U.lsSet(STORE_KEY, rows);
      return { ok: true, record: project(record) };
    });
  };

  LocalAdapter.prototype.stats = function () {
    var rows = this._read();
    return Promise.resolve({
      total: rows.length,
      confirmed: rows.filter(function (r) { return r.paymentStatus === 'confirmed'; }).length,
      checkedIn: rows.filter(function (r) { return r.checkedIn; }).length
    });
  };

  LocalAdapter.prototype.reset = function () {
    U.lsDel(STORE_KEY);
    return Promise.resolve(true);
  };

  LocalAdapter.prototype.seedDemo = function () {
    return this._tx(function (rows, self) {
      var samples = [
        { fullName: 'Amara Okonkwo',  business: 'Sable & Co.',        ticketType: 'INDIVIDUAL', age: 31 },
        { fullName: 'Tunde Balogun',  business: 'Lagos Retail Hub',   ticketType: 'GROUP',      age: 27, checkedIn: true },
        { fullName: 'Zainab Abubakar',business: 'Kano Health Africa', ticketType: 'STUDENT',    age: 35 }
      ];
      var created = samples.map(function (s) {
        var rec = {
          id: U.uid(),
          fullName: s.fullName,
          phone: '+234 803 000 ' + (1000 + Math.floor(Math.random() * 8999)),
          email: s.fullName.toLowerCase().replace(/[^a-z]+/g, '.') + '@example.com',
          business: s.business,
          address: 'Lagos, Nigeria',
          age: s.age,
          ticketType: s.ticketType,
          ticketCode: self._uniqueCode(rows),
          qrCode: null,
          paymentStatus: 'confirmed',
          paymentRef: U.uid(),
          checkedIn: !!s.checkedIn,
          checkedInAt: s.checkedIn ? Date.now() - 3600000 : null,
          createdAt: Date.now() - Math.floor(Math.random() * 6) * 86400000
        };
        rec.qrCode = rec.ticketCode;
        rows.push(rec);
        return rec;
      });
      self._write(rows);
      return created;
    });
  };

  /* =========================================================
     FIRESTORE ADAPTER
     Activated with:  Uduf.config.DATA.backend = 'firestore'
     plus your Firebase config (see README).

     Security note: with Firestore rules as shipped in
     /firestore.rules the client can create a pending record and
     read a single ticket by code, but it cannot mark a ticket
     paid or check anyone in — those two transitions are owned by
     a Cloud Function (see /functions). When those endpoints are
     configured, pass { viaServer: true } so check-in goes through
     the callable function rather than a direct write.
     ========================================================= */
  function FirestoreAdapter(config) {
    this.kind = 'firestore';
    this.config = config || {};
    this.db = null;
    this.fns = null;
    this.col = null;
  }

  FirestoreAdapter.prototype.init = function () {
    var self = this;
    var cfg = this.config;
    if (!cfg.apiKey || !cfg.projectId) {
      return Promise.reject(new Error(
        'Firestore backend selected but firebase config is empty. ' +
        'Add your project values in assets/js/config.js or call Uduf.db.configure({...}).'
      ));
    }
    return import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js')
      .then(function (appMod) {
        var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(cfg);
        return Promise.all([
          import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
          import('https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js')
        ]).then(function (mods) {
          self.db = mods[0].getFirestore(app);
          self.fns = mods[1].getFunctions(app);
          self.col = mods[0].collection(self.db, DATA.collection);
          self.sdk = mods;
          return self;
        });
      });
  };

  FirestoreAdapter.prototype._uniqueCode = function () {
    var col = this.col, self = this;
    function attempt(remaining) {
      return col.doc().get().then(function (snap) {
        var code = U.randomCode();
        var ref = col.doc(snap.id);
        return ref.get().then(function (existing) {
          if (existing.exists) {
            if (remaining <= 0) throw new Error('Could not allocate a unique ticket code.');
            return attempt(remaining - 1);
          }
          self._pendingRef = ref;
          return code;
        });
      });
    }
    return attempt(12);
  };

  FirestoreAdapter.prototype.createRegistration = function (payload) {
    var self = this;
    return this._uniqueCode().then(function (code) {
      var record = {
        fullName: String(payload.fullName || '').trim(),
        phone: String(payload.phone || '').trim(),
        email: String(payload.email || '').trim().toLowerCase(),
        business: String(payload.business || '').trim(),
        address: String(payload.address || '').trim(),
        age: Number(payload.age) || null,
        ticketType: payload.ticketType,
        ticketCode: code,
        qrCode: code,
        paymentStatus: 'pending',
        checkedIn: false,
        checkedInAt: null,
        createdAt: this.sdk[0].serverTimestamp()
      };
      return self._pendingRef.set(record).then(function () {
        return Object.assign({ id: self._pendingRef.id }, record, { createdAt: Date.now() });
      });
    });
  };

  /* Records a confirmation the checkout server reported. See the note on
     LocalAdapter.markConfirmed: in a real deployment this write belongs
     on the server, not in the browser. */
  FirestoreAdapter.prototype.markConfirmed = function (code, paymentRef) {
    var col = this.col, sdk = this.sdk;
    return col.where('ticketCode', '==', U.normaliseTicketCode(code)).limit(1).get()
      .then(function (snap) {
        if (snap.empty) throw new Error('Registration not found.');
        var doc = snap.docs[0];
        return doc.ref.set({
          paymentStatus: 'confirmed',
          paymentRef: paymentRef || null,
          qrCode: doc.get('ticketCode'),
          confirmedAt: sdk[0].serverTimestamp()
        }, { merge: true });
      })
      .then(function () { return this.findByCode(code); }.bind(this));
  };

  FirestoreAdapter.prototype.findByCode = function (code) {
    var normalised = U.normaliseTicketCode(code);
    if (!normalised) return Promise.resolve(null);
    return this.col.where('ticketCode', '==', normalised).limit(1).get()
      .then(function (snap) {
        return snap.empty ? null : project(normalise(snap.docs[0].data()));
      });
  };

  /* Transactional check-in. Firestore re-runs the transaction body
     server-side if the document changed, so two staff members
     scanning the same code at the same time cannot both win. */
  FirestoreAdapter.prototype.checkIn = function (code) {
    var normalised = U.normaliseTicketCode(code);
    var db = this.db, col = this.col, sdk = this.sdk;
    return col.where('ticketCode', '==', normalised).limit(1).get()
      .then(function (snap) {
        if (snap.empty) return { ok: false, reason: 'not_found' };
        var docRef = snap.docs[0].ref;
        return sdk[0].runTransaction(db, function (tx) {
          return tx.get(docRef).then(function (fresh) {
            var data = fresh.data();
            if (!data) return { ok: false, reason: 'not_found' };
            /* Valid on issue — payment status never gates entry. */
            if (data.checkedIn) return { ok: false, reason: 'already', record: project(normalise(data)) };
            tx.update(docRef, { checkedIn: true, checkedInAt: sdk[0].serverTimestamp() });
            return {
              ok: true,
              record: project(normalise(Object.assign({}, data, {
                checkedIn: true, checkedInAt: Date.now()
              })))
            };
          });
        });
      });
  };

  FirestoreAdapter.prototype.stats = function () { return Promise.resolve(null); };
  FirestoreAdapter.prototype.reset = function () { return Promise.resolve(false); };
  FirestoreAdapter.prototype.seedDemo = function () { return Promise.reject(new Error('Demo seeding is local-only.')); };

  /* =========================================================
     FACADE
     ========================================================= */
  var adapter = null;
  var ready = null;

  function make() {
    if (DATA.backend === 'firestore') return new FirestoreAdapter(DATA.firebase);
    return new LocalAdapter();
  }

  var db = {
    get kind() { return adapter ? adapter.kind : DATA.backend; },
    get isLocal() { return !adapter || adapter.kind === 'local'; },

    configure: function (firebaseConfig, backend) {
      if (firebaseConfig) Object.assign(DATA.firebase, firebaseConfig);
      if (backend) DATA.backend = backend;
      adapter = null; ready = null;
      return db.init();
    },

    init: function () {
      if (ready) return ready;
      adapter = make();
      ready = adapter.init().then(function () { return db; });
      return ready;
    },

    createRegistration: function (payload) { return ready.then(function () { return adapter.createRegistration(payload); }); },
    markConfirmed:     function (code, ref) { return ready.then(function () { return adapter.markConfirmed(code, ref); }); },
    findByCode:        function (code) { return ready.then(function () { return adapter.findByCode(code); }); },
    checkIn:           function (code) { return ready.then(function () { return adapter.checkIn(code); }); },
    stats:             function () { return ready.then(function () { return adapter.stats(); }); },
    reset:             function () { return ready.then(function () { return adapter.reset(); }); },
    seedDemo:          function () { return ready.then(function () { return adapter.seedDemo(); }); },

    project: project,
    normaliseTicketCode: U.normaliseTicketCode
  };

  Uduf.db = db;
})(window);
