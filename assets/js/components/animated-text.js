/* =========================================================
   UDUF AFRICA — AnimatedText

   The theme types in line by line, then settles on the last
   one and stays there.

   Timing is deliberately tight — the whole run is a few
   seconds. Typing accelerates, each line holds briefly, and
   non-final lines backspace out before the next arrives.

   Type size is measured, not guessed: the longest line is
   auto-fitted to the container so it can never overflow on a
   narrow phone, and it re-fits once webfonts land.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  /* Tuned so the whole run — start delay, three lines typed, two
     erased, holds between them — lands at roughly 2.2s, inside the
     2.5s budget with headroom for slow frames. */
  var DEFAULTS = {
    typeMs: 25,        /* per character, first pass */
    typeAccel: 0.55,   /* multiplier reached at the end of the line */
    holdMs: 340,       /* pause on a complete line */
    eraseMs: 12,       /* per character, backspacing out */
    finalHoldMs: Infinity,
    maxPx: 200,        /* ceiling for the fitted size */
    minPx: 26,
    startDelayMs: 150,
    nextLineMs: 70     /* beat before the following line starts */
  };

  function AnimatedText(node, options) {
    this.node = node;
    this.opts = Object.assign({}, DEFAULTS, options || {});
    this.lines = (this.opts.lines || []).slice();
    this.i = -1;
    this.typed = 0;
    this.timer = null;
    this.done = false;
    this.running = false;
    this.raf = null;
    this.build();
  }

  AnimatedText.prototype.build = function () {
    var o = this.opts;
    this.node.classList.add('typed');
    this.node.innerHTML =
      '<span class="typed__out" aria-hidden="true"></span>' +
      '<span class="typed__caret" aria-hidden="true"></span>';

    /* Visible text is announced once, in full, to screen readers.
       The per-character output is decorative. */
    this.sr = U.el('span', { class: 'sr-only' });
    this.sr.textContent = this.lines.join(' ');
    this.node.appendChild(this.sr);

    this.out = U.qs('.typed__out', this.node);
    this.caret = U.qs('.typed__caret', this.node);
    this.node.setAttribute('aria-label', this.lines.join(' '));
    this.node.setAttribute('role', 'text');

    this.meter = U.el('span', {
      'aria-hidden': 'true',
      style: {
        position: 'absolute', visibility: 'hidden', pointerEvents: 'none',
        whiteSpace: 'nowrap', left: '0', top: '0', font: 'inherit',
        letterSpacing: 'inherit', textTransform: 'inherit'
      }
    });
    this.node.appendChild(this.meter);
  };

  /* ---------- Auto-fit ---------- */
  AnimatedText.prototype.fit = function () {
    if (!this.lines.length) return;
    var o = this.opts;
    var host = this.node.parentElement || this.node;
    var avail = host.getBoundingClientRect().width;
    if (!avail) return;

    var widest = 0;
    this.meter.style.fontSize = '100px';
    for (var i = 0; i < this.lines.length; i++) {
      this.meter.textContent = this.lines[i];
      var w = this.meter.getBoundingClientRect().width;
      if (w > widest) widest = w;
    }
    if (!widest) return;

    var fitted = (avail / widest) * 100;
    var size = U.clamp(fitted, o.minPx, Math.min(o.maxPx, avail * 0.62));
    this.node.style.setProperty('--typed-size', size.toFixed(2) + 'px');
  };

  /* ---------- Run ---------- */
  AnimatedText.prototype.write = function (line, n, ms) {
    var self = this;
    this.typed = n;
    this.out.textContent = line.slice(0, n);
    if (n < line.length) {
      this.timer = setTimeout(function () { self.write(line, n + 1, ms); }, ms);
    } else {
      /* The last line settles the instant it is typed — there is
         nothing left to wait for. Only intermediate lines hold. */
      var last = this.i === this.lines.length - 1;
      if (last) { this.settle(); return; }
      this.timer = setTimeout(function () { self.hold(); }, this.opts.holdMs);
    }
  };

  AnimatedText.prototype.hold = function () {
    var self = this;
    if (this.i === this.lines.length - 1) { this.settle(); return; }
    this.erase();
  };

  /* One timer per character, not two. The previous version scheduled
     an inner timer and then re-entered this method, which scheduled
     another — doubling the real cost of every backspace. */
  AnimatedText.prototype.erase = function () {
    var self = this;
    var line = this.lines[this.i];
    this.timer = setTimeout(function () {
      if (self.typed > 0) {
        self.typed -= 1;
        self.out.textContent = line.slice(0, self.typed);
        self.erase();
        return;
      }
      self.advance();
    }, this.opts.eraseMs);
  };

  AnimatedText.prototype.advance = function () {
    var self = this;
    this.i += 1;
    if (this.i >= this.lines.length) { this.settle(); return; }

    var line = this.lines[this.i];
    var len = line.length;
    var perChar = this.opts.typeMs;
    var step = 0;

    function type() {
      if (self.typed < len) {
        /* Accelerate across the line: quick, confident, not mechanical. */
        var t = self.typed / Math.max(1, len - 1);
        var ms = perChar * (1 - self.opts.typeAccel * t);
        self.write(line, self.typed + 1, ms);
        step += 1;
      }
    }
    this.typed = 0;
    this.out.textContent = '';
    this.timer = setTimeout(type, step ? 0 : this.opts.nextLineMs);
  };

  /* Final resting state: last line, no caret blink, accent colour. */
  AnimatedText.prototype.settle = function () {
    this.stop();
    this.done = true;
    this.running = false;
    this.i = this.lines.length - 1;
    this.out.textContent = this.lines[this.i];
    this.node.classList.add('is-done');
    this.out.classList.add('typed__final');
    if (typeof this.opts.onDone === 'function') this.opts.onDone(this);
  };

  AnimatedText.prototype.start = function () {
    if (this.running || this.done) return;
    var self = this;
    this.running = true;
    this.i = -1;
    this.typed = 0;
    this.out.textContent = '';
    this.out.classList.remove('typed__final');
    this.node.classList.remove('is-done');
    this.fit();
    this.timer = setTimeout(function () { self.advance(); }, this.opts.startDelayMs);
  };

  AnimatedText.prototype.stop = function () {
    this.running = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.raf) { global.cancelAnimationFrame(this.raf); this.raf = null; }
  };

  /* Re-fit on viewport change and after webfonts swap in. */
  AnimatedText.prototype.observeResize = function () {
    var self = this;
    global.addEventListener('resize', U.debounce(function () { self.fit(); }, 160), { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { self.fit(); }).catch(function () {});
    }
  };

  function create(node, options) {
    if (!node) return null;
    var inst = new AnimatedText(node, options);

    if (U.prefersReducedMotion()) {
      /* Show the end state immediately — no typing, no caret. */
      inst.settle();
      return inst;
    }

    inst.observeResize();
    inst.start();
    return inst;
  }

  Uduf.AnimatedText = { create: create, AnimatedText: AnimatedText };
})(window);
