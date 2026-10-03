/* =========================================================
   UDUF AFRICA — Application bootstrap

   Order matters:
     1. icon sprite          (everything can reference it)
     2. header + footer      (identical on all three pages)
     3. page module mounts   (sections injected into placeholders)
     4. motion engine        (observes reveals, including the
                              ones the page module just added)
     5. page module hook     (hero sequence, form behaviour)
     6. warm the data layer
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  function boot() {
    /* 1 */
    Uduf.icons.sprite();

    /* 2 */
    Uduf.Header('[data-component="header"]');
    Uduf.Footer('[data-component="footer"]');

    /* 3 */
    var page = document.body.getAttribute('data-page') || '';
    var mod = Uduf.pages && Uduf.pages[page];

    if (mod && typeof mod.init === 'function') {
      try { mod.init(); }
      catch (e) { if (global.console) console.error('[UDUF] page mount failed:', page, e); }
    }

    /* 4 */
    Uduf.motion.init();
    Uduf.pageTransition.init();

    /* 5 */
    if (mod && typeof mod.afterMount === 'function') {
      try { mod.afterMount(); }
      catch (e) { if (global.console) console.error('[UDUF] page hook failed:', page, e); }
    }

    /* 6 */
    if (Uduf.db) Uduf.db.init().catch(function () { /* surfaced where it matters */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  Uduf.app = { boot: boot };
})(window);
