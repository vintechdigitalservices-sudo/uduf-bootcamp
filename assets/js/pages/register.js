/* =========================================================
   UDUF AFRICA — Register page

   Submitting does the whole job in one pass:
     validate -> reserve a unique code -> store the record ->
     render the ticket + QR -> offer the PDF

   There is no payment step. A ticket is issued the moment the form
   is completed, and the record is stored with paymentStatus
   "pending". If DATA.endpoints.checkout is ever set, that call is
   made first and the record is then marked confirmed — the rest of
   the flow is identical either way.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  var form = null;
  var resultHost = null;
  var wrapHost = null;
  var lastRecord = null;

  /* ---------- Price panel ----------
     Reads the featured tier from config, so the badge and the
     selection cards can never drift apart. */
  function priceMarkup() {
    var cfg = Uduf.config;
    var ticket = cfg.TICKETS.filter(function (t) { return t.featured; })[0] || cfg.TICKETS[0];
    if (!ticket) return '';
    return '' +
      '<div class="price">' +
        '<p class="price__k">' + U.esc(ticket.name) + ' Ticket</p>' +
        '<p class="price__v">' + U.money(ticket.price) + '<small>per person</small></p>' +
      '</div>';
  }

  /* ---------- Sidebar ---------- */
  function sideMarkup() {
    var e = Uduf.config.EVENT;

    var blocks = [
      {
        title: 'What&rsquo;s included',
        items: [
          'Both full days, all sessions',
          'Panels, Q&amp;A and practical exercises',
          'Your 30/60/90-day action plan',
          'Printable and downloadable ticket'
        ]
      },
      {
        title: 'Your ticket',
        items: [
          'Unique code, e.g. ' + e.ticketPrefix + '-9X2K7P',
          'Scannable QR code',
          'Issued the moment you finish'
        ]
      }
    ];

    var help = blocks.map(function (b) {
      return '' +
        '<div class="aside__block">' +
          '<h3>' + b.title + '</h3>' +
          '<ul>' + b.items.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
        '</div>';
    }).join('');

    var contact = '' +
      '<div class="aside__block">' +
        '<h3>Need help?</h3>' +
        '<ul>' +
          '<li><a class="hl" href="mailto:' + e.email + '">' + U.esc(e.email) + '</a></li>' +
          e.phones.map(function (p) {
            return '<li><a class="hl" href="tel:' + p.replace(/[^\d]/g, '') + '">' + U.esc(p) + '</a></li>';
          }).join('') +
        '</ul>' +
      '</div>';

    return help + contact;
  }

  function decorateFacts() {
    var e = Uduf.config.EVENT;
    var map = {
      dates: ['calendar', e.dates],
      venue: ['pin', e.venue],
      seats: ['users', e.capacity]
    };
    Object.keys(map).forEach(function (key) {
      var node = U.qs('[data-fact="' + key + '"]');
      if (!node) return;
      node.innerHTML = Uduf.icons.icon(map[key][0], 'icon') + '<span>' + U.esc(map[key][1]) + '</span>';
    });
  }

  /* ---------- Payment ----------
     Only reached when a real checkout endpoint is configured. */
  function takePayment(record) {
    var endpoint = Uduf.config.DATA.endpoints.checkout;

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

  function checkoutConfigured() {
    return !!(Uduf.config.DATA.endpoints && Uduf.config.DATA.endpoints.checkout);
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
            ? 'Payment confirmed. Your ticket is ready.'
            : 'Your ticket is ready \u2014 it was issued the moment you finished.') +
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
        /* No checkout configured: the ticket is issued immediately. */
        if (!checkoutConfigured()) return null;
        return takePayment(record)
          .then(function (pay) {
            return Uduf.db.markConfirmed(record.ticketCode, pay.ref);
          });
      })
      .then(function (confirmed) {
        if (confirmed) lastRecord = confirmed;
        /* The form has done its job — take it out of the page. */
        var section = form && form.host && form.host.closest('section');
        if (section) section.style.display = 'none';
        showConfirmation(lastRecord, !!confirmed);
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

      var price = U.qs('[data-reg-price]');
      if (price) price.innerHTML = priceMarkup();

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
