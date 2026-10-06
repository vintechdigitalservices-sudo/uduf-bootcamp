/* ============================================================
   Register page — ticketing wizard
   SELECT TICKET → CHOOSE PAYMENT METHOD → REGISTRATION DETAILS
   → PAYMENT → PENDING VERIFICATION (manual) / SELAR (online)
   → CONFIRMED TICKET + WHATSAPP GROUP (only once verified)
   ============================================================ */

(function () {
  'use strict';

  const U = window.UDUFUtil;
  if (!U) return;

  const CFG = window.UDUF;
  const Fire = window.UDUFFire;

  const form = document.getElementById('register-form');
  if (!form) return;

  const stepLabel = $('[data-step-label]');
  const detailsHost = $('[data-details-host]');
  const paymentHost = $('[data-payment-host]');
  const selarHost = $('[data-selar-host]');
  const result = document.getElementById('register-result');

  const STEPS = ['ticket', 'method', 'details', 'payment', 'selar'];
  const stepOrder = ['ticket', 'method', 'details', 'payment'];

  const sel = {
    ticketType: null,
    method: null,
    refId: null,
    registration: null,
  };

  function $(s, ctx) {
    return (ctx || document).querySelector(s);
  }

  function $$(s, ctx) {
    return Array.from((ctx || document).querySelectorAll(s));
  }

  /* ---------------- Step navigation ---------------- */

  function showStep(name) {
    $$('[data-step]', form).forEach((el) => {
      const show = el.getAttribute('data-step') === name;
      el.hidden = !show;
    });
    if (stepLabel) {
      const idx = stepOrder.indexOf(name);
      stepLabel.textContent = idx >= 0 ? `Registration · Step ${idx + 1} of ${stepOrder.length}` : 'Registration';
    }
  }

  function go(name) {
    showStep(name);
    if (result) result.hidden = true;
    if (form.scrollIntoView) form.scrollIntoView({ behavior: U.reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------------- Validation ---------------- */

  const RULES = {
    fullName: (v) => {
      if (!v.trim()) return 'Please enter the full name.';
      if (v.trim().length < 3) return 'That name looks too short.';
      return '';
    },
    phone: (v) => {
      const digits = v.replace(/\D/g, '');
      if (!digits) return 'Please enter a phone number.';
      if (digits.length < 10) return 'Please enter a valid phone number.';
      return '';
    },
    email: (v) => {
      if (!v.trim()) return 'Please enter an email address.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return 'That email address does not look right.';
      return '';
    },
    age: (v) => {
      if (!v.trim()) return 'Please enter the age.';
      const n = Number(v);
      if (!Number.isFinite(n)) return 'Please enter the age as a number.';
      if (n < 16 || n > 100) return 'Age must be between 16 and 100.';
      return '';
    },
    address: (v) => (v.trim() ? '' : 'Please enter the address.'),
  };

  function validateField(input) {
    const rule = RULES[input.name];
    const msg = rule ? rule(input.value) : '';
    setFieldState(input, msg);
    return !msg;
  }

  function setFieldState(input, msg) {
    const wrap = input.closest('[data-field]');
    if (!wrap) return;
    const err = $('[data-error]', wrap);
    wrap.classList.toggle('has-error', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) err.textContent = msg;
  }

  function validateContext(ctx, opts) {
    let ok = true;
    let firstBad = null;
    $$('[required]', ctx).forEach((input) => {
      if (input.type === 'hidden') return;
      if (input.disabled && !opts.forceDisabled) return;
      const valid = validateField(input);
      if (!valid && !firstBad) firstBad = input;
      if (!valid) ok = false;
    });
    if (!ok && firstBad) {
      firstBad.focus();
      if (firstBad.scrollIntoView)
        firstBad.scrollIntoView({ block: 'center', behavior: U.reduceMotion ? 'auto' : 'smooth' });
    }
    return ok;
  }

  function bindLiveValidation(ctx) {
    ctx.addEventListener('blur', (e) => {
      if (RULES[e.target && e.target.name]) validateField(e.target);
    }, true);
    ctx.addEventListener('input', (e) => {
      const input = e.target;
      if (!input || !RULES[input.name]) return;
      const wrap = input.closest('[data-field]');
      if (wrap && wrap.classList.contains('has-error')) validateField(input);
    });
  }

  function field(name, label, type, required, placeholder, extra) {
    return `
      <div class="field" data-field>
        <label class="field__label" for="${name}">${label}${required ? '' : ' <span class="opt">(Optional)</span>'}</label>
        <input class="field__input" type="${type}" id="${name}" name="${name}" ${required ? 'required' : ''}
               ${placeholder ? `placeholder="${placeholder}"` : ''} ${extra || ''}>
        <span class="field__error" data-error></span>
      </div>`;
  }

  /* ---------------- STEP 3 · Details ---------------- */

  function purchaserBlock() {
    return `
      <div class="form-sub">Group Contact / Purchaser</div>
      <div class="grid-2">
        ${field('purchase_fullName', 'Full Name', 'text', true, 'Full name of the person paying.')}
        ${field('purchase_phone', 'Phone Number', 'tel', true, 'Active phone number.', 'autocomplete="tel"')}
      </div>
      <div class="grid-2">
        ${field('purchase_email', 'Email Address', 'email', true, 'Email address.', 'autocomplete="email"')}
        ${field('purchase_business', 'Business / Organization', 'text', false, 'Optional.')}
      </div>
      ${field('purchase_address', 'Address', 'textarea', true, 'Current address.', '')}
      <label class="check">
        <input type="checkbox" name="purchaserIsParticipant" value="1">
        <span class="check__box" aria-hidden="true"></span>
        <span class="check__label">I am also one of the 5 participants.</span>
      </label>`;
  }

  function individualBlock() {
    return `
      <div class="form-sub">Attendee Information</div>
      <div class="grid-2">
        ${field('purchase_fullName', 'Full Name', 'text', true, 'Enter your full name.')}
        ${field('purchase_phone', 'Phone Number', 'tel', true, 'Enter your active phone number.', 'autocomplete="tel"')}
      </div>
      <div class="grid-2">
        ${field('purchase_email', 'Email Address', 'email', true, 'Enter your email address.', 'autocomplete="email"')}
        ${field('purchase_age', 'Age', 'number', true, 'Enter your age.', 'min="16" max="100" inputmode="numeric"')}
      </div>
      <div class="grid-2">
        ${field('purchase_business', 'Business / Organization', 'text', false, 'Optional.')}
      </div>
      ${field('purchase_address', 'Address', 'textarea', true, 'Enter your current address.', '')}`;
  }

  function participantBlock(i) {
    const wrapClass = i === 1 ? ' participant-wrap-1' : '';
    return `
      <div class="form-sub">Participant ${i}</div>
      <div class="pfields${wrapClass}">
        <div class="grid-2">
          ${field(`p${i}_fullName`, 'Full Name', 'text', true, 'Full name.', `class="${i === 1 ? 'p1-auto' : ''}"`)}
          ${field(`p${i}_phone`, 'Phone Number', 'tel', true, 'Active phone number.', `autocomplete="tel" class="${i === 1 ? 'p1-auto' : ''}"`)}
        </div>
        <div class="grid-2">
          ${field(`p${i}_email`, 'Email', 'email', true, 'Email address.', `autocomplete="email" class="${i === 1 ? 'p1-auto' : ''}"`)}
          ${field(`p${i}_age`, 'Age', 'number', true, 'Age.', 'min="16" max="100" inputmode="numeric"')}
        </div>
      </div>`;
  }

  function renderDetails() {
    const tk = CFG.tickets[sel.ticketType];
    if (sel.ticketType === 'group') {
      let html = purchaserBlock() + participantBlock(1);
      for (let i = 2; i <= 5; i++) html += participantBlock(i);
      detailsHost.innerHTML = html;
      const cb = $('input[name="purchaserIsParticipant"]', detailsHost);
      if (cb) {
        cb.addEventListener('change', () => applyPurchaserAsP1(cb.checked));
      }
    } else {
      detailsHost.innerHTML = individualBlock();
    }
    bindLiveValidation(detailsHost);
  }

  function applyPurchaserAsP1(on) {
    const wrap = detailsHost.querySelector('.participant-wrap-1');
    if (!wrap) return;
    wrap.classList.toggle('is-linked', on);
    $$('.p1-auto', wrap).forEach((f) => (f.disabled = on));
    let note = wrap.querySelector('.linked-note');
    if (on && !note) {
      note = document.createElement('p');
      note.className = 'linked-note form-note';
      note.style.marginTop = '1rem';
      note.innerHTML = '<span>You will be registered as <strong>Participant 1</strong> using the purchaser details above. Enter your age below.</span>';
      wrap.insertBefore(note, wrap.firstChild);
    }
    if (!on && note) note.remove();
  }

  function collectDetails() {
    const d = {};
    d.purchaser = {
      fullName: v('purchase_fullName'),
      phone: v('purchase_phone'),
      email: v('purchase_email').toLowerCase(),
      business: v('purchase_business'),
      address: v('purchase_address'),
    };
    const linked = $('input[name="purchaserIsParticipant"]', detailsHost)?.checked;

    if (sel.ticketType === 'group') {
      const participants = [];
      for (let i = 1; i <= 5; i++) {
        if (i === 1 && linked) {
          participants.push({
            fullName: d.purchaser.fullName,
            phone: d.purchaser.phone,
            email: d.purchaser.email,
            age: v('p1_age'),
          });
        } else {
          participants.push({
            fullName: v(`p${i}_fullName`),
            phone: v(`p${i}_phone`),
            email: v(`p${i}_email`).toLowerCase(),
            age: v(`p${i}_age`),
          });
        }
      }
      d.participants = participants;
    } else {
      d.participants = [
        {
          fullName: d.purchaser.fullName,
          phone: d.purchaser.phone,
          email: d.purchaser.email,
          age: v('purchase_age'),
        },
      ];
    }
    return d;
  }

  function v(name) {
    return String((detailsHost.querySelector(`[name="${name}"]`) || { value: '' }).value || '').trim();
  }

  /* ---------------- STEP 4 · Payment ---------------- */

  function summaryBlock() {
    const tk = CFG.tickets[sel.ticketType];
    return `
      <div class="summary">
        <div>
          <p class="summary__label">${tk.label} · ${tk.note}${sel.ticketType === 'group' ? ' · ' + tk.perPerson : ''}</p>
        </div>
        <div class="summary__amount">${CFG.tickets.format(tk.price)}</div>
      </div>`;
  }

  function renderPayment() {
    const tk = CFG.tickets[sel.ticketType];

    if (sel.method === 'online') {
      paymentHost.innerHTML = `
        ${summaryBlock()}
        <p class="lede">Submit your registration, then complete payment securely on the UDUF Africa Selar store.</p>
        <div class="actions-row" style="justify-content:flex-start;margin-top:1.8rem">
          <button class="btn" type="button" id="btn-online-submit">
            <span>Continue to Selar</span>
            <span class="btn__arrow"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </button>
          <button class="btn btn--ghost" type="button" data-back>Back</button>
        </div>`;
      $('[data-back]', paymentHost).addEventListener('click', () => go('details'));
      $('#btn-online-submit', paymentHost).addEventListener('click', submitOnline);
      return;
    }

    const bank = CFG.payment.bank;
    const amount = CFG.tickets.format(tk.price);
    paymentHost.innerHTML = `
      ${summaryBlock()}

      <div class="bank-card">
        <div class="bank-card__title">Make a direct bank transfer of <strong>${amount}</strong></div>
        <dl class="bank-card__rows">
          <div class="bank-card__row"><dt>Account Name</dt><dd>${U.escapeHtml(bank.accountName)}</dd></div>
          <div class="bank-card__row"><dt>Bank</dt><dd>${U.escapeHtml(bank.bank)}</dd></div>
          <div class="bank-card__row">
            <dt>Account Number</dt>
            <dd class="bank-card__acct">
              <span>${bank.accountNumber}</span>
              <button type="button" class="btn btn--sm btn--ghost" data-copy>Copy</button>
            </dd>
          </div>
        </dl>
        <p class="form-note" style="margin:.9rem 0 0">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5L21.5 20h-19L12 3.5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 9.5v4.2M12 16.6v.1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
          <span>Transfer the exact amount: <strong>${amount}</strong>. Your payment will be verified by our team before your ticket is issued.</span>
        </p>
      </div>

      <div class="upload" id="receipt-upload">
        <input type="file" id="receipt-file" accept="image/jpeg,image/png,application/pdf,.pdf" hidden>
        <button type="button" class="upload__drop" data-pick>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
          <span><b>Upload payment receipt</b> (JPG, PNG or PDF, up to 20 MB)</span>
        </button>
        <div class="upload__preview" data-preview hidden>
          <img alt="Receipt preview" data-img>
          <p class="upload__file" data-file hidden></p>
          <button type="button" class="btn btn--sm btn--ghost" data-remove>Remove</button>
        </div>
        <p class="upload__hint" data-upload-state>No receipt added yet — required for verification.</p>
      </div>

      <div class="wa-row">
        <button type="button" class="btn btn--ghost" data-whatsapp>
          <svg class="fa" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a9.9 9.9 0 00-8.5 15L2 22l5.1-1.4A10 10 0 1012 2zm5.7 14.2c-.25.7-1.45 1.35-2 1.4-.55.07-1.05.32-3.55-.73-3-1.27-4.9-4.55-5.05-4.77-.15-.2-1.2-1.6-1.2-3.05 0-1.45.75-2.15 1.05-2.45.28-.3.6-.37.8-.37.2 0 .4 0 .6.03.2 0 .45-.07.7.55.25.62.85 2.12.92 2.28.07.15.12.33.02.53-.1.2-.15.32-.3.5-.15.17-.32.4-.45.53-.15.15-.3.32-.13.63.17.3.78 1.27 1.67 2.05 1.14 1 2.1 1.32 2.4 1.47.3.15.48.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.68-.15.27.1 1.73.82 2.02.97.3.15.5.22.57.35.08.13.08.75-.17 1.45z"/></svg>
          Send receipt via WhatsApp
        </button>
        <p class="upload__hint">Optional — you can also send your receipt through WhatsApp. Admin verification is still required either way.</p>
      </div>

      <div class="actions-row" style="justify-content:flex-start;margin-top:1.6rem">
        <button class="btn" type="button" id="btn-manual-submit">
          <span>Submit for Verification</span>
          <span class="btn__arrow"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </button>
        <button class="btn btn--ghost" type="button" data-back>Back</button>
      </div>`;

    const host = paymentHost;
    $('[data-back]', host).addEventListener('click', () => go('details'));
    $('[data-copy]', host).addEventListener('click', copyAccount);
    $('[data-pick]', host).addEventListener('click', () => $('#receipt-file', host).click());
    $('#receipt-file', host).addEventListener('change', (e) => pickReceipt(e, host));
    $('[data-remove]', host).addEventListener('click', () => clearReceipt(host));
    $('[data-whatsapp]', host).addEventListener('click', () => sendViaWhatsApp());
    $('#btn-manual-submit', host).addEventListener('click', submitManual);
  }

  function copyAccount() {
    const acc = CFG.payment.bank.accountNumber;
    const done = () => U.toast('Account number copied.', 'ok');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(acc).then(done).catch(() => fallbackCopy(acc, done));
    } else {
      fallbackCopy(acc, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      done();
    } catch {
      U.toast('Could not copy. The account number is ' + text, 'error');
    }
    ta.remove();
  }

  /* ---------------- Receipt upload (Cloudinary) ----------------
     Receipt files go to the organisation's existing Cloudinary
     account. Only the returned secure URL is saved to Firestore
     (receiptUrl), so documents stay small and PDFs work too. */

  const receiptState = { file: null, name: null, url: null };

  const RECEIPT_KINDS = {
    'image/jpeg': 'image',
    'image/jpg': 'image',
    'image/png': 'image',
    'image/pdf': 'pdf',
    'application/pdf': 'pdf',
  };

  function receiptKind(file) {
    const kind = RECEIPT_KINDS[file.type];
    if (kind) return kind;
    const name = String(file.name || '').toLowerCase();
    if (/\.pdf$/.test(name)) return 'pdf';
    if (/\.(jpe?g|png)$/.test(name)) return 'image';
    return null;
  }

  function validateReceiptFile(file) {
    if (!file) return 'Please choose a receipt file.';
    if (!receiptKind(file)) return 'Receipts must be JPG, PNG or PDF files.';
    const max = (CFG.payment.cloudinary && CFG.payment.cloudinary.maxBytes) || 20 * 1024 * 1024;
    if (file.size > max) {
      return `That file is too big — receipts must be ${Math.round(max / 1024 / 1024)} MB or smaller.`;
    }
    return '';
  }

  function uploadToCloudinary(file) {
    const cfg = CFG.payment.cloudinary;
    if (!cfg || !cfg.cloudName || !cfg.uploadPreset) {
      return Promise.reject(new Error('Cloudinary upload is not configured on this site.'));
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', cfg.uploadPreset);
    return fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloudName)}/auto/upload`, {
      method: 'POST',
      body: fd,
    })
      .then((res) => res.json().catch(() => null))
      .then((data) => {
        if (!data || data.error || !(data.secure_url || data.url)) {
          const msg = (data && data.error && data.error.message) || 'The upload service rejected this file.';
          throw new Error(msg);
        }
        return data.secure_url || data.url;
      });
  }

  function pickReceipt(e, host) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const error = validateReceiptFile(file);
    if (error) {
      U.toast(error, 'error');
      e.target.value = '';
      return;
    }

    receiptState.file = file;
    receiptState.name = file.name;
    const kind = receiptKind(file);

    const preview = $('[data-preview]', host);
    const img = $('[data-img]', host);
    const fileChip = $('[data-file]', host);
    const drop = $('[data-pick]', host);
    const state = $('[data-upload-state]', host);

    drop.hidden = true;
    preview.hidden = false;

    if (kind === 'pdf') {
      if (img) {
        img.hidden = true;
        if (img.src && img.src.indexOf('blob:') === 0) URL.revokeObjectURL(img.src);
        img.removeAttribute('src');
      }
      if (fileChip) {
        fileChip.hidden = false;
        fileChip.textContent = `PDF receipt: ${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
      }
    } else {
      if (fileChip) fileChip.hidden = true;
      if (img) {
        img.hidden = false;
        img.src = URL.createObjectURL(file);
      }
    }

    if (state) state.textContent = `Receipt selected: ${file.name} — it will be uploaded when you submit.`;
    U.toast('Receipt selected.', 'ok');
  }

  function clearReceipt(host) {
    receiptState.file = null;
    receiptState.name = null;
    receiptState.url = null;

    const preview = $('[data-preview]', host);
    const img = preview ? $('[data-img]', preview) : null;
    const fileChip = preview ? $('[data-file]', preview) : null;
    const drop = $('[data-pick]', host);
    const state = $('[data-upload-state]', host);
    const input = $('#receipt-file', host);

    if (preview) preview.hidden = true;
    if (drop) drop.hidden = false;
    if (img) {
      img.hidden = false;
      if (img.src && img.src.indexOf('blob:') === 0) URL.revokeObjectURL(img.src);
      img.removeAttribute('src');
    }
    if (fileChip) {
      fileChip.hidden = true;
      fileChip.textContent = '';
    }
    if (state) state.textContent = 'No receipt added yet — required for verification.';
    if (input) input.value = '';
  }

  function sendViaWhatsApp() {
    const num = CFG.payment && CFG.payment.whatsappVerifyNumber;
    if (!num) {
      U.toast('The WhatsApp verification number has not been configured yet. Upload your receipt here instead.', 'error');
      return;
    }
    const tk = CFG.tickets[sel.ticketType];
    const name = String(detailsHost.querySelector('[name="purchase_fullName"]')?.value || '').trim();
    const ref = sel.refId || 'PENDING';
    const msg = [
      'Hello UDUF Africa! I have registered for the 2027 Active Leadership & Entrepreneurship Bootcamp.',
      `Name: ${name}`,
      `Ticket: ${tk.label}`,
      `Amount: ${CFG.tickets.format(tk.price)}`,
      `Registration ID: ${ref}`,
      'I have attached my payment receipt for verification.',
    ].join('\n');
    window.open(`https://wa.me/${num.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  }

  /* ---------------- Submit ---------------- */

  function setBusy(btn, busy, label) {
    if (!btn) return;
    const span = $('[data-label]', btn) || $('span:not(.btn__arrow)', btn);
    if (busy) {
      btn.disabled = true;
      btn.classList.add('is-loading');
      if (span) span.textContent = label || 'Saving…';
    } else {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      if (span) span.textContent = label || 'Submit for Verification';
    }
  }

  function buildPayload(paymentStatus, receiptUrl, receiptName) {
    const d = collectDetails();
    const tk = CFG.tickets[sel.ticketType];
    const submittedAt = new Date().toISOString();
    return {
      ticketType: sel.ticketType,
      ticketLabel: tk.label,
      amount: tk.price,
      paymentMethod: sel.method,
      paymentStatus,
      status: 'pending',
      purchaser: d.purchaser,
      participants: d.participants,
      receiptUrl: receiptUrl || null,
      receiptName: receiptName || null,
      amountPaid: tk.price,
      paymentDate: submittedAt.slice(0, 10),
      paymentSubmittedAt: submittedAt,
      whatsapp: { sent: false, at: null },
    };
  }

  async function submitManual() {
    const btn = $('#btn-manual-submit', paymentHost);
    if (!receiptState.file) {
      U.toast('Please choose your payment receipt before submitting.', 'error');
      return;
    }

    setBusy(btn, true, 'Uploading receipt…');
    let receiptUrl = null;
    try {
      receiptUrl = await uploadToCloudinary(receiptState.file);
    } catch (err) {
      U.toast((err && err.message) || 'Receipt upload failed. Please try again.', 'error');
      setBusy(btn, false, 'Submit for Verification');
      return;
    }

    setBusy(btn, true, 'Saving registration…');
    try {
      const res = await Fire.createRegistration(buildPayload('awaiting_verification', receiptUrl, receiptState.name));
      if (!res.ok) throw new Error(res.message || 'Could not save your registration.');
      sel.refId = res.refId;
      sel.registration = res.record;
      if (res.record && res.record.ticketStatus === 'generated') {
        renderConfirmed(res.record);
      } else {
        renderPending(res.record || { refId: res.refId, paymentStatus: 'awaiting_verification' });
      }
    } catch (err) {
      U.toast(err.message || 'Something went wrong. Please try again.', 'error');
      setBusy(btn, false, 'Submit for Verification');
    }
  }

  async function submitOnline() {
    const btn = $('#btn-online-submit', paymentHost);
    setBusy(btn, true, 'Saving registration…');
    try {
      const res = await Fire.createRegistration(buildPayload('pending_payment'));
      if (!res.ok) throw new Error(res.message || 'Could not save your registration.');
      sel.refId = res.refId;
      sel.registration = res.record;
      if (res.record && res.record.ticketStatus === 'generated') {
        renderConfirmed(res.record);
      } else {
        renderSelar(res.record || { refId: res.refId });
      }
    } catch (err) {
      U.toast(err.message || 'Something went wrong. Please try again.', 'error');
      setBusy(btn, false);
    }
  }

  function renderSelar(reg) {
    const tk = CFG.tickets[sel.ticketType];
    selarHost.innerHTML = `
      <div class="summary">
        <div><p class="summary__label">${tk.label} · Amount due</p></div>
        <div class="summary__amount">${CFG.tickets.format(tk.price)}</div>
      </div>
      <p class="lede">Your registration has been saved. Complete payment now on the official UDUF Africa Selar store.</p>
      <div class="actions-row" style="justify-content:flex-start;margin-top:1.8rem">
        <a class="btn" href="${U.escapeHtml(CFG.payment.selarStore)}" target="_blank" rel="noopener">
          Open Selar Store
          <span class="btn__arrow"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </a>
      </div>
      <p class="form-note" style="margin-top:1.4rem">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v5M12 7.8v.1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
        <span>After paying on Selar, come back and click below so our team can verify your payment.</span>
      </p>
      <div class="ref-id">
        <span class="ref-id__label">Registration ID</span>
        <span class="ref-id__value">${U.escapeHtml(reg.refId)}</span>
        <button class="btn btn--sm btn--ghost" type="button" data-copy-reference>Copy</button>
      </div>
      <div class="actions-row" style="justify-content:flex-start;margin-top:1.4rem">
        <button class="btn" type="button" id="btn-selar-done"><span>I have completed payment on Selar</span></button>
      </div>`;

    const host = selarHost;
    $('[data-copy-reference]', host).addEventListener('click', () => copyRefId(reg.refId));
    $('#btn-selar-done', host).addEventListener('click', async (e) => {
      const el = e.currentTarget;
      setBusy(el, true, 'Submitting for verification…');
      const res = await Fire.updateRegistration(reg.refId, { paymentStatus: 'awaiting_verification' });
      if (!res.ok) {
        U.toast(res.message || 'Could not update your registration.', 'error');
        setBusy(el, false, 'I have completed payment on Selar');
        return;
      }
      renderPending({ refId: reg.refId, paymentStatus: 'awaiting_verification' });
    });

    go('selar');
  }

  function copyRefId(refId) {
    const done = () => U.toast('Registration ID copied.', 'ok');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(refId).then(done).catch(() => U.toast('Registration ID: ' + refId, 'info'));
    } else {
      U.toast('Registration ID: ' + refId, 'info');
    }
  }

  /* ---------------- Result states ---------------- */

  function resultShell(kind, eyebrow, title, lede, inner) {
    return `
      <div class="result__head">
        <p class="result__eyebrow">${U.escapeHtml(eyebrow)}</p>
        <h2 class="result__title">${U.escapeHtml(title)}</h2>
        ${lede ? `<p class="result__lede">${U.escapeHtml(lede)}</p>` : ''}
      </div>
      <div class="result__body">${inner || ''}</div>`;
  }

  function renderPending(reg) {
    form.hidden = true;
    result.hidden = false;
    result.className = 'result result--used';
    const refId = reg.refId || sel.refId || '';
    result.innerHTML = resultShell(
      'pending',
      'Payment pending verification',
      'PAYMENT PENDING VERIFICATION',
      'Your payment information has been submitted successfully.',
      `
        <p class="result__lede" style="max-width:none">Our team will review your payment and confirm your registration. Once your payment is verified, your ticket will become available on this page.</p>
        ${!Fire || !Fire.isLive()
          ? '<p class="form-note" style="margin-top:1.2rem"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v5M12 7.8v.1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg><span>Demo mode: registrations are saved in this browser only. Connect Firebase (see README) for real, approved tickets.</span></p>'
          : ''}
        <div class="ref-id" style="margin-top:1.2rem">
          <span class="ref-id__label">Your registration ID</span>
          <span class="ref-id__value">${U.escapeHtml(refId)}</span>
          <button class="btn btn--sm btn--ghost" type="button" data-copy-reference>Copy</button>
        </div>
        <p class="result__lede" style="margin-top:1.2rem">Keep this ID handy — you can check your status any time.</p>
        <div class="actions-row" style="justify-content:flex-start;margin-top:1.4rem">
          <a class="btn" href="verify.html?ref=${encodeURIComponent(refId)}">
            Check my status
            <span class="btn__arrow"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
        </div>`
    );
    const btn = $('[data-copy-reference]', result);
    if (btn) btn.addEventListener('click', () => copyRefId(refId));
    if (result.scrollIntoView) result.scrollIntoView({ behavior: U.reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function renderConfirmed(reg) {
    form.hidden = true;
    result.hidden = false;
    result.className = 'result result--valid';

    const passes = (reg.participants && reg.participants.length ? reg.participants : [{ fullName: (reg.purchaser && reg.purchaser.fullName) || '', ticketCode: reg.ticketCode }])
      .map((p) => {
        const ticket = {
          code: p.ticketCode || reg.ticketCode,
          fullName: p.fullName,
          ticketType: reg.ticketLabel,
        };
        return `<div data-pass></div>`;
      })
      .join('<div class="pass-gap"></div>');

    result.innerHTML = resultShell(
      'valid',
      'Registration confirmed',
      'REGISTRATION CONFIRMED',
      'Your registration for the 2027 Active Leadership & Entrepreneurship Bootcamp has been confirmed. Your ticket is ready.',
      `
        <div data-passes>${passes}</div>
        <div class="pass__foot" style="padding:1.2rem 0 0">
          <button class="btn btn--sm" type="button" data-print>Download / Print Ticket</button>
          <a class="btn btn--sm btn--ghost" href="verify.html?ref=${encodeURIComponent(reg.refId)}">Verify tickets</a>
        </div>
        <div class="whatsapp-cta">
          <p class="whatsapp-cta__label">Join the official community</p>
          <a class="btn" href="${U.escapeHtml(CFG.payment.whatsappGroup)}" target="_blank" rel="noopener">
            JOIN THE WHATSAPP GROUP
            <span class="btn__arrow"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
          <p class="whatsapp-cta__note">For paid, verified attendees.</p>
        </div>`
    );

    const passesHost = $('[data-passes]', result);
    $$('[data-pass]', passesHost).forEach((host, i) => {
      const p = reg.participants && reg.participants[i];
      U.renderPass(host, {
        code: (p && p.ticketCode) || reg.ticketCode,
        fullName: (p && p.fullName) || (reg.purchaser && reg.purchaser.fullName) || '',
        ticketType: reg.ticketLabel,
      });
    });

    const printBtn = $('[data-print]', result);
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    if (result.scrollIntoView) result.scrollIntoView({ behavior: U.reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------------- Wizard wiring ---------------- */

  function validateTicket() {
    const chosen = $('input[name="ticketType"]:checked', form);
    if (!chosen) {
      U.toast('Please choose a ticket to continue.', 'error');
      return false;
    }
    sel.ticketType = chosen.value;
    return true;
  }

  function validateMethod() {
    const chosen = $('input[name="paymentMethod"]:checked', form);
    if (!chosen) {
      U.toast('Please choose a payment method.', 'error');
      return false;
    }
    sel.method = chosen.value;
    return true;
  }

  function gotoDetails() {
    if (!validateMethod()) return;
    renderDetails();
    go('details');
  }

  function gotoPayment() {
    if (!validateContext(detailsHost)) {
      U.toast('Please correct the highlighted fields.', 'error');
      return;
    }
    renderPayment();
    go('payment');
  }

  form.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go],[data-back]');
    if (!t) return;
    e.preventDefault();
    const target = t.getAttribute('data-go');
    if (target === 'method') {
      if (!validateTicket()) return;
      go('method');
      return;
    }
    if (target === 'details') return gotoDetails();
    if (target === 'payment') return gotoPayment();
    if (t.hasAttribute('data-back')) {
      const step = $('[data-step]:not([hidden])', form);
      const name = step ? step.getAttribute('data-step') : 'ticket';
      const backMap = { details: 'method', payment: 'details', selar: 'payment' };
      go(backMap[name] || 'ticket');
    }
  });

  $$('input[name="ticketType"]', form).forEach((r) => r.addEventListener('change', () => (sel.ticketType = r.value)));
  $$('input[name="paymentMethod"]', form).forEach((r) => r.addEventListener('change', () => (sel.method = r.value)));

  /* Start at the ticket picker (never the bare form). */
  sel.registration = null;
  go('ticket');
})();