/* =========================================================
   UDUF AFRICA — JourneySection
   IDEA -> BUSINESS -> LEGACY. Three stages, each revealed on
   its own so they cascade rather than arriving together.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  function render(selector) {
    var host = typeof selector === 'string' ? U.qs(selector) : selector;
    if (!host) return;

    var stages = Uduf.config.JOURNEY.map(function (s, i) {
      var points = s.points.map(function (p) { return '<li>' + U.esc(p) + '</li>'; }).join('');
      return '' +
        '<article class="jstage jstage--' + (i + 1) + '" data-reveal="up" data-reveal-group' +
          ' data-reveal-delay="' + (i * 0.12).toFixed(2) + 's">' +
          '<span class="jstage__num" aria-hidden="true">' + U.esc(s.n) + '</span>' +
          '<h3 class="jstage__title">' + U.esc(s.title) + '</h3>' +
          '<p class="jstage__lede">' + U.esc(s.lede) + '</p>' +
          '<ul class="jstage__list">' + points + '</ul>' +
        '</article>';
    }).join('');

    host.className = 'section section--paper journey';
    host.id = 'journey';
    host.innerHTML = '' +
      '<div class="wrap">' +
        '<header class="shead journey__head">' +
          '<div class="shead__label" data-reveal="left">' +
            '<p class="eyebrow">The journey</p>' +
          '</div>' +
          '<div class="shead__main">' +
            '<h2 class="display display--xl journey__flow" data-reveal="type">' +
              'IDEA <span class="arrow" aria-hidden="true">&rarr;</span> ' +
              'BUSINESS <span class="arrow" aria-hidden="true">&rarr;</span> ' +
              'LEGACY' +
            '</h2>' +
            '<p class="lede shead__lede" data-reveal="up">' +
              'Two days that take you from a thought to something that outlasts you.' +
            '</p>' +
          '</div>' +
        '</header>' +
        '<div class="journey__grid">' + stages + '</div>' +
      '</div>';
  }

  Uduf.JourneySection = { init: render, render: render };
})(window);
