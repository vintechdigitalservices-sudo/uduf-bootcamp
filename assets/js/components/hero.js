/* =========================================================
   UDUF AFRICA — Hero

   Full-bleed editorial opener. The photograph carries the whole
   viewport, a restrained dark scrim keeps the type legible, and
   nothing is decorative on top of it.

   Opening sequence (staggered, never simultaneous):
     1  header settles into place
     2  photograph scales down from 1.04 and the orange eyebrow
        and event name fade up
     3  the theme types itself out
     4  only once it settles do the tagline, the detail bar and
        the CTAs arrive — the type gets its own moment

   Image sourcing: the supplied hero.jpg is a tall 1250x2000 crop,
   so it is served on narrow screens. A <source> swaps in the 1500x1100
   landscape crop from 700px up, where a full-bleed frame would
   otherwise upscale the tall crop by ~1.5x.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  function render(selector) {
    var host = typeof selector === 'string' ? U.qs(selector) : selector;
    if (!host) return null;

    var cfg = Uduf.config;
    var e = cfg.EVENT;
    var A = cfg.ASSETS;

    var registerHref = (cfg.NAV.filter(function (n) { return n.key === 'register'; })[0] || {}).href || './register.html';

    host.className = 'hero';
    host.setAttribute('role', 'banner');
    host.innerHTML = '' +
      '<figure class="hero__media" data-media>' +
        '<picture>' +
          '<source media="(min-width: 700px)" srcset="' + A.heroWide + '" width="1500" height="1100">' +
          '<img data-hero-img' +
            ' src="' + A.heroTall + '"' +
            ' srcset="' + A.heroTallSm + ' 400w, ' + A.heroTallMd + ' 625w, ' + A.heroTall + ' 1250w"' +
            ' sizes="100vw"' +
            ' width="1250" height="2000"' +
            ' alt="Participants at a UDUF Africa leadership and entrepreneurship session"' +
            ' fetchpriority="high" decoding="async">' +
        '</picture>' +
      '</figure>' +

      '<div class="hero__scrim"></div>' +

      '<div class="wrap hero__inner">' +
        '<p class="hero__tag" data-step="1">UDUF Africa Presents</p>' +

        '<h1 class="hero__title" data-step="2">2027 Active Leadership &amp; Entrepreneurship Bootcamp</h1>' +

        '<div class="hero__theme">' +
          '<span class="typed" data-typed></span>' +
        '</div>' +

        '<p class="hero__sub" data-step="3">' + U.esc(e.tagline) + '</p>' +

        '<div class="hero__bar" data-step="4">' +
          '<span>' + Uduf.icons.icon('calendar', 'icon') + U.esc(e.datesMetric) + '</span>' +
          '<i>/</i>' +
          '<span>' + Uduf.icons.icon('pin', 'icon') + U.esc(e.venue) + '</span>' +
          '<i>/</i>' +
          '<span>' + Uduf.icons.icon('clock', 'icon') + U.esc(e.duration) + '</span>' +
        '</div>' +

        '<div class="hero__cta" data-step="5">' +
          '<a class="btn btn--lg" href="' + registerHref + '">Register Now' + Uduf.icons.icon('arrow', 'icon') + '</a>' +
          '<a class="btn btn--lg btn--onDark" href="#journey">See the programme' + Uduf.icons.icon('arrow', 'icon') + '</a>' +
        '</div>' +
      '</div>' +

      '<a class="hero__scroll" href="#journey" aria-label="Scroll to the journey section">Scroll</a>';

    return host;
  }

  /* If the photograph is missing entirely, drop it and let the ink
     background carry the hero — the type still reads. */
  function imageFallback(img, media) {
    if (!img) return;
    var fallbacks = [Uduf.config.ASSETS.heroWide, Uduf.config.ASSETS.heroTallMd,
                     Uduf.config.ASSETS.heroTallSm, Uduf.config.ASSETS.programme];
    var tried = 0;
    img.addEventListener('error', function () {
      if (tried < fallbacks.length) {
        img.src = fallbacks[tried++];
        img.removeAttribute('srcset');
        return;
      }
      media.style.display = 'none';
    });
  }

  function init(selector) {
    var host = typeof selector === 'string' ? U.qs(selector) : selector;
    if (!host) return;
    render(host);

    var hdr = U.qs('[data-hdr]');
    var media = U.qs('[data-media]', host);
    var img = U.qs('[data-hero-img]', host);
    var typedNode = U.qs('[data-typed]', host);

    imageFallback(img, media);

    var typedOpts = {
      lines: Uduf.config.EVENT.themeLines,
      /* The theme line must stay clearly subordinate to the event
         name above it, so it is capped well below the display size. */
      maxPx: 68,
      minPx: 22,
      onDone: function () { host.classList.add('is-late'); }
    };

    if (U.prefersReducedMotion()) {
      if (hdr) hdr.classList.add('is-ready');
      host.classList.add('is-ready', 'is-late');
      Uduf.AnimatedText.create(typedNode, typedOpts);
      return;
    }

    /* Step 1 — header lands. */
    if (hdr) global.requestAnimationFrame(function () { hdr.classList.add('is-ready'); });

    /* Step 2 — photograph settles, eyebrow and event name follow. */
    global.requestAnimationFrame(function () {
      global.requestAnimationFrame(function () { host.classList.add('is-ready'); });
    });

    /* Step 3 — the theme types itself; onDone releases steps 3-5. */
    Uduf.AnimatedText.create(typedNode, typedOpts);

    /* Safety net: if anything stalls, the rest of the hero still appears. */
    setTimeout(function () { host.classList.add('is-late'); }, 7000);
  }

  Uduf.Hero = { init: init, render: render };
})(window);