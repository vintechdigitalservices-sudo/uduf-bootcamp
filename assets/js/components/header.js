/* =========================================================
   UDUF AFRICA — Header (shared component, all three pages)

   One component, byte-identical markup on every page. The only
   difference is a `data-variant` on <body>:
     over  — transparent over the dark hero; the wordmark renders
             white and the header turns solid white after 50px.
     solid — always white. Register and Verify have no hero to sit
             over, so they start in the solid state.

   Mobile: logo + burger, with a full-screen dark drawer that
   animates in and traps focus.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  var FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  /* Scroll distance after which the transparent header becomes solid. */
  var STICK_AT = 50;
  /* Only start hiding the bar once the reader is properly into the
     page, so it never disappears over the hero. */
  var HIDE_FROM = 320;

  function headerMarkup(page) {
    var cfg = Uduf.config;
    var A = cfg.ASSETS;
    var e = cfg.EVENT;

    var nav = cfg.NAV.map(function (item) {
      var current = item.key === page ? ' aria-current="page"' : '';
      return '<a class="nav__link" href="' + item.href + '"' + current + '>' + U.esc(item.label) + '</a>';
    }).join('');

    var drawerLinks = cfg.NAV.map(function (item, i) {
      var current = item.key === page ? ' aria-current="page"' : '';
      return '<a class="drawer__link" href="' + item.href + '"' + current +
             ' style="transition-delay:' + (60 + i * 55) + 'ms">' +
             '<span>' + U.esc(item.label) + '</span>' +
             Uduf.icons.icon('arrow', 'icon arrow') + '</a>';
    }).join('');

    var phones = e.phones.map(function (p) {
      return '<a href="tel:' + p.replace(/[^\d]/g, '') + '">' +
             Uduf.icons.icon('phone', 'icon') + '<span>' + U.esc(p) + '</span></a>';
    }).join('');

    /* Two copies of the same transparent PNG stacked in one grid cell:
       the first keeps the brand colours, the second is knocked to solid
       white. CSS crossfades them, so the mark is legible on the dark
       hero and on the white bar without a filter-blur artefact and
       without any white box behind it. */
    var logo =
      '<span class="hdr__logo">' +
        '<img src="' + A.logoSm + '" alt="" aria-hidden="true" width="200" height="69" decoding="async">' +
        '<img src="' + A.logoSm + '" alt="" aria-hidden="true" width="200" height="69" decoding="async">' +
      '</span>';

    var registerHref = (cfg.NAV.filter(function (n) { return n.key === 'register'; })[0] || {}).href || './register.html';

    return '' +
      '<header class="hdr" data-hdr>' +
        '<div class="hdr__in">' +
          '<a class="hdr__brand" href="./" aria-label="' + U.esc(e.org) + ' \u2014 home">' + logo + '</a>' +
          '<nav class="nav" aria-label="Primary">' + nav + '</nav>' +
          '<a class="btn btn--sm hdr__cta" href="' + registerHref + '">' +
            'Register Now' + Uduf.icons.icon('arrow', 'icon') +
          '</a>' +
          '<button class="burger" type="button" aria-expanded="false" aria-controls="uduf-drawer" aria-label="Open menu">' +
            '<span class="burger__box" aria-hidden="true"><span></span><span></span><span></span></span>' +
          '</button>' +
        '</div>' +
      '</header>' +
      '<div class="drawer" id="uduf-drawer" data-drawer hidden>' +
        '<nav aria-label="Mobile">' + drawerLinks + '</nav>' +
        '<div class="drawer__foot">' +
          '<a class="btn btn--block" href="' + registerHref + '">Register Now' + Uduf.icons.icon('arrow', 'icon') + '</a>' +
          '<div class="drawer__meta">' +
            '<a href="mailto:' + e.email + '">' + Uduf.icons.icon('mail', 'icon') + '<span>' + U.esc(e.email) + '</span></a>' +
            phones +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function init(selector) {
    var host = typeof selector === 'string' ? U.qs(selector) : selector;
    if (!host) return;

    var page = document.body.getAttribute('data-page') || 'home';
    var variant = document.body.getAttribute('data-variant') || 'solid';

    host.innerHTML = headerMarkup(page);
    var hdr = U.qs('[data-hdr]', host);
    var drawer = U.qs('[data-drawer]', host);
    var burger = U.qs('.burger', host);
    if (!hdr) return;

    if (variant === 'solid') hdr.classList.add('is-solid');

    /* ---------- Scroll state ---------- */
    var lastY = global.scrollY || 0;
    var ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      global.requestAnimationFrame(function () {
        ticking = false;
        var y = global.scrollY || 0;
        hdr.classList.toggle('is-stuck', y > STICK_AT);

        /* Reveal on scroll up, retract on scroll down — small, deliberate. */
        if (!drawer || !drawer.classList.contains('is-open')) {
          var down = y > lastY && y > HIDE_FROM;
          hdr.classList.toggle('is-hidden', down);
        }
        lastY = y;
      });
    }

    global.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---------- Drawer ---------- */
    if (!drawer || !burger) return;
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      drawer.hidden = false;
      /* Force a reflow so the transition runs from the hidden state. */
      void drawer.offsetWidth;
      drawer.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Close menu');
      document.body.classList.add('is-locked');
      hdr.classList.remove('is-hidden');
      var first = U.qs(FOCUSABLE, drawer);
      if (first) first.focus();
      document.addEventListener('keydown', onKey);
    }

    function close(restore) {
      if (!drawer.classList.contains('is-open')) return;
      drawer.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Open menu');
      document.body.classList.remove('is-locked');
      document.removeEventListener('keydown', onKey);
      setTimeout(function () {
        if (!drawer.classList.contains('is-open')) drawer.hidden = true;
      }, 460);
      if (restore !== false && lastFocus) lastFocus.focus();
    }

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var items = U.qsa(FOCUSABLE, drawer).filter(isVisible);
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function isVisible(n) { return !!(n.offsetWidth || n.offsetHeight || n.getClientRects().length); }

    U.on(burger, 'click', function () {
      if (drawer.classList.contains('is-open')) close(); else open();
    });

    U.qsa('a', drawer).forEach(function (a) { U.on(a, 'click', function () { close(false); }); });

    /* Close when the viewport grows past the mobile breakpoint. */
    global.addEventListener('resize', U.debounce(function () {
      if (global.innerWidth > 1040) close(false);
    }, 150), { passive: true });

    /* Close if focus escapes the drawer. */
    U.on(document, 'focusin', function (e) {
      if (!drawer.classList.contains('is-open')) return;
      if (drawer.contains(e.target) || hdr.contains(e.target)) return;
      close(false);
    });
  }

  Uduf.Header = init;
})(window);