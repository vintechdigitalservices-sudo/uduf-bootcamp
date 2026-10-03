/* =========================================================
   UDUF AFRICA — Hero

   Owns the opening sequence and the image treatment.

   Load order (deliberately staggered, never simultaneous):
     1  header settles into place
     2  image panel wipes open from the bottom (clip-path)
     3  "UDUF AFRICA PRESENTS" label
     4  event name
     5  theme types itself out
     6  supporting line, date and CTA only appear once the
        typing has finished, so the type gets its own moment

   Image treatment: scale settles 1.03 -> 1.00, the panel
   parallaxes gently on scroll, and a faint paper grain sits
   over the photograph. No gradient wash, no glow.
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
    var reduced = U.prefersReducedMotion();

    host.className = 'hero';
    host.innerHTML = '' +
      '<span class="hero__ghostnum" aria-hidden="true">27</span>' +

      '<div class="wrap">' +
        '<div class="hero__grid">' +

          '<div class="hero__type">' +
            '<p class="eyebrow hero__label hero__reveal" data-step="1">UDUF Africa Presents</p>' +

            '<h1 class="hero__event hero__reveal" data-step="2">' +
              '2027 Active Leadership &amp; <b>Entrepreneurship Bootcamp</b>' +
            '</h1>' +

            '<div class="hero__theme">' +
              '<span class="typed" data-typed></span>' +
            '</div>' +

            '<p class="hero__support hero__reveal" data-step="3">' + U.esc(e.tagline) + '</p>' +

            '<div class="hero__meta hero__reveal" data-step="3">' +
              '<span class="hero__date">' + Uduf.icons.icon('calendar', 'icon') + U.esc(e.dates) + '</span>' +
              '<span class="hero__date">' + Uduf.icons.icon('pin', 'icon') + U.esc(e.venue) + '</span>' +
            '</div>' +

            '<div class="hero__actions hero__reveal" data-step="3">' +
              '<a class="btn btn--lg" href="register.html">Register Now' + Uduf.icons.icon('arrow', 'icon') + '</a>' +
              '<a class="btn btn--lg btn--ghost" href="#journey">See the programme' + Uduf.icons.icon('arrow', 'icon') + '</a>' +
            '</div>' +
          '</div>' +

          '<figure class="hero__media" data-media>' +
            '<img class="hero__img" data-hero-img' +
              ' src="' + cfg.ASSETS.hero + '"' +
              ' srcset="' + cfg.ASSETS.heroSm + ' 640w, ' + cfg.ASSETS.heroMd + ' 1000w, ' + cfg.ASSETS.hero + ' 2000w"' +
              ' sizes="(max-width: 940px) 100vw, 44vw"' +
              ' width="2000" height="1250"' +
              ' alt="Participants at a UDUF Africa leadership and entrepreneurship session"' +
              ' fetchpriority="high" decoding="async">' +
            '<figcaption class="hero__badge">' +
              '<strong>02</strong><span>Days</span>' +
            '</figcaption>' +
          '</figure>' +

        '</div>' +
      '</div>' +

      '<div class="marquee" aria-hidden="true">' +
        '<div class="marquee__track" data-marquee></div>' +
      '</div>';

    return host;
  }

  function marquee(host) {
    var items = Uduf.config.TICKER;
    var track = U.qs('[data-marquee]', host);
    if (!track) return;
    /* Duplicated once so the -50% translate loops seamlessly. */
    var one = items.map(function (t) {
      return '<span class="marquee__item">' + U.esc(t) + '</span>';
    }).join('');
    track.innerHTML = one + one;
  }

  function imageFallback(img, media) {
    var cfg = Uduf.config;
    var tried = 0;
    var fallbacks = [cfg.ASSETS.heroMd, cfg.ASSETS.heroPortrait, cfg.ASSETS.sessionA];
    img.addEventListener('error', function () {
      if (tried < fallbacks.length) {
        img.src = fallbacks[tried++];
        img.removeAttribute('srcset');
        return;
      }
      /* Nothing loaded. Drop the panel and let the type run full width
         rather than showing a broken frame. */
      media.style.display = 'none';
      var grid = U.qs('.hero__grid', media.parentNode);
      if (grid) grid.style.gridTemplateColumns = 'minmax(0, 1fr)';
    });
  }

  function parallax(host) {
    var media = U.qs('[data-media]', host);
    if (!media || U.prefersReducedMotion()) return;
    var ticking = false;

    function update() {
      ticking = false;
      var r = host.getBoundingClientRect();
      if (r.bottom < -200 || r.top > global.innerHeight + 200) return;
      /* -1 above the fold, 0 at centre, 1 once scrolled past. */
      var p = U.clamp((global.innerHeight * 0.5 - r.top) / (r.height || 1), -1, 1);
      media.style.setProperty('--par', (p * -26).toFixed(1) + 'px');
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      global.requestAnimationFrame(update);
    }
    global.addEventListener('scroll', onScroll, { passive: true });
    global.addEventListener('resize', U.debounce(onScroll, 150), { passive: true });
    update();
  }

  function init(selector) {
    var host = typeof selector === 'string' ? U.qs(selector) : selector;
    if (!host) return;
    render(host);
    marquee(host);

    var hdr = U.qs('[data-hdr]');
    var media = U.qs('[data-media]', host);
    var img = U.qs('[data-hero-img]', host);
    var typedNode = U.qs('[data-typed]', host);
    if (img && media) imageFallback(img, media);

    var revealLate = function () { host.classList.add('is-late'); };

    if (U.prefersReducedMotion()) {
      if (hdr) hdr.classList.add('is-ready');
      host.classList.add('is-ready', 'is-late');
      Uduf.AnimatedText.create(typedNode, { lines: Uduf.config.EVENT.themeLines });
      return;
    }

    /* Step 1 — header lands. */
    if (hdr) global.requestAnimationFrame(function () { hdr.classList.add('is-ready'); });

    /* Steps 2-4 — image opens, label and event name follow. */
    global.requestAnimationFrame(function () {
      global.requestAnimationFrame(function () { host.classList.add('is-ready'); });
    });

    /* Step 5 — the theme types itself, then 6 arrives behind it. */
    Uduf.AnimatedText.create(typedNode, {
      lines: Uduf.config.EVENT.themeLines,
      onDone: revealLate
    });

    /* Safety net: if anything stalls, the CTA still appears. */
    setTimeout(revealLate, 7000);

    parallax(host);
  }

  Uduf.Hero = { init: init, render: render };
})(window);
