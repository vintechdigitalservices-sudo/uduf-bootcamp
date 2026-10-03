/* =========================================================
   UDUF AFRICA — Button
   One place that builds buttons, so variants, the hover
   sweep and the busy state stay consistent everywhere.
   Usage:
     Uduf.Button.create({ label:'Register Now', href:'register.html' })
     Uduf.Button.create({ label:'Continue', variant:'green', busy:true })
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  var VARIANTS = {
    primary: '',
    green: 'btn--green',
    ink: 'btn--ink',
    ghost: 'btn--ghost',
    onDark: 'btn--onDark'
  };

  function create(opts) {
    var o = opts || {};
    var variant = VARIANTS[o.variant] === undefined ? '' : VARIANTS[o.variant];
    var size = o.size === 'lg' ? ' btn--lg' : o.size === 'sm' ? ' btn--sm' : '';
    var block = o.block ? ' btn--block' : '';

    var cls = 'btn' + variant + size + block + (o.className ? ' ' + o.className : '');
    var arrow = o.arrow ? Uduf.icons.icon('arrow', 'icon') : '';
    var label = U.esc(o.label || '');

    var node;
    if (o.href) {
      node = U.el('a', { class: cls, href: o.href });
      if (o.attrs) Object.keys(o.attrs).forEach(function (k) { node.setAttribute(k, o.attrs[k]); });
      node.innerHTML = label + arrow;
    } else {
      node = U.el('button', { class: cls, type: o.type || 'button' });
      if (o.attrs) Object.keys(o.attrs).forEach(function (k) { node.setAttribute(k, o.attrs[k]); });
      node.innerHTML = label + arrow;
      if (o.onClick) U.on(node, 'click', o.onClick);
    }

    if (o.busy) Uduf.buttonLoading.set(node, true, o.busyLabel);
    return node;
  }

  /* Change the label without changing the button's width noticeably. */
  function setLabel(node, label) {
    var arrow = U.qs('.icon', node);
    node.textContent = label;
    if (arrow) node.appendChild(arrow);
  }

  Uduf.Button = { create: create, setLabel: setLabel, VARIANTS: VARIANTS };
})(window);
