/* ============================================================
   Verify page — looks up a ticket and, when valid, shows the
   ticket again with its QR code so the door staff can scan it.
   ============================================================ */

(function () {
  'use strict';

  const U = window.UDUFUtil;
  if (!U) return;

  const form = document.getElementById('verify-form');
  if (!form) return;

  const input = document.getElementById('code');
  const btn = document.getElementById('verify-btn');
  const btnLabel = btn.querySelector('[data-btn-label]');
  const out = document.getElementById('result');

  /* Accepts anything a person or a scanner might hand us:
     lowercase, spaces or dashes instead of dashes, the bare digits,
     or the whole QR payload. */
  function normalise(raw) {
    let v = String(raw || '').trim().toUpperCase();
    if (!v) return '';
    v = v.replace(/^UDUF2027\//, '');   /* the full QR payload */
    v = v.replace(/[^A-Z0-9]/g, '');    /* spaces and dashes */
    if (v.indexOf('UDUF') === 0) v = v.slice(4);
    if (v.length < 8) return '';
    v = v.slice(-8);
    return `UDUF-${v.slice(0, 4)}-${v.slice(4, 8)}`;
  }

  function setError(message) {
    const wrap = input.closest('[data-field]');
    const slot = wrap ? wrap.querySelector('[data-error]') : null;
    if (wrap) wrap.classList.toggle('has-error', !!message);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (slot) slot.textContent = message;
  }

  function shell(kind, title, lede, inner) {
    const eyebrow =
      kind === 'valid' ? 'Valid ticket' : kind === 'used' ? 'Already used' : 'Not valid';
    return `
      <div class="result result--${kind}">
        <div class="result__head">
          <p class="result__eyebrow">${U.escapeHtml(eyebrow)}</p>
          <h2 class="result__title">${U.escapeHtml(title)}</h2>
          ${lede ? `<p class="result__lede">${U.escapeHtml(lede)}</p>` : ''}
        </div>
        ${inner || ''}
      </div>`;
  }

  async function run(code) {
    btn.disabled = true;
    btn.classList.add('is-loading');
    if (btnLabel) btnLabel.textContent = 'Checking…';
    out.hidden = false;

    try {
      const res = await U.lookupTicket(code);

      if (res.ok && res.ticket && res.status === 'valid') {
        out.innerHTML = shell(
          'valid',
          res.ticket.fullName || 'Ticket holder',
          `${U.CFG.event.name} · ${U.CFG.event.dateLabel}`,
          '<div data-pass></div>'
        );
        U.renderPass(out.querySelector('[data-pass]'), res.ticket);
      } else if (res.ok && res.status === 'checked_in') {
        out.innerHTML = shell(
          'used',
          'This ticket has already been used.',
          res.ticket && res.ticket.fullName
            ? `It was used for entry by ${res.ticket.fullName}.`
            : 'Contact the registration desk if this looks wrong.'
        );
      } else {
        out.innerHTML = shell(
          'invalid',
          'We could not find that ticket.',
          'Check the code and try again.'
        );
      }
    } catch (err) {
      out.innerHTML = shell('invalid', 'Verification failed.', err.message || 'Please try again.');
    } finally {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      if (btnLabel) btnLabel.textContent = 'Verify Ticket';
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const code = normalise(input.value);
    if (!code) {
      setError('Please enter a ticket code.');
      input.focus();
      return;
    }
    setError('');
    input.value = code;
    run(code);
  });

  input.addEventListener('input', () => setError(''));

  /* Arriving from the registration page pre-fills and runs the lookup. */
  const preset = normalise(new URLSearchParams(location.search).get('code'));
  if (preset) {
    input.value = preset;
    run(preset);
  }
})();