/* =========================================================
   UDUF AFRICA — LoadingState
   Shared busy indicator. Used while a lookup or a checkout
   call is in flight, so waiting always looks the same.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  function markup(text) {
    return '' +
      '<div class="loading" role="status" aria-live="polite">' +
        '<span class="loading__bar" aria-hidden="true"></span>' +
        '<span class="loading__txt">' + U.esc(text || 'Working\u2026') + '</span>' +
      '</div>';
  }

  function show(host, text) {
    var node = typeof host === 'string' ? U.qs(host) : host;
    if (!node) return null;
    node.innerHTML = markup(text);
    return node;
  }

  function hide(host) {
    var node = typeof host === 'string' ? U.qs(host) : host;
    if (node) node.innerHTML = '';
  }

  /* Swap a region between content and a busy state. */
  function toggle(host, isBusy, text) {
    if (isBusy) show(host, text);
    else hide(host);
  }

  Uduf.LoadingState = { show: show, hide: hide, toggle: toggle, markup: markup };
})(window);
