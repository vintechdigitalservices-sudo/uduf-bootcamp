/* =========================================================
   UDUF AFRICA — Toast notifications + button loading states
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  var ICONS = {
    success: 'checkCircle',
    error: 'alert',
    info: 'info'
  };

  function region() {
    var node = U.qs('.toaster');
    if (node) return node;
    node = U.el('div', {
      class: 'toaster',
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'false'
    });
    document.body.appendChild(node);
    return node;
  }

  /**
   * @param {string} message
   * @param {{type?:'success'|'error'|'info', title?:string, duration?:number}} opts
   */
  function show(message, opts) {
    opts = opts || {};
    var type = opts.type || 'info';
    var duration = opts.duration === undefined ? 4200 : opts.duration;
    var host = region();

    var toast = U.el('div', {
      class: 'toast toast--' + (type === 'success' ? 'ok' : type),
      html:
        Uduf.icons.icon(ICONS[type] || ICONS.info, 'icon') +
        '<div>' +
          (opts.title ? '<strong>' + U.esc(opts.title) + '</strong>' : '') +
          '<span>' + U.esc(message) + '</span>' +
        '</div>'
    });

    var timer = setTimeout(close, duration);
    function close() {
      clearTimeout(timer);
      if (!toast.parentNode) return;
      toast.classList.add('is-out');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }

    U.on(toast, 'click', close);
    host.appendChild(toast);
    return close;
  }

  /* ---------- Button loading state ----------
     Preserves the button's width so a label swap cannot make the
     layout jump while a request is in flight. */
  function setLoading(button, isLoading, loadingLabel) {
    if (!button) return;
    if (isLoading) {
      if (button.dataset.idleHtml !== undefined) return;
      button.dataset.idleHtml = button.innerHTML;
      if (!button.style.minWidth) button.style.minWidth = button.offsetWidth + 'px';
      button.innerHTML =
        '<span class="spin" aria-hidden="true"></span>' +
        '<span>' + U.esc(loadingLabel || 'Working\u2026') + '</span>';
      button.classList.add('is-loading');
      button.setAttribute('aria-busy', 'true');
      button.disabled = true;
    } else {
      if (button.dataset.idleHtml === undefined) return;
      button.innerHTML = button.dataset.idleHtml;
      delete button.dataset.idleHtml;
      button.classList.remove('is-loading');
      button.removeAttribute('aria-busy');
      button.disabled = false;
    }
  }

  function isLoading(button) {
    return button ? button.classList.contains('is-loading') : false;
  }

  Uduf.toast = show;
  Uduf.notify = {
    success: function (m, o) { return show(m, Object.assign({ type: 'success' }, o || {})); },
    ok:      function (m, o) { return show(m, Object.assign({ type: 'success' }, o || {})); },
    error:   function (m, o) { return show(m, Object.assign({ type: 'error' }, o || {})); },
    info:    function (m, o) { return show(m, Object.assign({ type: 'info' }, o || {})); }
  };
  Uduf.buttonLoading = { set: setLoading, is: isLoading };
})(window);
