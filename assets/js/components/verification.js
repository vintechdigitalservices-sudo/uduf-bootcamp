/* =========================================================
   UDUF AFRICA — VerificationForm + VerificationResult

   Built for the event entrance: a staff member types or scans
   a code, sees an answer immediately, and can check the
   attendee in with one tap. No navigation, no extra clicks.

   States:
     valid   → VALID TICKET, details, CHECK IN
     already → ALREADY CHECKED IN, with the original time
     unpaid  → registration found but not paid
     invalid → INVALID TICKET
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  /* ---------- VerificationForm ---------- */
  function formMarkup() {
    return '' +
      '<form class="vform" data-vform novalidate>' +
        '<div class="vinput" data-vinput>' +
          '<label class="sr-only" for="v-code">Ticket code</label>' +
          '<input class="input" id="v-code" name="code" type="text" inputmode="latin"' +
            ' autocomplete="off" autocapitalize="characters" spellcheck="false"' +
            ' maxlength="14" placeholder="UDUF-XXXXXX" data-vcode>' +
          '<span class="vinput__hint" data-vhint aria-hidden="true">UDUF-XXXXXX</span>' +
        '</div>' +
        '<button class="btn btn--lg btn--block" type="submit" data-vsubmit>' +
          'Verify' + Uduf.icons.icon('search', 'icon') +
        '</button>' +
      '</form>';
  }

  function initForm(selector) {
    var host = typeof selector === 'string' ? U.qs(selector) : selector;
    if (!host) return null;
    host.innerHTML = formMarkup();

    var form = U.qs('[data-vform]', host);
    var input = U.qs('[data-vcode]', host);
    var wrap = U.qs('[data-vinput]', host);
    var submit = U.qs('[data-vsubmit]', host);

    /* Keep the caret in the middle of the prefix while typing so the
       code always reads as UDUF-XXXXXX. */
    U.on(input, 'input', function () {
      var raw = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      var hadPrefix = /UDUF/.test(input.value.toUpperCase().replace(/[^A-Z]/g, ''));
      var body = hadPrefix ? raw.replace(/^UDUF/, '') : raw;
      body = body.slice(0, 6);
      input.value = body ? Uduf.util.normaliseTicketCode(body) : '';
      wrap.classList.toggle('has-value', !!input.value);
    });

    U.on(form, 'submit', function (e) {
      e.preventDefault();
      var code = U.normaliseTicketCode(input.value);
      if (!code || !U.RULES.ticketCode(code)) {
        Uduf.notify.error('Enter a ticket code like UDUF-7K9P2X.');
        input.focus();
        return;
      }
      if (Uduf.pages.verify && Uduf.pages.verify.lookup) {
        Uduf.pages.verify.lookup(code, { input: input, submit: submit, host: host });
      }
    });

    return { host: host, form: form, input: input, submit: submit };
  }

  /* ---------- VerificationResult ---------- */
  function row(k, v, mod) {
    return '<div class="vrow"><span class="vrow__k">' + U.esc(k) + '</span>' +
           '<span class="vrow__v' + (mod ? ' ' + mod : '') + '">' + U.esc(v) + '</span></div>';
  }

  function validCard(r) {
    var rows =
      row('Name', r.fullName) +
      row('Business', r.business) +
      row('Ticket Type', r.ticketLabel || r.ticketType) +
      row('Ticket Code', r.ticketCode, 'vrow__v--code') +
      row('Registration', r.paymentStatus === 'paid' ? 'Confirmed' : r.paymentStatus);

    var already = !!r.checkedIn;

    return '' +
      '<div class="vcard vcard--' + (already ? 'pending' : 'valid') + '" role="status">' +
        '<div class="vcard__head">' +
          Uduf.icons.icon(already ? 'checkCircle' : 'check', 'icon') +
          '<strong>' + (already ? 'Already checked in' : 'Valid ticket') + '</strong>' +
        '</div>' +
        '<div class="vcard__body">' +
          rows +
          (already && r.checkedInAt
            ? '<p class="vcard__stamp">' + Uduf.icons.icon('clock', 'icon') +
              'Checked in ' + U.esc(U.formatDateTime(r.checkedInAt)) + '</p>'
            : '') +
        '</div>' +
        '<div class="vcard__foot">' +
          (already
            ? '<a class="btn btn--ghost btn--block" href="#" data-vagain>Verify another code</a>'
            : '<button class="btn btn--green btn--block" type="button" data-vcheckin>' +
                'Check in' + Uduf.icons.icon('check', 'icon') +
              '</button>') +
        '</div>' +
      '</div>';
  }

  function invalidCard(reason) {
    var copy = {
      not_found: 'No registration was found for this ticket code.',
      unpaid: 'This registration has not been paid for yet.',
      error: 'Something went wrong looking up that code. Try again.'
    }[reason] || 'No registration was found for this ticket code.';

    return '' +
      '<div class="vcard vcard--invalid" role="status">' +
        '<div class="vcard__head">' +
          Uduf.icons.icon('xCircle', 'icon') +
          '<strong>Invalid ticket</strong>' +
        '</div>' +
        '<div class="vcard__body">' +
          '<p class="vcard__msg">' + U.esc(copy) + '</p>' +
          '<p class="tiny">Check the code with the attendee, or confirm their name and email at the desk.</p>' +
        '</div>' +
        '<div class="vcard__foot">' +
          '<a class="btn btn--ghost btn--block" href="#" data-vagain>Try another code</a>' +
        '</div>' +
      '</div>';
  }

  /* Renders a result and wires its buttons. */
  function renderResult(host, state) {
    var node = typeof host === 'string' ? U.qs(host) : host;
    if (!node) return;
    node.className = 'vresult';

    if (state.status === 'valid' || state.status === 'already') {
      node.innerHTML = validCard(state.record);
    } else {
      node.innerHTML = invalidCard(state.reason);
    }

    var again = U.qs('[data-vagain]', node);
    if (again) {
      U.on(again, 'click', function (e) {
        e.preventDefault();
        Uduf.pages.verify.reset();
      });
    }

    var checkin = U.qs('[data-vcheckin]', node);
    if (checkin) {
      U.on(checkin, 'click', function () {
        Uduf.pages.verify.checkIn(state.record.ticketCode);
      });
    }

    /* Announce the outcome without stealing focus. */
    U.on(node, 'animationend', function once() {
      node.classList.add('pop');
      node.removeEventListener('animationend', once);
    });
    if (!U.prefersReducedMotion()) {
      node.classList.add('pop');
    }
    return node;
  }

  Uduf.VerificationForm = { init: initForm, markup: formMarkup };
  Uduf.VerificationResult = { render: renderResult, validCard: validCard, invalidCard: invalidCard };
})(window);
