(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('main > section').forEach((s) => {
    if (!s.classList.contains('hero')) s.classList.add('reveal');
  });

  const items = Array.from(document.querySelectorAll('.reveal'));
  if (reduced.matches || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('revealed'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('revealed', e.isIntersecting));
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el) => io.observe(el));
  }

  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  const slides = Array.from(document.querySelectorAll('.gallery-track .gallery-slide'));
  const dotsHost = document.getElementById('galleryDots');
  const counter = document.getElementById('galleryCounter');
  if (slides.length && dotsHost) {
    let current = 0;
    let timer = null;
    const dots = slides.map((_, i) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'gallery-dot' + (i === 0 ? ' active' : '');
      d.setAttribute('aria-label', `Show gallery image ${i + 1}`);
      d.addEventListener('click', () => { show(i); restart(); });
      dotsHost.appendChild(d);
      return d;
    });
    function show(i) {
      current = (i + slides.length) % slides.length;
      slides.forEach((s, n) => s.classList.toggle('active', n === current));
      dots.forEach((d, n) => { d.classList.toggle('active', n === current); d.setAttribute('aria-current', n === current ? 'true' : 'false'); });
      if (counter) counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    }
    function restart() {
      if (timer) clearInterval(timer);
      timer = setInterval(() => show(current + 1), 3000);
    }
    show(0); restart();
    const frame = document.querySelector('.gallery-frame');
    if (frame) {
      frame.addEventListener('mouseenter', () => { if (timer) clearInterval(timer); });
      frame.addEventListener('mouseleave', restart);
      frame.addEventListener('focusin', () => { if (timer) clearInterval(timer); });
      frame.addEventListener('focusout', restart);
    }
  }
})();
