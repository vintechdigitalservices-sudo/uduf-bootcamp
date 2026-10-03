/* =========================================================
   UDUF AFRICA — Verify page

   Optimised for the event entrance. A lookup is a single
   indexed read by ticket code — the browser never receives
   the attendee collection. Check-in is a transaction, so two
   staff members scanning the same code cannot both succeed.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  var form = null;
  var resultHost = null;
  var current = null;

  function ticketLabel(id) {
    var list = Uduf.config.TICKETS;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].name;
    return id || '\u2014';
  }

  function lookup(code, refs) {
    current = null;
    if (resultHost) resultHost.innerHTML = '';
    Uduf.buttonLoading.set(refs.submit, true, 'Checking\u2026');

    Uduf.db.findByCode(code)
      .then(function (record) {
        if (!record) {
          render({ status: 'invalid', reason: 'not_found' });
          return;
        }
        record.ticketLabel = ticketLabel(record.ticketType);
        current = record;

        if (record.paymentStatus !== 'paid') {
          render({ status: 'invalid', reason: 'unpaid', record: record });
          return;
        }
        if (record.checkedIn) {
          render({ status: 'already', record: record });
          return;
        }
        render({ status: 'valid', record: record });
      })
      .catch(function (err) {
        if (global.console) console.error('[UDUF] lookup failed:', err);
        render({ status: 'invalid', reason: 'error' });
      })
      .then(function () {
        Uduf.buttonLoading.set(refs.submit, false);
      });
  }

  function render(state) {
    Uduf.VerificationResult.render(resultHost, state);
    /* Keep the code in the field so staff can correct one character. */
    if (form && form.input) {
      form.input.focus({ preventScroll: true });
      form.input.select();
    }
  }

  function checkIn(code) {
    if (!code) return;
    Uduf.buttonLoading.set(U.qs('[data-vcheckin]', resultHost), true, 'Checking in\u2026');

    Uduf.db.checkIn(code)
      .then(function (res) {
        if (res && res.ok) {
          res.record.ticketLabel = ticketLabel(res.record.ticketType);
          render({ status: 'already', record: res.record });
          Uduf.notify.ok(res.record.fullName + ' checked in.');
          return;
        }
        var reason = (res && res.reason) || 'error';
        if (reason === 'already' && res.record) {
          res.record.ticketLabel = ticketLabel(res.record.ticketType);
          render({ status: 'already', record: res.record });
        } else {
          render({ status: 'invalid', reason: reason });
          Uduf.notify.error('Could not check in that ticket.');
        }
      })
      .catch(function (err) {
        if (global.console) console.error('[UDUF] check-in failed:', err);
        Uduf.notify.error('Check-in failed. Try again.');
        render({ status: 'valid', record: current || {} });
      });
  }

  function reset() {
    current = null;
    if (resultHost) resultHost.innerHTML = '';
    if (form && form.input) {
      form.input.value = '';
      var wrap = U.qs('[data-vinput]');
      if (wrap) wrap.classList.remove('has-value');
      form.input.focus({ preventScroll: true });
    }
  }

  /* Enter a code from the URL so a printed ticket can be opened directly. */
  function prefill() {
    var m = /[?&]code=([^&]+)/.exec(global.location.search);
    if (!m || !form || !form.input) return;
    var code = U.normaliseTicketCode(decodeURIComponent(m[1]));
    if (!U.RULES.ticketCode(code)) return;
    form.input.value = code;
    U.qs('[data-vinput]').classList.add('has-value');
    lookup(code, { input: form.input, submit: form.submit });
  }

  Uduf.pages = Uduf.pages || {};

  Uduf.pages.verify = {
    init: function () {
      form = Uduf.VerificationForm.init('[data-verify-form]');
      resultHost = U.qs('[data-verify-result]');
      this.lookup = lookup;
      this.checkIn = checkIn;
      this.reset = reset;
    },

    afterMount: function () {
      if (form && form.input) form.input.focus({ preventScroll: true });
      prefill();
    },

    lookup: lookup,
    checkIn: checkIn,
    reset: reset
  };
})(window);
