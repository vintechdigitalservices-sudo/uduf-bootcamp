/* =========================================================
   UDUF AFRICA — Page transitions
   A short ink veil wipes over the viewport before an internal
   navigation, and the incoming page fades in. Falls back to a
   normal navigation if anything goes sideways.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var enabled = !Uduf.util.prefersReducedMotion();
  var veil = null;
  var timer = null;

  function build() {
    if (veil) return veil;
    veil = Uduf.util.el('div', {
      class: 'page-veil',
      'aria-hidden': 'true',
      html: '<span class="mark">' + Uduf.config.EVENT.org + '</span>'
    });
    document.body.appendChild(veil);
    return veil;
  }

  function isInternal(anchor) {
    if (!anchor || !anchor.href) return false;
    if (anchor.target === '_blank') return false;
    if (anchor.hasAttribute('download')) return false;
    var url;
    try { url = new URL(anchor.href, global.location.href); } catch (e) { return false; }
    if (url.origin !== global.location.origin) return false;
    if (url.pathname === global.location.pathname && url.hash) return false; /* in-page anchor */
    if (url.pathname.replace(/^\/|\/$/g, '') === '') return false;
    return true;
  }

  function init() {
    if (!enabled) return;
    build();
    Uduf.util.on(document, 'click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var anchor = e.target.closest('a');
      if (!isInternal(anchor)) return;
      e.preventDefault();
      var href = anchor.href;
      build().classList.add('is-in');
      clearTimeout(timer);
      timer = setTimeout(function () { global.location.href = href; }, 340);
    });
    /* Restore on bfcache back-navigation */
    global.addEventListener('pageshow', function () {
      if (veil) { veil.classList.remove('is-in'); document.body.classList.remove('is-locked'); }
    });
  }

  Uduf.pageTransition = { init: init };
})(window);
