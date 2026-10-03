/* =========================================================
   UDUF AFRICA — Footer (shared component, all three pages)

   Dark editorial close: brand statement, quick links, the support
   inbox and both phone numbers, socials, and the fixed 2027
   copyright. Everything here is read from config.js.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  function markup(page) {
    var cfg = Uduf.config;
    var e = cfg.EVENT;
    var A = cfg.ASSETS;

    var nav = cfg.NAV.map(function (item) {
      var current = item.key === page ? ' aria-current="page"' : '';
      return '<a href="' + item.href + '"' + current + '>' + U.esc(item.label) + '</a>';
    }).join('');

    var phones = e.phones.map(function (p) {
      return '<a href="tel:' + p.replace(/[^\d]/g, '') + '">' +
             Uduf.icons.icon('phone', 'icon') + '<span>' + U.esc(p) + '</span></a>';
    }).join('');

    var socials = e.socials.map(function (s) {
      return '<a href="' + s.href + '" target="_blank" rel="noopener noreferrer" ' +
             'aria-label="' + U.esc(s.label) + '">' + Uduf.icons.icon(s.icon, 'icon') + '</a>';
    }).join('');

    return '' +
      '<div class="wrap">' +
        '<div class="ftr__top">' +

          '<div class="ftr__brand">' +
            '<a href="./" aria-label="' + U.esc(e.org) + ' \u2014 home">' +
              /* The footer is always dark, so a single knocked-out copy
                 of the transparent PNG is enough — no crossfade needed. */
              '<span class="ftr__logo">' +
                '<img src="' + A.logoMd + '" alt="" aria-hidden="true" width="400" height="138" loading="lazy" decoding="async">' +
              '</span>' +
            '</a>' +
            '<p class="ftr__tag">' + U.esc(e.footerTagline) + '</p>' +
          '</div>' +

          '<div>' +
            '<p class="ftr__colhead">Quick Links</p>' +
            '<nav class="ftr__nav" aria-label="Footer">' + nav + '</nav>' +
          '</div>' +

          '<div>' +
            '<p class="ftr__colhead">Support</p>' +
            '<div class="ftr__contact">' +
              '<a href="mailto:' + e.email + '">' +
                Uduf.icons.icon('mail', 'icon') + '<span>' + U.esc(e.email) + '</span>' +
              '</a>' +
              phones +
            '</div>' +
          '</div>' +

        '</div>' +

        '<div class="ftr__bottom">' +
          '<div class="ftr__legal">' +
            '<span>\u00a9 ' + e.copyrightYear + ' ' + U.esc(e.legalName) + '. All rights reserved.</span>' +
            '<span>' + U.esc(e.dates) + ' \u00b7 ' + U.esc(e.venue) + '</span>' +
          '</div>' +
          '<div class="ftr__socials">' + socials + '</div>' +
        '</div>' +
      '</div>';
  }

  function init(selector) {
    var host = typeof selector === 'string' ? U.qs(selector) : selector;
    if (!host) return;
    var page = document.body.getAttribute('data-page') || 'home';
    host.className = 'ftr';
    host.innerHTML = markup(page);
  }

  Uduf.Footer = init;
})(window);