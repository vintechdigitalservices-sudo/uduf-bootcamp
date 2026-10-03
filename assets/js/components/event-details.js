/* =========================================================
   UDUF AFRICA — EventDetails
   Date, venue, duration and capacity as a ruled table of
   facts. No paragraph about the venue.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  function cell(icon, k, v, sub, accent) {
    return '' +
      '<div class="edetail__cell' + (accent ? ' edetail__cell--accent' : '') + '"' +
           ' data-reveal="up" data-reveal-group>' +
        Uduf.icons.icon(icon, 'icon') +
        '<span class="edetail__k">' + U.esc(k) + '</span>' +
        '<span class="edetail__v">' + U.esc(v) +
          (sub ? '<small>' + U.esc(sub) + '</small>' : '') +
        '</span>' +
      '</div>';
  }

  function render(selector) {
    var host = typeof selector === 'string' ? U.qs(selector) : selector;
    if (!host) return;

    var e = Uduf.config.EVENT;

    host.className = 'section section--paper details';
    host.id = 'details';
    host.innerHTML = '' +
      '<div class="wrap">' +
        '<header class="shead">' +
          '<div class="shead__label" data-reveal="left">' +
            '<p class="eyebrow">The details</p>' +
          '</div>' +
          '<div class="shead__main">' +
            '<h2 class="display display--xl" data-reveal="type">12&ndash;13 FEBRUARY<br>2027</h2>' +
          '</div>' +
        '</header>' +
        '<div class="edetail" data-reveal-group data-reveal-stagger="0.09">' +
          cell('calendar', 'Dates', e.dates, 'Friday &amp; Saturday') +
          cell('pin', 'Venue', e.venue, 'Full venue details shared by email') +
          cell('clock', 'Duration', e.duration, 'One full day each') +
          cell('users', 'Attendance', e.capacity, 'Limited capacity', true) +
        '</div>' +
        '<div class="mt-4" data-reveal="up">' +
          '<a class="link" href="mailto:' + e.email + '">' +
            'Ask a question about the event' + Uduf.icons.icon('arrow', 'icon') +
          '</a>' +
        '</div>' +
      '</div>';
  }

  Uduf.EventDetails = { init: render, render: render };
})(window);
