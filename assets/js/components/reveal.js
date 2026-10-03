/* =========================================================
   UDUF AFRICA — Scroll reveal engine

   Requirement: reveals must work scrolling DOWN and UP, and
   must replay every time a section re-enters the viewport.

   Implementation notes
   --------------------
   · IntersectionObserver adds `.is-in` on entry and REMOVES it
     on exit, so a section that scrolls away and comes back
     animates again. A `once`-style observer would not.
   · A scroll-direction flag is written to each element as
     `data-rv-dir`. CSS reads it and swaps the start offset, so
     when you scroll back up the element settles from the
     direction it actually came from instead of always
     dropping from below.
   · Everything is transform/opacity/clip-path only, so reveals
     never trigger layout.
   · Reduced motion disables the whole system in CSS; this
     module also refuses to observe when the user asks for
     less motion.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;
  var SEL = '[data-reveal]';

  var observer = null;
  var nodes = [];
  var lastY = global.scrollY || 0;
  var dir = 'down';
  var raf = null;
  var started = false;

  function reduce() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* Track scroll direction. rAF-throttled so we never thrash. */
  function onScroll() {
    if (raf) return;
    raf = global.requestAnimationFrame(function () {
      raf = null;
      var y = global.scrollY || global.pageYOffset || 0;
      /* Ignore sub-pixel jitter and rubber-band at the ends. */
      if (Math.abs(y - lastY) > 4) {
        dir = y > lastY ? 'down' : 'up';
        lastY = y;
        applyDir();
      }
    });
  }

  function applyDir() {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute('data-rv-dir') !== dir) {
        nodes[i].setAttribute('data-rv-dir', dir);
      }
    }
  }

  /* Stagger helper: [data-reveal-group] children cascade. */
  function stagger() {
    U.qsa('[data-reveal-group]').forEach(function (group) {
      var step = Number(group.getAttribute('data-reveal-stagger')) || 0.07;
      U.qsa(SEL, group).forEach(function (child, i) {
        if (!child.style.getPropertyValue('--rv-delay')) {
          child.style.setProperty('--rv-delay', (i * step).toFixed(3) + 's');
        }
      });
    });
  }

  function collect() {
    nodes = U.qsa(SEL);
    stagger();
    /* Honour per-element duration overrides written in markup. */
    nodes.forEach(function (n) {
      var d = n.getAttribute('data-reveal-duration');
      if (d) n.style.setProperty('--rv-dur', d);
      var y = n.getAttribute('data-reveal-y');
      if (y) n.style.setProperty('--rv-from-y', y);
      n.setAttribute('data-rv-dir', dir);
    });
  }

  function show(n) {
    if (n.classList.contains('is-in')) return;
    n.classList.add('is-in');
    /* Fire a hook for count-ups and anything else that needs to
       start exactly when its block becomes visible. */
    if (n.hasAttribute('data-count')) {
      Uduf.motion.count(n, n.getAttribute('data-count'));
    }
    U.qsa('[data-count]', n).forEach(function (c) {
      Uduf.motion.count(c, c.getAttribute('data-count'));
    });
  }

  function init() {
    if (started) return;
    started = true;
    collect();

    if (reduce() || !global.IntersectionObserver) {
      nodes.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }

    observer = new global.IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) show(e.target);
        else e.target.classList.remove('is-in');   /* replay on re-entry */
      });
    }, {
      /* Fire a little before the block is fully on screen, and only
         once a real slice of it is visible. */
      threshold: 0.12,
      rootMargin: '0px 0px -8% 0px'
    });

    nodes.forEach(function (n) { observer.observe(n); });
    global.addEventListener('scroll', onScroll, { passive: true });
    global.addEventListener('resize', U.debounce(function () {
      /* Recompute nothing positional; IntersectionObserver handles it. */
    }, 200), { passive: true });
  }

  /* ---------- Count-up numbers ---------- */
  function count(node, to) {
    if (node.__counted) return;
    node.__counted = true;
    var target = Number(String(to).replace(/[^0-9.\-]/g, '')) || 0;
    var prefix = String(to).replace(/[0-9.\-]/g, '');
    if (reduce() || !target) { node.textContent = to; return; }
    var dur = 900;
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var p = U.clamp((ts - start) / dur, 0, 1);
      /* easeOutExpo */
      var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      node.textContent = prefix + Math.round(target * eased).toLocaleString('en-NG');
      if (p < 1) global.requestAnimationFrame(frame);
      else node.textContent = to;
    }
    global.requestAnimationFrame(frame);
  }

  Uduf.motion = { init: init, count: count, refresh: function () { started = false; init(); } };
})(window);
