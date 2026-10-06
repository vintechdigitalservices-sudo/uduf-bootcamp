/* ============================================================
   Home page — hero typing animation + final CTA title reveal
   ============================================================ */

(function () {
  'use strict';

  const U = window.UDUFUtil;
  if (!U) return;

  const reduce = U.reduceMotion;

  /* ---------- Hero: three typed lines ----------
     "UDUF Africa · 2027"
     "2027 Active Leadership &"
     "Entrepreneurship Bootcamp" */
  const title = document.querySelector('[data-typing]');

  if (title) {
    const lines = (title.dataset.lines || '').split('|').map((s) => s.trim()).filter(Boolean);
    const slots = U.$$('.typing__line', title);
    const shell = title.closest('.hero__inner');

    const done = () => {
      slots.forEach((s) => {
        s.classList.remove('is-typing');
        s.classList.add('is-done');
      });
      /* reveals the countdown, buttons and subtext once typing ends */
      if (shell) shell.classList.add('is-typed');
    };

    if (reduce || !lines.length) {
      slots.forEach((s, i) => { s.textContent = lines[i] || ''; });
      done();
    } else {
      /* reset slots */
      slots.forEach((s) => { s.textContent = ''; s.classList.remove('is-done'); });

      let lineIndex = 0;

      const typeLine = () => {
        if (lineIndex >= Math.min(lines.length, slots.length)) {
          done();
          return;
        }

        const slot = slots[lineIndex];
        const text = lines[lineIndex];
        let char = 0;

        slot.classList.add('is-typing');
        slot.classList.remove('is-done');

        const step = () => {
          if (char <= text.length) {
            slot.textContent = text.slice(0, char);
            char++;
            setTimeout(step, char === text.length ? 300 : 42);
          } else {
            slot.classList.remove('is-typing');
            slot.classList.add('is-done');
            lineIndex++;
            setTimeout(typeLine, 180);
          }
        };

        step();
      };

      setTimeout(typeLine, 300);
    }
  }

  /* ---------- Final CTA: YOUR IDEA / YOUR BUSINESS / YOUR LEGACY
     blur-and-lift in one by one when the block scrolls into view. */
  const finalTitle = document.getElementById('final-title');
  if (finalTitle) {
    const spans = U.$$('span', finalTitle);
    const set = (on) => spans.forEach((s) => s.classList.toggle('is-in', on));

    if (reduce || !('IntersectionObserver' in window)) {
      set(true);
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => set(e.isIntersecting));
        },
        { threshold: 0.35 }
      );
      io.observe(finalTitle);
    }
  }
})();