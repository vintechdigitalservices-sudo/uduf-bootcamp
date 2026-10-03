/* =========================================================
   UDUF AFRICA — Button
   One place that builds buttons, so variants, the hover
   sweep and the busy state stay consistent everywhere.
   Usage:
     Uduf.Button.create({ label:'Register Now', href:'register.html' })
     Uduf.Button.create({ label:'Download PDF', icon:'download' })
     Uduf.Button.create({ label:'Continue', variant:'green', busy:true })

   `icon` puts a leading icon inside the button. It has to be
   built here, as markup: icons.icon() returns an HTML string, not
   a node, so it cannot be inserted with appendChild later.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  /* Bare modifier names — create() joins them onto "btn" with spaces,
     so none of these may carry their own leading space. */
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
    var size = o.size === 'lg' ? 'btn--lg' : o.size === 'sm' ? 'btn--sm' : '';
    var block = o.block ? 'btn--block' : '';

    var cls = ['btn', variant, size, block, o.className || '']
      .filter(Boolean)
      .join(' ');
    var lead = o.icon ? Uduf.icons.icon(o.icon, 'icon') : '';
    var arrow = o.arrow ? Uduf.icons.icon('arrow', 'icon') : '';
    var label = U.esc(o.label || '');

    var node;
    if (o.href) {
      node = U.el('a', { class: cls, href: o.href });
      if (o.attrs) Object.keys(o.attrs).forEach(function (k) { node.setAttribute(k, o.attrs[k]); });
      node.innerHTML = lead + label + arrow;
    } else {
      node = U.el('button', { class: cls, type: o.type || 'button' });
      if (o.attrs) Object.keys(o.attrs).forEach(function (k) { node.setAttribute(k, o.attrs[k]); });
      node.innerHTML = lead + label + arrow;
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
