/* =========================================================
   UDUF AFRICA — Closing CTA
   Orange full-bleed band. Flat geometric accents only — a
   ring and a green disc. No gradient.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  function render(selector) {
    var host = typeof selector === 'string' ? U.qs(selector) : selector;
    if (!host) return;

    var e = Uduf.config.EVENT;

    host.className = 'cta';
    host.id = 'register';
    host.innerHTML = '' +
      '<div class="wrap cta__inner">' +
        '<p class="cta__kicker" data-reveal="up">Seats are limited</p>' +
        '<h2 class="cta__q" data-reveal="type">' +
          '<span>Your idea is only</span>' +
          '<span>the beginning.</span>' +
        '</h2>' +
        '<div class="cta__foot" data-reveal="up">' +
          '<a class="btn btn--lg btn--ink" href="register.html">' +
            'Register Now' + Uduf.icons.icon('arrow', 'icon') +
          '</a>' +
          '<div>' +
            '<p class="cta__kicker" style="margin:0 0 .35rem">' + U.esc(e.dates) + '</p>' +
            '<p style="font-size:var(--t-md);font-weight:700;letter-spacing:-.01em">' +
              'What will you build?' +
            '</p>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  Uduf.Cta = { init: render, render: render };
})(window);
