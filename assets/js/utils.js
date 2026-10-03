/* =========================================================
   UDUF AFRICA — Shared utilities
   DOM helpers · formatting · validation · storage
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};

  /* ---------- DOM ---------- */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
      });
    }
    (Array.isArray(children) ? children : children ? [children] : []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function on(node, type, handler, opts) {
    if (!node) return;
    node.addEventListener(type, handler, opts);
  }

  /** Delegated event binding. */
  function onType(type, selector, handler) {
    document.addEventListener(type, function (e) {
      var t = e.target.closest(selector);
      if (t) handler.call(t, e, t);
    });
  }

  function setHTML(target, html) {
    var node = typeof target === 'string' ? qs(target) : target;
    if (node) node.innerHTML = html;
    return node;
  }

  /* ---------- Formatting ---------- */
  function money(amount, currency) {
    var cur = currency || (Uduf.config && Uduf.config.EVENT.currency) || '\u20a6';
    return cur + Number(amount || 0).toLocaleString('en-NG');
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function formatDateTime(value) {
    if (!value) return '\u2014';
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '\u2014';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    }) + ' \u00b7 ' + d.toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
  }

  function formatTime(value) {
    if (!value) return '\u2014';
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '\u2014';
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  function formatDate(value) {
    if (!value) return '\u2014';
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '\u2014';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function initials(name) {
    return String(name || '')
      .trim().split(/\s+/).slice(0, 2)
      .map(function (p) { return p.charAt(0); })
      .join('').toUpperCase() || 'U';
  }

  /* ---------- Validation ---------- */
  var RULES = {
    required: function (v) { return String(v || '').trim().length > 0; },

    name: function (v) {
      var s = String(v || '').trim();
      if (s.length < 2) return false;
      if (s.length > 80) return false;
      return /^[\p{L}][\p{L}\p{M}'.\- ]*$/u.test(s);
    },

    email: function (v) {
      var s = String(v || '').trim();
      return s.length <= 160 && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(s);
    },

    /* Nigerian-first, but tolerant of international formats. */
    phone: function (v) {
      var digits = String(v || '').replace(/[^\d]/g, '');
      if (digits.length < 7 || digits.length > 15) return false;
      if (!/^\+?[\d\s()\-.]+$/.test(String(v).trim())) return false;
      return true;
    },

    address: function (v) {
      var s = String(v || '').trim();
      return s.length >= 5 && s.length <= 200;
    },

    organisation: function (v) {
      var s = String(v || '').trim();
      return s.length >= 2 && s.length <= 120;
    },

    age: function (v) {
      var n = Number(String(v).trim());
      if (!Number.isInteger(n)) return false;
      return n >= 16 && n <= 100;
    },

    ticketCode: function (v) {
      return /^UDUF-[A-Z0-9]{4,12}$/i.test(String(v || '').trim());
    }
  };

  /* Form field names map onto these rules. */
  RULES.fullName = RULES.name;
  RULES.business = RULES.organisation;
  RULES.ticketType = function (v) {
    var list = (Uduf.config && Uduf.config.TICKETS) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === v) return true;
    return false;
  };

  var MESSAGES = {
    fullName:    { required: 'Enter your full name.', invalid: 'Use letters, spaces, hyphens or apostrophes only.' },
    phone:       { required: 'Enter your phone number.', invalid: 'Enter a valid phone number (7\u201315 digits).' },
    email:       { required: 'Enter your email address.', invalid: 'Enter a valid email address.' },
    business:    { required: 'Enter your business or organisation.', invalid: 'Use 2\u2013120 characters.' },
    address:     { required: 'Enter your address.', invalid: 'Use 5\u2013200 characters.' },
    age:         { required: 'Enter your age.', invalid: 'Age must be between 16 and 100.' },
    ticketType:  { required: 'Select a ticket type.', invalid: 'Select a ticket type.' }
  };

  function validateField(name, value) {
    var rule = RULES[name];
    /* Always return the same shape, even for fields with no rule. */
    if (!rule) return { ok: true };
    if (RULES.required(value) === false && MESSAGES[name] && !String(value || '').trim()) {
      return { ok: false, message: MESSAGES[name].required };
    }
    var ok = rule(value);
    if (ok) return { ok: true };
    var msg = (MESSAGES[name] && MESSAGES[name].invalid) || 'Check this value.';
    return { ok: false, message: msg };
  }

  function normaliseTicketCode(v) {
    var s = String(v || '').trim().toUpperCase().replace(/\s+/g, '');
    s = s.replace(/[^A-Z0-9-]/g, '');
    if (s && s.indexOf('-') === -1) s = 'UDUF-' + s;
    return s;
  }

  /* ---------- Crypto-random ---------- */
  /* Ambiguous glyphs (0/O, 1/I/L) removed so codes read cleanly over the
     phone line and survive being written down by hand. */
  var CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

  function randomCode(length) {
    var len = length || (Uduf.config && Uduf.config.EVENT.codeLength) || 6;
    var out = '';
    var buf = new Uint32Array(len);
    if (global.crypto && global.crypto.getRandomValues) {
      global.crypto.getRandomValues(buf);
      for (var i = 0; i < len; i++) out += CODE_ALPHABET.charAt(buf[i] % CODE_ALPHABET.length);
    } else {
      for (var j = 0; j < len; j++) {
        out += CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length));
      }
    }
    return (Uduf.config.EVENT.ticketPrefix) + '-' + out;
  }

  function uid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + randomCode(10).replace(/[^A-Z0-9]/g, '');
  }

  /* ---------- Storage (safe wrappers) ---------- */
  function lsGet(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function lsSet(key, value) {
    try { global.localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  function lsDel(key) {
    try { global.localStorage.removeItem(key); return true; } catch (e) { return false; }
  }

  /* ---------- Misc ---------- */
  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait || 150);
    };
  }

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function prefersReducedMotion() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* Escape untrusted text before injecting into markup. */
  function esc(str) {
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  Uduf.util = {
    el: el, qs: qs, qsa: qsa, on: on, onType: onType, setHTML: setHTML,
    money: money, pad2: pad2, formatDateTime: formatDateTime, formatTime: formatTime,
    formatDate: formatDate, initials: initials,
    RULES: RULES, MESSAGES: MESSAGES, validateField: validateField,
    normaliseTicketCode: normaliseTicketCode,
    randomCode: randomCode, uid: uid,
    lsGet: lsGet, lsSet: lsSet, lsDel: lsDel,
    debounce: debounce, clamp: clamp, sleep: sleep, esc: esc,
    prefersReducedMotion: prefersReducedMotion
  };
})(window);
