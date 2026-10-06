/* ============================================================
   Register page — issues a confirmed ticket immediately.
   No payment step: submit the form, get the ticket + QR code.
   ============================================================ */

(function () {
  'use strict';

  const U = window.UDUFUtil;
  if (!U) return;

  const CFG = window.UDUF;
  const form = document.getElementById('register-form');
  if (!form) return;

  const btn = document.getElementById('submit-btn');
  const btnLabel = $('[data-btn-label]', btn);
  const result = document.getElementById('register-result');
  const fieldsets = U.$$('.form-group', form);

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }

  /* ---------------- Validation ---------------- */

  const RULES = {
    fullName: (v) => {
      if (!v.trim()) return 'Please enter your full name.';
      if (v.trim().length < 3) return 'That name looks too short.';
      return '';
    },
    phone: (v) => {
      const digits = v.replace(/\D/g, '');
      if (!digits) return 'Please enter your phone number.';
      if (digits.length < 10) return 'Please enter a valid phone number.';
      return '';
    },
    email: (v) => {
      if (!v.trim()) return 'Please enter your email address.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return 'That email address does not look right.';
      return '';
    },
    age: (v) => {
      if (!v.trim()) return 'Please enter your age.';
      const n = Number(v);
      if (!Number.isFinite(n)) return 'Please enter your age as a number.';
      if (n < 16 || n > 100) return 'Age must be between 16 and 100.';
      return '';
    },
    address: (v) => (v.trim() ? '' : 'Please enter your address.'),
  };

  function setFieldState(input, message) {
    const wrap = input.closest('[data-field]');
    if (!wrap) return;
    const error = $('[data-error]', wrap);
    wrap.classList.toggle('has-error', !!message);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (error) error.textContent = message;
  }

  function validateField(input) {
    const rule = RULES[input.name];
    const message = rule ? rule(input.value) : '';
    setFieldState(input, message);
    return !message;
  }

  function validateAll(showFirst) {
    let ok = true;
    let firstBad = null;

    U.$$('[required]', form).forEach((input) => {
      if (input.type === 'hidden') return;
      const valid = validateField(input);
      if (!valid && !firstBad) firstBad = input;
      if (!valid) ok = false;
    });

    if (showFirst && firstBad) {
      firstBad.focus();
      if (firstBad.scrollIntoView) firstBad.scrollIntoView({ block: 'center', behavior: U.reduceMotion ? 'auto' : 'smooth' });
    }
    return ok;
  }

  /* Live validation once a field has been touched. */
  form.addEventListener(
    'blur',
    (e) => {
      const input = e.target;
      if (input && RULES[input.name]) validateField(input);
    },
    true
  );

  form.addEventListener('input', (e) => {
    const input = e.target;
    if (!input || !RULES[input.name]) return;
    const wrap = input.closest('[data-field]');
    if (wrap && wrap.classList.contains('is-invalid')) validateField(input);
  });

  /* ---------------- Step markers ---------------- */

  function markFieldsets(valid) {
    fieldsets.forEach((fs, i) => {
      const step = $('.form-legend__step', fs);
      if (!step) return;
      const complete = valid || fs.classList.contains('is-complete');
      if (complete && !valid) fs.classList.add('is-complete');
      if (valid) step.textContent = '✓';
      else if (complete) step.textContent = String(i + 1);
    });
  }

  /* ---------------- Submit ---------------- */

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateAll(true)) {
      U.toast('Please correct the highlighted fields.', 'error');
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const ticket = {
      ...data,
      fullName: String(data.fullName || '').trim(),
      email: String(data.email || '').trim().toLowerCase(),
      ticketType: data.ticketType || CFG.ticketType,
      ticketPrice: 0,
      status: 'confirmed',
    };

    btn.disabled = true;
    btn.classList.add('is-loading');
    if (btnLabel) btnLabel.textContent = 'Issuing your ticket…';

    try {
      const saved = await U.registerTicket(ticket);

      if (!saved.ok) {
        throw new Error(saved.message || 'We could not issue your ticket. Please try again.');
      }

      showTicket(saved.ticket);
    } catch (err) {
      U.toast(err.message || 'Something went wrong. Please try again.', 'error');
      btn.disabled = false;
      btn.classList.remove('is-loading');
      if (btnLabel) btnLabel.textContent = 'Get My Ticket';
    }
  });

  /* ---------------- Ticket display ---------------- */

  function showTicket(ticket) {
    form.hidden = true;
    markFieldsets(true);

    const code = String(ticket.code || '').toUpperCase();
    const offline = U.isOfflineMode();

    result.hidden = false;
    result.className = 'result result--valid';
    result.innerHTML = `
      <div class="result__head">
        <p class="result__eyebrow">Registration confirmed</p>
        <h2 class="result__title">You are in${U.escapeHtml(ticket.fullName ? ', ' + ticket.fullName.split(' ')[0] : '')}.</h2>
        <p class="result__lede">Bring this ticket — and a way to scan it — to the door.</p>
      </div>
      <div class="result__body">
        <div data-pass></div>
        <div class="pass__foot">
          <a class="btn btn--sm" href="verify.html?code=${encodeURIComponent(code)}">Verify this ticket</a>
          <button class="btn btn--sm btn--ghost" type="button" data-print>Print / Save PDF</button>
        </div>
        ${
          offline
            ? `<p class="form-note">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v5M12 7.8v.1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
                <span>Demo mode: this ticket is saved in this browser only. Set <code>endpoint</code> in <code>assets/js/config.js</code> to issue real tickets.</span>
              </p>`
            : ''
        }
      </div>`;

    U.renderPass($('[data-pass]', result), ticket);

    const printBtn = $('[data-print]', result);
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    if (result.scrollIntoView) result.scrollIntoView({ behavior: U.reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }
})();