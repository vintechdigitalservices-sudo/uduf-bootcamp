/* =========================================================
   UDUF AFRICA — Register page

   CONTINUE does the whole job in one pass:
     validate -> reserve a unique code -> take payment ->
     store the record -> render the ticket + QR -> offer the PDF

   Payment is a sandbox until DATA.endpoints.checkout is set.
   In sandbox mode the ticket is marked paid locally so the
   flow, the ticket and the verification page can all be
   exercised end to end. That is a demo affordance, not a
   payment method — never ship it as one.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  var form = null;
  var resultHost = null;
  var wrapHost = null;
  var lastRecord = null;

  /* ---------- Sidebar ---------- */
  function sideMarkup() {
    var e = Uduf.config.EVENT;
    var included = [
      'Both full days, all sessions',
      'Panels, Q&amp;A and practical exercises',
      'Your 30/60/90-day action plan',
      'Printable and downloadable ticket'
    ];
    return '' +
      '<div class="jstage" style="border-top-width:2px">' +
        '<h2 class="jstage__title" style="font-size:var(--t-lg)">What&rsquo;s included</h2>' +
        '<ul class="jstage__list">' +
          included.map(function (t) { return '<li>' + t + '</li>'; }).join('') +
        '</ul>' +
      '</div>' +
      '<div class="jstage" style="border-top-color:var(--green)">' +
        '<h2 class="jstage__title" style="font-size:var(--t-lg)">Your ticket</h2>' +
        '<ul class="jstage__list">' +
          '<li>Unique code, e.g. ' + Uduf.config.EVENT.ticketPrefix + '-7K9P2X</li>' +
          '<li>Scannable QR code</li>' +
          '<li>Issued the moment you finish</li>' +
        '</ul>' +
      '</div>' +
      '<div class="jstage" style="border-top-color:var(--orange)">' +
        '<h2 class="jstage__title" style="font-size:var(--t-lg)">Need help?</h2>' +
        '<ul class="jstage__list">' +
          '<li><a class="hl" href="mailto:' + e.email + '">' + U.esc(e.email) + '</a></li>' +
          e.phones.map(function (p) {
            return '<li><a class="hl" href="tel:' + p.replace(/[^\d]/g, '') + '">' + U.esc(p) + '</a></li>';
          }).join('') +
        '</ul>' +
      '</div>';
  }

  function decorateFacts() {
    var e = Uduf.config.EVENT;
    var map = {
      dates: ['calendar', e.dates],
      venue: ['pin', e.venue],
      seats: ['users', '100\u2013150 places']
    };
    Object.keys(map).forEach(function (key) {
      var node = U.qs('[data-fact="' + key + '"]');
      if (!node) return;
      node.innerHTML = Uduf.icons.icon(map[key][0], 'icon') + '<span>' + U.esc(map[key][1]) + '</span>';
    });
  }

  /* ---------- Payment ---------- */
  function takePayment(record) {
    var endpoint = Uduf.config.DATA.endpoints.checkout;

    if (endpoint) {
      return global.fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketCode: record.ticketCode, email: record.email })
      }).then(function (res) {
        if (!res.ok) throw new Error('Checkout failed (' + res.status + ')');
        return res.json();
      }).then(function (data) {
        return { ref: data.reference || data.ref || record.ticketCode, live: true };
      });
    }

    /* Sandbox: a short honest delay, then a clearly-marked reference. */
    return U.sleep(650).then(function () {
      return { ref: 'SANDBOX-' + record.ticketCode, live: false };
    });
  }

  /* ---------- Confirmation ---------- */
  function showConfirmation(record, live) {
    wrapHost.style.display = '';

    var banner =
      '<div class="confirm__banner">' +
        Uduf.icons.icon('checkCircle', 'icon') +
        '<span class="confirm__bannertxt">' +
          '<strong>You&rsquo;re registered</strong>' +
          '<span>' + (live
            ? 'Payment received. Your ticket is ready.'
            : 'Sandbox payment \u2014 no money was taken. Your ticket is ready.') +
          '</span>' +
        '</span>' +
      '</div>';

    resultHost.innerHTML = '<div class="confirm">' + banner + '</div>';
    resultHost.classList.add('pop');

    var ticket = Uduf.Ticket.render(record, {
      actions: true,
      onDownload: function () { download(record); }
    });
    resultHost.appendChild(ticket);

    var again = Uduf.Button.create({
      label: 'Register someone else',
      variant: 'ghost',
      onClick: function () { global.location.reload(); }
    });
    var wrapAgain = U.el('div', { style: { display: 'flex', gap: '.5rem', flexWrap: 'wrap' } });
    wrapAgain.appendChild(again);
    wrapAgain.appendChild(Uduf.Button.create({
      label: 'Verify this ticket',
      variant: 'ghost',
      href: 'verify.html?code=' + encodeURIComponent(record.ticketCode)
    }));
    resultHost.querySelector('.confirm').appendChild(wrapAgain);

    resultHost.scrollIntoView({
      block: 'start',
      behavior: U.prefersReducedMotion() ? 'auto' : 'smooth'
    });
  }

  function download(record) {
    try {
      Uduf.Ticket.downloadPDF(record);
      Uduf.notify.ok('Ticket PDF downloaded.');
    } catch (e) {
      Uduf.notify.error('Could not build the PDF. Try printing instead.');
    }
  }

  /* ---------- Submit ---------- */
  function onValid(payload, refs) {
    Uduf.buttonLoading.set(refs.submit, true, 'Processing\u2026');
    if (resultHost) resultHost.innerHTML = '';

    Uduf.db.createRegistration(payload)
      .then(function (record) {
        lastRecord = record;
        return takePayment(record);
      })
      .then(function (pay) {
        return Uduf.db.markPaid(lastRecord.ticketCode, pay.ref).then(function (paid) {
          lastRecord = paid;
          return pay;
        });
      })
      .then(function (pay) {
        /* The form has done its job — take it out of the page. */
        var section = form && form.host && form.host.closest('section');
        if (section) section.style.display = 'none';
        showConfirmation(lastRecord, pay.live);
        Uduf.notify.ok('Ticket ' + lastRecord.ticketCode + ' issued.');
      })
      .catch(function (err) {
        if (global.console) console.error('[UDUF] registration failed:', err);
        Uduf.buttonLoading.set(refs.submit, false);
        Uduf.notify.error('Registration failed. Please try again.');
      });
  }

  /* ---------- Restore from ?code= ---------- */
  function restore() {
    var m = /[?&]code=([^&]+)/.exec(global.location.search);
    if (!m) return Promise.resolve(false);
    var code = U.normaliseTicketCode(decodeURIComponent(m[1]));
    if (!U.RULES.ticketCode(code)) return Promise.resolve(false);

    var section = U.qs('[data-reg-host]').closest('section');
    if (section) section.style.display = 'none';

    return Uduf.db.findByCode(code).then(function (r) {
      if (!r) {
        if (section) section.style.display = '';
        Uduf.notify.error('We could not find ticket ' + code + '.');
        return false;
      }
      showConfirmation(r, true);
      return true;
    });
  }

  Uduf.pages = Uduf.pages || {};

  Uduf.pages.register = {
    init: function () {
      decorateFacts();

      var side = U.qs('[data-reg-side]');
      if (side) side.innerHTML = sideMarkup();

      form = Uduf.RegistrationForm.init('[data-reg-host]');
      resultHost = U.qs('[data-reg-confirm]');
      wrapHost = U.qs('[data-reg-confirm-wrap]');

      this.onValid = onValid;
    },

    afterMount: function () {
      restore();
    },

    onValid: onValid
  };
})(window);
