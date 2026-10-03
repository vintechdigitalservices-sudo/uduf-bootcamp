/* =========================================================
   UDUF AFRICA — ProgrammeSection
   TWO DAYS. ONE JOURNEY. Titles only. The layout carries the
   meaning; there are no session descriptions.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  function dayBlock(day, index) {
    var sessions = day.sessions.map(function (s, i) {
      return '<li data-reveal="right" data-reveal-group>' +
               '<span class="plist__n">' + String(i + 1).padStart(2, '0') + '</span>' +
               '<span class="plist__t">' + U.esc(s) + '</span>' +
             '</li>';
    }).join('');

    var arc = day.arc.map(function (a, i) {
      return (i ? '<i aria-hidden="true">&rarr;</i>' : '') + '<span>' + U.esc(a) + '</span>';
    }).join('');

    return '' +
      '<article class="pday pday--' + (index + 1) + '">' +
        '<div class="pday__side">' +
          '<p class="pday__label" data-reveal="up">' + U.esc(day.label) + '</p>' +
          '<h3 class="pday__title" data-reveal="type">' + U.esc(day.title) + '</h3>' +
          '<p class="pday__arc" data-reveal="up">' + arc + '</p>' +
        '</div>' +
        '<ol class="plist">' + sessions + '</ol>' +
      '</article>';
  }

  function render(selector) {
    var host = typeof selector === 'string' ? U.qs(selector) : selector;
    if (!host) return;

    var days = Uduf.config.PROGRAMME.map(dayBlock).join('');

    host.className = 'section programme';
    host.id = 'programme';
    host.innerHTML = '' +
      '<div class="wrap">' +
        '<header class="shead">' +
          '<div class="shead__label" data-reveal="left">' +
            '<p class="eyebrow">The programme</p>' +
          '</div>' +
          '<div class="shead__main">' +
            '<h2 class="display display--xl" data-reveal="type">TWO DAYS.<br>ONE JOURNEY.</h2>' +
          '</div>' +
        '</header>' +
        days +
      '</div>';
  }

  Uduf.ProgrammeSection = { init: render, render: render };
})(window);
