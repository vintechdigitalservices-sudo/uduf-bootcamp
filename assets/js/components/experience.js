/* =========================================================
   UDUF AFRICA — ExperienceSection
   NOT JUST LISTENING. BUILDING. A single ordered sequence that
   reads as a stacked/horizontal flow of formats.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  function render(selector) {
    var host = typeof selector === 'string' ? U.qs(selector) : selector;
    if (!host) return;

    var items = Uduf.config.EXPERIENCE.map(function (t, i) {
      return '' +
        '<li class="flow__item" data-reveal="up" data-reveal-group' +
           ' data-reveal-delay="' + (i * 0.055).toFixed(3) + 's">' +
          '<span class="flow__n">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="flow__t">' + U.esc(t) + '</span>' +
          '<span class="flow__arrow" aria-hidden="true">' + Uduf.icons.icon('arrow', 'icon') + '</span>' +
        '</li>';
    }).join('');

    host.className = 'section experience';
    host.id = 'experience';
    host.innerHTML = '' +
      '<div class="wrap">' +
        '<header class="shead">' +
          '<div class="shead__label" data-reveal="left">' +
            '<p class="eyebrow">How it works</p>' +
          '</div>' +
          '<div class="shead__main">' +
            '<h2 class="display display--xl" data-reveal="type">NOT JUST LISTENING.<br>BUILDING.</h2>' +
            '<p class="lede shead__lede" data-reveal="up">' +
              'Leave with practical tools, clarity and a 30/60/90-day action plan.' +
            '</p>' +
          '</div>' +
        '</header>' +
        '<ol class="flow">' + items + '</ol>' +
      '</div>';
  }

  Uduf.ExperienceSection = { init: render, render: render };
})(window);
