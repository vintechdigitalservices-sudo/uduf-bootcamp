/* ============================================================
   Verify page — looks up a ticket (tickets/{code}) or a whole
   registration (registrations/{refId}) and shows the current
   state: pending payment / pending verification / rejected /
   valid (with QR, download + WhatsApp group) / already checked in.
   ============================================================ */

(function () {
  'use strict';

  const U = window.UDUFUtil;
  if (!U) return;

  const CFG = window.UDUF;
  const form = document.getElementById('verify-form');
  if (!form) return;

  const input = document.getElementById('code');
  const btn = document.getElementById('verify-btn');
  const btnLabel = btn.querySelector('[data-btn-label]');
  const out = document.getElementById('result');

  /* Normalise whatever a person or a scanner hands us. */
  function normalise(raw) {
    let v = String(raw || '').trim().toUpperCase();
    if (!v) return '';

    /* Full registration-ID lookup ("UDUF-REG-XXXXXXXX") */
    if (v.indexOf('UDUF-REG-') === 0) {
      v = v.replace(/[^A-Z0-9-]/g, '');
      return /^UDUF-REG-[A-Z0-9]{8,}$/.test(v) ? v : '';
    }

    /* Existing ticket-code normaliser (QR-payload tolerant) */
    v = v.replace(/^UDUF2027\//, '');
    v = v.replace(/[^A-Z0-9]/g, '');
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

  function shell(className, eyebrow, title, lede, inner) {
    return `
      <div class="result result--${className}">
        <div class="result__head">
          <p class="result__eyebrow">${U.escapeHtml(eyebrow)}</p>
          <h2 class="result__title">${U.escapeHtml(title)}</h2>
          ${lede ? `<p class="result__lede">${U.escapeHtml(lede)}</p>` : ''}
        </div>
        ${inner ? `<div class="result__body">${inner}</div>` : ''}
      </div>`;
  }

  function referenceBlock(reg) {
    return `
      <div class="ref-id" style="margin-top:1.2rem">
        <span class="ref-id__label">Registration ID</span>
        <span class="ref-id__value">${U.escapeHtml(reg.refId)}</span>
      </div>`;
  }

  function whatsappGroupBlock() {
    return `
      <div class="whatsapp-cta">
        <p class="whatsapp-cta__label">Join the official community</p>
        <a class="btn" href="${U.escapeHtml(CFG.payment.whatsappGroup)}" target="_blank" rel="noopener">
          JOIN THE WHATSAPP GROUP
          <span class="btn__arrow"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </a>
        <p class="whatsapp-cta__note">For paid, verified attendees.</p>
      </div>`;
  }

  /* ---------------- Ticket-code outcomes ---------------- */

  function showTicketValid(ticket) {
    out.innerHTML = shell(
      'valid',
      'Valid ticket',
      ticket.fullName || 'Ticket holder',
      `${CFG.event.name} · ${CFG.event.dateLabel}`,
      '<div data-pass-host></div>'
    );
    U.renderPass(out.querySelector('[data-pass-host]'), {
      code: ticket.code,
      fullName: ticket.fullName,
      ticketType: ticket.ticketLabel || ticket.ticketType || CFG.ticketType,
    });
  }

  /* ---------------- Registration outcomes ---------------- */

  function attendeesOf(reg) {
    const list = (reg.participants && reg.participants.length ? reg.participants : []).map((p, i) => ({
      fullName: p.fullName || (i === 0 && reg.purchaser ? reg.purchaser.fullName : ''),
      ticketCode: p.ticketCode || reg.ticketCode || '',
      ticketType: reg.ticketLabel || CFG.ticketType,
    }));
    if (!list.length) {
      list.push({
        fullName: (reg.purchaser && reg.purchaser.fullName) || reg.fullName || 'Attendee',
        ticketCode: reg.ticketCode || '',
        ticketType: reg.ticketLabel || CFG.ticketType,
      });
    }
    return list.filter((a) => a.fullName || a.ticketCode);
  }

  function renderPassesHost(reg) {
    const host = document.createElement('div');
    attendeesOf(reg).forEach((a) => {
      const box = document.createElement('div');
      U.renderPass(box, a);
      host.appendChild(box);
    });
    return host.innerHTML;
  }

  function showConfirmed(reg) {
    const head = (reg.purchaser && reg.purchaser.fullName) || reg.fullName || reg.refId;
    out.innerHTML = shell(
      'valid',
      'Registration confirmed · Paid',
      'REGISTRATION CONFIRMED',
      `${head} · ${CFG.event.name}`,
      `${renderPassesHost(reg)}
       <div class="pass__foot" style="padding:1.2rem 0 0">
         <button class="btn btn--sm" type="button" data-print>Download / Print Ticket</button>
       </div>
       ${whatsappGroupBlock()}`
    );
    const printBtn = out.querySelector('[data-print]');
    if (printBtn) printBtn.addEventListener('click', () => window.print());
  }

  function showPendingVerification(reg) {
    out.innerHTML = shell(
      'used',
      'Payment pending verification',
      'PAYMENT PENDING VERIFICATION',
      'Your payment information has been submitted successfully.',
      `<p class="result__lede" style="max-width:none">Our team will review your payment and confirm your registration. Once your payment is verified, your ticket will become available here.</p>
       ${referenceBlock(reg)}`
    );
  }

  function showPendingPayment(reg) {
    const online = reg.paymentMethod === 'online';
    out.innerHTML = shell(
      'used',
      'Payment not yet confirmed',
      'PAYMENT PENDING',
      `Registration ${reg.refId} has been started but payment has not been confirmed yet.`,
      `<p class="result__lede" style="max-width:none">${
        online
          ? 'Complete payment on the official <a href="' + U.escapeHtml(CFG.payment.selarStore) + '" target="_blank" rel="noopener" style="color:var(--amber)">Selar store</a> and return here after paying.'
          : 'Complete the payment and submit your payment receipt so our team can verify it.'
      }</p>
       ${referenceBlock(reg)}`
    );
  }

  function showRejected(reg) {
    out.innerHTML = shell(
      'invalid',
      'Payment not verified',
      'PAYMENT REJECTED',
      reg.rejectionReason || 'We could not verify the payment for this registration.',
      '<p class="result__lede" style="margin-top:1.2rem">No valid ticket is attached to this registration. Contact UDUF Africa if you believe this is an error.</p>'
    );
  }

  function showRegistration(reg) {
    if (reg.paymentStatus === 'rejected') return showRejected(reg);
    if (reg.paymentStatus === 'verified' && reg.ticketStatus === 'generated') return showConfirmed(reg);
    if (reg.paymentStatus === 'pending_verification' || reg.paymentStatus === 'awaiting_verification') return showPendingVerification(reg);
    return showPendingPayment(reg);
  }

  function showNotFound() {
    out.innerHTML = shell(
      'invalid',
      'Not found',
      'We could not find that ticket or registration.',
      'Check the code and try again.'
    );
  }

  /* ---------------- Lookup ---------------- */

  async function run(id) {
    btn.disabled = true;
    btn.classList.add('is-loading');
    if (btnLabel) btnLabel.textContent = 'Checking…';
    out.hidden = false;

    try {
      const res = await U.lookupTicket(id);
      if (!res.ok) throw new Error(res.message || 'Verification failed.');

      if (res.ticket) {
        if (res.status === 'valid') showTicketValid(res.ticket);
        else if (res.status === 'checked_in') {
          out.innerHTML = shell(
            'used',
            'Already used',
            'This ticket has already been used.',
            res.ticket.fullName ? `It was used for entry by ${res.ticket.fullName}.` : 'Contact the registration desk if this looks wrong.'
          );
        } else {
          showNotFound();
        }
        return;
      }

      if (res.registration) return showRegistration(res.registration);
      showNotFound();
    } catch (err) {
      out.innerHTML = shell('error', 'Verification failed.', 'Verification failed.', err.message || 'Please try again.');
    } finally {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      if (btnLabel) btnLabel.textContent = 'Check Status';
    }
  }

  /* ---------------- Events ---------------- */

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = normalise(input.value);
    if (!id) {
      setError('Please enter a ticket code or registration ID.');
      input.focus();
      return;
    }
    setError('');
    input.value = id;
    run(id);
  });

  input.addEventListener('input', () => setError(''));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  /* Arriving pre-filled (from register or a saved ticket). */
  const params = new URLSearchParams(location.search);
  const preset = normalise(params.get('ref') || params.get('code'));
  if (preset) {
    input.value = preset;
    run(preset);
  }
})();