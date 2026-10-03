/* =========================================================
   UDUF AFRICA — RegistrationForm
   SECURE YOUR SPOT.

   Seven labelled fields plus an accuracy confirmation.
   Labels are always visible — placeholders never carry the
   meaning. Validation runs on blur and again on submit, and
   only ever reports the first problem in a field.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  function field(name, o) {
    o = o || {};
    var id = 'f-' + name;
    var label = o.label || name;
    var control;

    if (o.type === 'textarea') {
      control = '<textarea class="textarea" id="' + id + '" name="' + name + '"' +
        (o.autocomplete ? ' autocomplete="' + o.autocomplete + '"' : '') +
        (o.maxlength ? ' maxlength="' + o.maxlength + '"' : '') +
        (o.required ? ' required' : '') + '></textarea>';
    } else if (o.type === 'select') {
      control = '<select class="select" id="' + id + '" name="' + name + '"' + (o.required ? ' required' : '') + '>' +
        o.options.map(function (opt) {
          return '<option value="' + U.esc(opt.value) + '"' +
                 (opt.value === o.value ? ' selected' : '') + '>' + U.esc(opt.label) + '</option>';
        }).join('') +
        '</select>';
    } else {
      control = '<input class="input" id="' + id + '" name="' + name + '" type="' + (o.type || 'text') + '"' +
        (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '') +
        (o.autocomplete ? ' autocomplete="' + o.autocomplete + '"' : '') +
        (o.maxlength ? ' maxlength="' + o.maxlength + '"' : '') +
        (o.placeholder ? ' placeholder="' + U.esc(o.placeholder) + '"' : '') +
        (o.required ? ' required' : '') + '>';
    }

    return '' +
      '<div class="field' + (o.full ? ' field--full' : '') + '" data-field="' + name + '">' +
        '<label class="field__label" for="' + id + '">' + U.esc(label) +
          (o.required ? ' <span class="req" aria-hidden="true">*</span>' : '') +
        '</label>' +
        control +
        (o.hint ? '<p class="field__hint">' + U.esc(o.hint) + '</p>' : '') +
        '<p class="field__err" id="' + id + '-err" aria-live="polite"></p>' +
      '</div>';
  }

  function ticketTypes() {
    var tickets = Uduf.config.TICKETS;
    return '' +
      '<fieldset class="field field--full" data-field="ticketType" data-group="ticketType">' +
        '<legend class="field__label">Ticket Type <span class="req" aria-hidden="true">*</span></legend>' +
        '<div class="ttypes ttypes--2">' +
          tickets.map(function (t) {
            return '' +
              '<label class="ttype">' +
                '<input type="radio" name="ticketType" value="' + t.id + '">' +
                '<span class="ttype__top">' +
                  '<span class="ttype__name">' + U.esc(t.name) + '</span>' +
                  '<span class="ttype__price">' + U.money(t.price) + '</span>' +
                '</span>' +
                '<span class="ttype__note">' + U.esc(t.note) + '</span>' +
              '</label>';
          }).join('') +
        '</div>' +
        '<p class="field__err" aria-live="polite"></p>' +
      '</fieldset>';
  }

  function markup() {
    var e = Uduf.config.EVENT;
    return '' +
      '<form class="form" data-reg-form novalidate autocomplete="on">' +

        '<div class="form__grid">' +

          field('fullName', {
            label: 'Full Name', required: true, full: false,
            autocomplete: 'name', maxlength: 80,
            placeholder: 'As it should appear on your ticket'
          }) +

          field('phone', {
            label: 'Phone Number', required: true,
            type: 'tel', inputmode: 'tel', autocomplete: 'tel', maxlength: 24,
            placeholder: '0800 000 0000'
          }) +

          field('email', {
            label: 'Email Address', required: true,
            type: 'email', inputmode: 'email', autocomplete: 'email', maxlength: 160,
            placeholder: 'you@business.com'
          }) +

          field('business', {
            label: 'Business / Organisation', required: true,
            autocomplete: 'organization', maxlength: 120,
            placeholder: 'Name of your business or organisation'
          }) +

          field('address', {
            label: 'Address', required: true, full: true,
            autocomplete: 'street-address', maxlength: 200,
            placeholder: 'Street, city, state'
          }) +

          field('age', {
            label: 'Age', required: true,
            type: 'number', inputmode: 'numeric', min: 16, max: 100,
            placeholder: '18'
          }) +

          field('invite', {
            label: 'How did you hear about us?', required: false,
            type: 'select',
            options: [
              { value: '', label: 'Select one' },
              { value: 'friend', label: 'A friend or colleague' },
              { value: 'social', label: 'Social media' },
              { value: 'whatsapp', label: 'WhatsApp' },
              { value: 'email', label: 'Email from UDUF Africa' },
              { value: 'other', label: 'Other' }
            ]
          }) +

          ticketTypes() +

        '</div>' +

        '<div class="field field--full check" data-field="confirm" data-group="confirm">' +
          '<input type="checkbox" id="f-confirm" name="confirm" value="yes">' +
          '<div>' +
            '<label for="f-confirm">I confirm that the information provided is accurate.</label>' +
            '<p class="field__err" aria-live="polite"></p>' +
          '</div>' +
        '</div>' +

        '<div class="form__actions">' +
          '<button class="btn btn--lg" type="submit" data-submit>' +
            'Continue' + Uduf.icons.icon('arrow', 'icon') +
          '</button>' +
          '<p class="form__note">' +
            Uduf.icons.icon('lock', 'icon') +
            '<span>Your ticket is issued instantly after payment.</span>' +
          '</p>' +
        '</div>' +

        '<p class="tiny">' +
          'Questions? <a class="hl" href="mailto:' + e.email + '">' + U.esc(e.email) + '</a>' +
          ' or call ' + e.phones.map(function (p, i) {
            return '<a class="hl" href="tel:' + p.replace(/[^\d]/g, '') + '">' + U.esc(p) + '</a>' +
                   (i < e.phones.length - 1 ? ' / ' : '');
          }).join('') + '.' +
        '</p>' +

      '</form>';
  }

  /* ---------- Validation plumbing ---------- */
  function wrap(name) { return U.qs('[data-field="' + name + '"]'); }

  function setError(name, message) {
    var box = wrap(name);
    if (!box) return;
    var err = U.qs('.field__err', box);
    var control = U.qs('.input, .select, .textarea, input', box);
    if (message) {
      box.classList.add('is-invalid');
      box.classList.remove('is-valid');
      if (err) err.textContent = message;
      if (control) control.setAttribute('aria-invalid', 'true');
      if (err && control) control.setAttribute('aria-describedby', err.id || '');
    } else {
      box.classList.remove('is-invalid');
      box.classList.add('is-valid');
      if (err) err.textContent = '';
      if (control) control.removeAttribute('aria-invalid');
    }
  }

  function valueOf(name) {
    if (name === 'ticketType') {
      var picked = U.qs('input[name="ticketType"]:checked');
      return picked ? picked.value : '';
    }
    if (name === 'confirm') {
      var box = U.qs('#f-confirm');
      return box && box.checked ? 'yes' : '';
    }
    var node = U.qs('[name="' + name + '"]');
    return node ? node.value : '';
  }

  function validate(name) {
    if (name === 'confirm') {
      if (valueOf('confirm') !== 'yes') {
        setError('confirm', 'Please confirm your details are accurate.');
        return false;
      }
      setError('confirm', '');
      return true;
    }
    if (name === 'ticketType' && !valueOf('ticketType')) {
      setError('ticketType', 'Select a ticket type.');
      return false;
    }
    var res = U.validateField(name, valueOf(name));
    setError(name, res.ok ? '' : res.message);
    return res.ok;
  }

  function validateAll() {
    var names = ['fullName', 'phone', 'email', 'business', 'address', 'age', 'ticketType', 'confirm'];
    var firstBad = null;
    names.forEach(function (n) {
      if (!validate(n) && !firstBad) firstBad = n;
    });
    if (firstBad) {
      var box = wrap(firstBad);
      var focusable = box && U.qs('input, .select, .textarea', box);
      if (focusable) {
        focusable.focus({ preventScroll: true });
        focusable.scrollIntoView({ block: 'center', behavior: U.prefersReducedMotion() ? 'auto' : 'smooth' });
      }
    }
    return !firstBad;
  }

  function read() {
    return {
      fullName: valueOf('fullName').trim(),
      phone: valueOf('phone').trim(),
      email: valueOf('email').trim(),
      business: valueOf('business').trim(),
      address: valueOf('address').trim(),
      age: Number(valueOf('age').trim()),
      ticketType: valueOf('ticketType'),
      invite: valueOf('invite'),
      confirmed: true
    };
  }

  function init(selector) {
    var host = typeof selector === 'string' ? U.qs(selector) : selector;
    if (!host) return null;
    host.innerHTML = markup();

    var form = U.qs('[data-reg-form]', host);
    var submit = U.qs('[data-submit]', host);

    /* Validate on blur once a field has been touched, then live. */
    var touched = {};
    U.qsa('.input, .select, .textarea', host).forEach(function (input) {
      var name = input.getAttribute('name');
      U.on(input, 'blur', function () { touched[name] = true; validate(name); });
      U.on(input, 'input', function () { if (touched[name]) validate(name); });
      U.on(input, 'change', function () { touched[name] = true; validate(name); });
    });

    U.qsa('input[name="ticketType"]', host).forEach(function (r) {
      U.on(r, 'change', function () { validate('ticketType'); });
    });
    U.on(U.qs('#f-confirm', host), 'change', function () { validate('confirm'); });

    U.on(form, 'submit', function (e) {
      e.preventDefault();
      if (!validateAll()) {
        Uduf.notify.error('Please fix the highlighted fields.');
        return;
      }
      var handler = Uduf.pages.register && Uduf.pages.register.onValid;
      if (handler) handler(read(), { form: form, submit: submit, host: host });
    });

    return { host: host, form: form, read: read, validateAll: validateAll, validate: validate };
  }

  Uduf.RegistrationForm = {
    init: init, markup: markup, field: field,
    validate: validate, validateAll: validateAll, read: read, setError: setError
  };
})(window);
