/* =========================================================
   UDUF AFRICA — Footer (shared component, all three pages)
   Compact. Logo, tagline, nav, clickable email and both
   phone numbers, socials, and the fixed 2027 copyright.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  function markup(page) {
    var cfg = Uduf.config;
    var e = cfg.EVENT;

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
            '<a href="index.html" aria-label="' + U.esc(e.org) + ' \u2014 home">' +
              '<img class="ftr__logo" src="' + cfg.ASSETS.logoSmall + '" alt="' + U.esc(e.org) + '" width="256" height="256" loading="lazy" decoding="async">' +
            '</a>' +
            '<p class="ftr__tag">' + U.esc(e.footerTagline) + '</p>' +
          '</div>' +

          '<div>' +
            '<p class="ftr__colhead">Navigate</p>' +
            '<nav class="ftr__nav" aria-label="Footer">' + nav + '</nav>' +
          '</div>' +

          '<div>' +
            '<p class="ftr__colhead">Get in touch</p>' +
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
