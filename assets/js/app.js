/* ============================================================
   UDUF Bootcamp — shared runtime
   Header, footer, scroll reveal, hero motion, countdown,
   toasts, loader, page transitions.
   ============================================================ */

(function () {
  'use strict';

  const CFG = window.UDUF;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* Guarded: a failure here must never take the whole page down. */
  const reduceMotion = (function () {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      return false;
    }
  })();

  /* ---------------- Icons ---------------- */
  const ICONS = {
    arrow: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    calendar: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    pin: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.6" stroke="currentColor" stroke-width="1.7"/></svg>',
    clock: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 7v5.2l3.2 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bolt: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M8 12.4l2.7 2.7L16 9.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    cross: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    warn: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5L21.5 20h-19L12 3.5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 9.5v4.2M12 16.6v.1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    info: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v5M12 7.8v.1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    ticket: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 8.5V6.5a1.5 1.5 0 011.5-1.5h15A1.5 1.5 0 0121 6.5v2a2.4 2.4 0 000 7v2a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 014 17.5v-2a2.4 2.4 0 000-7z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 5v14" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 2.5"/></svg>',
    refresh: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 12a8 8 0 11-2.6-5.9M20 4v4h-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mail: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M4 7l8 6 8-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  /* ---------------- Toast ---------------- */
  function toast(message, kind = 'info') {
    let host = $('.toast-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'toast-host';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }

    const icon = kind === 'error' ? ICONS.cross : kind === 'ok' ? ICONS.check : ICONS.info;
    const el = document.createElement('div');
    el.className = `toast toast--${kind}`;
    el.innerHTML = `${icon}<span></span>`;
    el.querySelector('span').textContent = message;
    host.appendChild(el);

    setTimeout(() => {
      el.classList.add('is-leaving');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, 4200);
  }

  /* ---------------- Loader ---------------- */
  function hideLoader() {
    const loader = $('.loader');
    if (!loader) return;
    setTimeout(() => loader.classList.add('is-done'), 120);
  }

  /* ---------------- Header ---------------- */
  const NAV = [
    { href: 'index.html', label: 'Home' },
    { href: 'register.html', label: 'Register' },
    { href: 'verify.html', label: 'Verify Ticket' },
  ];

  function buildHeader() {
    const file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const here = file === '' ? 'index.html' : file;
    const slot = $('[data-header]');
    if (!slot) return;

    slot.innerHTML = `
      <div class="header__inner">
        <a class="brand" href="index.html" aria-label="UDUF Africa — home">
          <img src="public/logo-sm.png" alt="UDUF Africa" width="240" height="84">
          <span class="brand__year">2027</span>
        </a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Open navigation menu">
          <span class="nav-toggle__bar"></span>
          <span class="nav-toggle__bar"></span>
          <span class="nav-toggle__bar"></span>
        </button>
        <nav class="nav" id="primary-nav" aria-label="Primary">
          <div class="nav__head">
            <span class="nav__title">Menu</span>
            <button class="nav__close" type="button" aria-label="Close menu" tabindex="-1">
              <span class="nav__close-x" aria-hidden="true"></span>
            </button>
          </div>
          ${NAV.map(
            (item) =>
              `<a class="nav__link${here === item.href ? ' is-active' : ''}" href="${item.href}"${
                here === item.href ? ' aria-current="page"' : ''
              }>${item.label}</a>`
          ).join('')}
          <a class="btn" href="register.html">Register Now</a>
        </nav>
        <div class="nav-scrim" aria-hidden="true"></div>
      </div>`;

    const header = slot;
    const progress = document.createElement('div');
    progress.className = 'progress';
    document.body.appendChild(progress);

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        header.classList.toggle('is-stuck', window.scrollY > 24);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // mobile menu (right-side drawer)
    const toggle = $('.nav-toggle', header);
    const nav = $('.nav', header);
    const scrim = $('.nav-scrim', header);
    const closeBtn = $('.nav__close', nav);

    const setMenu = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      if (scrim) scrim.classList.toggle('is-open', open);
      document.body.classList.toggle('is-locked', open);
      if (closeBtn) closeBtn.tabIndex = open ? 0 : -1;
      if (open) toggle.blur();
    };

    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    closeBtn?.addEventListener('click', () => setMenu(false));
    scrim?.addEventListener('click', () => setMenu(false));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 760) setMenu(false); });
  }

  /* ---------------- Footer ---------------- */
  function buildFooter() {
    const slot = $('[data-footer]');
    if (!slot) return;
    const e = CFG.event;

    slot.innerHTML = `
      <div class="shell">
        <div class="footer__grid">
          <div class="footer__brand">
            <img class="footer__logo" src="public/logo-sm.png" alt="UDUF Africa" width="240" height="84">
            <p class="footer__tag">${e.tagline}</p>
            <p class="footer__about">A practical two-day experience designed to help you turn ideas into opportunities, build businesses that work, and create something that lasts.</p>
            <div class="footer__social">
              <a href="mailto:${e.email}" aria-label="Email ${e.org}">${ICONS.mail}</a>
            </div>
          </div>

          <div>
            <p class="footer__title">Navigate</p>
            <ul class="footer__list">
              <li><a href="index.html">Home</a></li>
              <li><a href="register.html">Register</a></li>
              <li><a href="verify.html">Verify Ticket</a></li>
            </ul>
          </div>

          <div>
            <p class="footer__title">Event</p>
            <ul class="footer__list">
              <li><span>${e.dateLabel}</span></li>
              <li><span>${e.venue}</span></li>
              <li><span>2 Days · Practical + Interactive</span></li>
            </ul>
          </div>

          <div>
            <p class="footer__title">Contact</p>
            <ul class="footer__list">
              <li><a href="mailto:${e.email}">${e.email}</a></li>
              <li><span>${e.org}</span></li>
            </ul>
          </div>
        </div>

        <div class="footer__bottom">
          <p>© ${new Date().getFullYear()} ${e.org}. All rights reserved.</p>
          <p><a href="mailto:${e.email}">${e.email}</a></p>
        </div>
      </div>`;
  }

  /* ---------------- Scroll reveal ---------------- */
  function initReveal(root = document) {
    const targets = $$('[data-reveal]', root);
    if (!targets.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          /* replay the reveal whenever the element scrolls into view from
             either direction, and hide it again once it leaves. */
          entry.target.classList.toggle('is-in', entry.isIntersecting);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );

    targets.forEach((el) => io.observe(el));
  }

  /* ---------------- Countdown ---------------- */
  function initCountdown() {
    const host = $('[data-countdown]');
    if (!host) return;

    const units = [
      ['days', 'Days'],
      ['hours', 'Hours'],
      ['minutes', 'Minutes'],
      ['seconds', 'Seconds'],
    ];

    host.innerHTML = units
      .map(
        ([key, label]) =>
          `<div class="countdown__unit">
             <span class="countdown__num" data-unit="${key}">--</span>
             <span class="countdown__label">${label}</span>
           </div>`
      )
      .join('');

    const target = new Date(CFG.event.start).getTime();
    const cells = units.map(([key]) => $(`[data-unit="${key}"]`, host));

    const pad = (n) => String(Math.max(0, n)).padStart(2, '0');

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        cells.forEach((c) => (c.textContent = '00'));
        host.innerHTML =
          '<div class="countdown__unit" style="border-color:var(--amber);background:rgba(240,135,30,.1)">' +
          '<span class="countdown__num">WE</span><span class="countdown__label">Are Live</span></div>' +
          '<div class="countdown__unit"><span class="countdown__num">HERE</span><span class="countdown__label">Now</span></div>';
        clearInterval(timer);
        return;
      }
      const s = Math.floor(diff / 1000);
      const values = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
      cells.forEach((c, i) => (c.textContent = pad(values[i])));
    };

    tick();
    const timer = setInterval(tick, 1000);
  }

  /* ---------------- Hero parallax ---------------- */
function initHero() {
    const hero = $('[data-hero]');
    if (!hero) return;

    const copy = $('.hero__inner', hero);
    const img = $('.hero__media img', hero);

    if (img && copy && !reduceMotion) {
      let ticking = false;
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const p = Math.min(window.scrollY / (window.innerHeight || 1), 1);
          img.style.transform = `scale(${(1.08 - p * 0.08).toFixed(3)}) translate3d(0, ${(p * 34).toFixed(1)}px, 0)`;
          copy.style.opacity = String(Math.max(0, 1 - p * 1.6));
          copy.style.transform = `translate3d(0, ${(p * 26).toFixed(1)}px, 0)`;
          ticking = false;
        });
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

/* ---------------- Marquee duplication ---------------- */
  function initMarquee() {
    $$('[data-marquee]').forEach((track) => {
      track.innerHTML = track.innerHTML + track.innerHTML;
      track.setAttribute('aria-hidden', 'false');
    });
  }

  /* ---------------- Page transition ---------------- */
  function initPageTransitions() {
    if (reduceMotion) return;

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      const url = link.getAttribute('href');
      if (!url || link.target === '_blank' || link.hasAttribute('download')) return;
      if (link.origin !== window.location.origin) return;
      if (/^(#|mailto:|tel:|https?:)/.test(url) && !url.endsWith('.html')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

      const loader = $('.loader');
      if (!loader) return;

      e.preventDefault();
      loader.classList.remove('is-done');
      document.body.classList.add('is-locked');
      setTimeout(() => { window.location.href = link.href; }, 420);
    });

    window.addEventListener('pageshow', () => {
      const loader = $('.loader');
      if (loader) loader.classList.add('is-done');
      document.body.classList.remove('is-locked');
    });
  }

/* ---------------- Ambient ----------------
   The blurred glow layers were removed along with the gradients. */
function initAmbient() {}

  /* ---------------- Public helpers ---------------- */
  const Util = {
    $,
    $$,
    CFG,
    icons: ICONS,
    toast,
    reveal: initReveal,
    reduceMotion,

    /* POST JSON to the configured endpoint */
    async post(payload) {
      const res = await fetch(CFG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { ok: false, message: text || 'Unexpected server response.' }; }
      if (!res.ok && data.ok !== false) data.ok = false;
      return data;
    },

    isOfflineMode() {
      return !CFG.endpoint;
    },

    /* ---------- Ticket + QR ----------
       The payload is deliberately alphanumeric-only (A-Z, 0-9 and -/).
       That keeps the QR in its most compact mode, so it scans fast even
       on an old phone at the door. */
    qrPayload(code) {
      return `UDUF2027/${String(code || '').trim().toUpperCase()}`;
    },

    /* Builds a real, scannable QR as inline SVG. Returns null if the
       encoder cannot handle the payload, so a bad code can never blank
       the page. */
    qrSVG(code, opts) {
      if (!window.UDUFRender) return null;
      try {
        return window.UDUFRender.toSVG(this.qrPayload(code), {
          ec: 'Q',
          margin: 2,
          dark: '#000000',
          light: '#ffffff',
          ...(opts || {}),
        });
      } catch (err) {
        return null;
      }
    },

    escapeHtml(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      })[c]);
    },

    /* Renders the ticket pass into a host element. */
    renderPass(host, ticket) {
      if (!host) return;
      const esc = this.escapeHtml;
      const code = String(ticket.code || '').toUpperCase();
      const rows = [
        ['Attendee', ticket.fullName || ticket.name || '—'],
        ['Ticket Type', ticket.ticketType || CFG.ticketType],
        ['Date', CFG.event.dateLabel],
        ['Venue', CFG.event.venue],
      ];

      host.innerHTML = `
        <div class="pass">
          <div class="pass__head">
            <p class="pass__org">${esc(CFG.event.org)}</p>
            <p class="pass__event">${esc(CFG.event.name)}</p>
          </div>
          <div class="pass__body">
            <dl class="pass__details">
              ${rows
                .map(
                  ([k, v]) =>
                    `<div class="pass__row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`
                )
                .join('')}
            </dl>
            <figure class="pass__qr">
              <div class="pass__qrbox" data-qr></div>
              <figcaption class="pass__code">${esc(code)}</figcaption>
            </figure>
          </div>
        </div>`;

      const box = host.querySelector('[data-qr]');
      const svg = this.qrSVG(code, { size: 168 });
      if (svg) box.appendChild(svg);
      else box.textContent = code;
    },

    /* localStorage registration store (offline demo mode) */
    store: {
      all() {
        try { return JSON.parse(localStorage.getItem(CFG.storeKey)) || []; }
        catch { return []; }
      },
      add(row) {
        const rows = this.all();
        rows.push(row);
        try { localStorage.setItem(CFG.storeKey, JSON.stringify(rows)); } catch {}
        return row;
      },
      find(code) {
        const key = String(code || '').trim().toUpperCase();
        return this.all().find((r) => String(r.code).toUpperCase() === key) || null;
      },
    },

    /* UDUF-XXXX-XXXX, retried until it does not collide with a stored code */
    makeCode() {
      const block = () => String(Math.floor(1000 + Math.random() * 9000));
      let code;
      for (let i = 0; i < 40; i++) {
        code = `UDUF-${block()}-${block()}`;
        if (!Util.store.find(code)) return code;
      }
      return `UDUF-${block()}-${Date.now().toString().slice(-4)}`;
    },

    /* ---------- Register ----------
       Registration is free, so this returns a confirmed ticket
       straight away. */
    async registerTicket(data) {
      if (this.isOfflineMode()) {
        const ticket = {
          ...data,
          code: this.makeCode(),
          status: 'confirmed',
          registeredAt: new Date().toISOString(),
        };
        this.store.add(ticket);
        return { ok: true, ticket };
      }

      const res = await this.post({ action: 'register', ...data });
      if (!res.ok) return res;

      const code = String(res.code || res.reference || '').toUpperCase();
      if (!code) return { ok: false, message: 'The server did not return a ticket code.' };

      const ticket = { ...data, code, status: 'confirmed' };
      this.store.add(ticket); /* keep a local copy for offline re-checks */
      return { ok: true, ticket };
    },

    /* ---------- Verify ---------- */
    async lookupTicket(code) {
      const key = String(code || '').trim().toUpperCase();
      if (!key) return { ok: true, status: 'not_found' };

      if (this.isOfflineMode()) {
        const row = this.store.find(key);
        if (!row) return { ok: true, status: 'not_found' };
        /* mirror the backend's status mapping */
        const status = String(row.status || 'confirmed');
        return {
          ok: true,
          status: status === 'checked_in' ? 'checked_in' : 'valid',
          ticket: row,
        };
      }

      return this.post({ action: 'verify', code: key });
    },
  };

  window.UDUFUtil = Util;

  /* ---------------- Boot ---------------- */
  function boot() {
    buildHeader();
    buildFooter();

    initCountdown();
    initMarquee();
    initReveal();
    initHero();
    initAmbient();
    initPageTransitions();
    hideLoader();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();