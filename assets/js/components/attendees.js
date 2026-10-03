/* =========================================================
   UDUF AFRICA — AttendeesSection
   WHO SHOULD ATTEND. Set as a typographic list with rules,
   not a grid of cards. No descriptions.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  function render(selector) {
    var host = typeof selector === 'string' ? U.qs(selector) : selector;
    if (!host) return;

    var items = Uduf.config.ATTENDEES.map(function (t, i) {
      return '' +
        '<li data-reveal="up" data-reveal-group' +
           ' data-reveal-delay="' + (i * 0.05).toFixed(3) + 's">' +
          '<span class="attend__n">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="attend__t">' + U.esc(t) + '</span>' +
        '</li>';
    }).join('');

    host.className = 'section attendees';
    host.id = 'attendees';
    host.innerHTML = '' +
      '<div class="wrap">' +
        '<header class="shead">' +
          '<div class="shead__label" data-reveal="left">' +
            '<p class="eyebrow">Who it&rsquo;s for</p>' +
          '</div>' +
          '<div class="shead__main">' +
            '<h2 class="display display--xl" data-reveal="type">WHO SHOULD<br>ATTEND</h2>' +
          '</div>' +
        '</header>' +
        '<ul class="attend">' + items + '</ul>' +
      '</div>';
  }

  Uduf.AttendeesSection = { init: render, render: render };
})(window);
