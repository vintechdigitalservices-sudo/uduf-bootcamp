/* =========================================================
   UDUF AFRICA — SVG icon sprite
   Injected once per page so components can reference
   <svg class="icon"><use href="#i-name"></use></svg>
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};

  var PATHS = {
    /* --- Pillars --- */
    idea: '<path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .9 1.6l.1.5h5l.1-.5c.1-.6.4-1.2.9-1.6A6 6 0 0 0 12 3Z"/><path d="M9.5 19h5M10.5 21.5h3"/>',
    business: '<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9.5 10h1.5M13 10h1.5M9.5 13.5h1.5M13 13.5h1.5M10 21v-4h4v4"/>',
    legacy: '<path d="M12 2.5 21 7v10l-9 4.5L3 17V7l9-4.5Z"/><path d="M12 8.5 16 10.5v4L12 16.5 8 14.5v-4l4-2Z"/>',
    leadership: '<path d="M12 2.5 15 9l7 .6-5.3 4.6L18.4 21 12 17.3 5.6 21l1.7-6.8L2 9.6 9 9l3-6.5Z"/>',
    growth: '<path d="M3 20h18"/><path d="M6 16.5 10 12l3.5 3L20 7"/><path d="M20 7h-4.5M20 7v4.5"/>',

    /* --- Benefits --- */
    learn: '<path d="M3 5.5A1.5 1.5 0 0 1 4.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4.5A1.5 1.5 0 0 1 3 15.5v-10Z"/><path d="M21 5.5A1.5 1.5 0 0 0 19.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h5.5a1.5 1.5 0 0 0 1.5-1.5v-10Z"/>',
    connect: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M10.2 7.1 6.4 15.7M13.8 7.1l3.8 8.6M7.5 18h9"/>',
    build: '<path d="M3 20.5h18"/><rect x="4" y="12" width="7" height="8.5" rx="1"/><rect x="13" y="7" width="7" height="13.5" rx="1"/><path d="M6.5 12V8.5h2V12M15.5 7V4h2v3"/>',
    grow: '<path d="M12 21V9"/><path d="M12 9 7.5 13.5M12 9l4.5 4.5"/><rect x="3" y="3" width="18" height="18" rx="2" transform="rotate(45 12 12)" opacity=".25"/>',

    /* --- UI --- */
    arrow: '<path d="M4 12h15"/><path d="M13 6l6 6-6 6"/>',
    check: '<path d="M4 12.5 9.5 18 20 6.5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9.5"/><path d="M7.5 12.3 10.5 15.4 16.5 8.8"/>',
    xCircle: '<circle cx="12" cy="12" r="9.5"/><path d="M15 9l-6 6M9 9l6 6"/>',
    clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.8V12l3.4 2"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M15.8 15.8 21 21"/>',
    download: '<path d="M12 3.5v11"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M4 19.5h16"/>',
    ticket: '<path d="M3 8.5V6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v2a2.5 2.5 0 0 0 0 7v2a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-2a2.5 2.5 0 0 0 0-7Z"/><path d="M13 5.5v13" stroke-dasharray="2 2"/>',
    shield: '<path d="M12 2.8 20 6v6.2c0 4.4-3.2 8.3-8 9.4-4.8-1.1-8-5-8-9.4V6l8-3.2Z"/><path d="M8.8 12.1 11 14.3l4.3-4.6"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 9.8h17M8 3.2v3.6M16 3.2v3.6"/>',
    pin: '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.8 20a6.4 6.4 0 0 1 12.4 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.9M17.5 14.4A6.4 6.4 0 0 1 21.2 20"/>',
    lock: '<rect x="4.5" y="10" width="15" height="11" rx="1.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/><circle cx="12" cy="15.5" r="1.4"/>',
    sparkle: '<path d="M12 2.5 13.9 9l6.6 1.9-6.6 1.9L12 19.4l-1.9-6.6L3.5 11 10.1 9 12 2.5Z"/><path d="M19 16.5l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" opacity=".5"/>',
    chevronDown: '<path d="M5 9l7 7 7-7"/>',
    alert: '<path d="M12 3.5 21.5 20h-19L12 3.5Z"/><path d="M12 9.5v5M12 17.2v.1"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v5.5M12 7.8v.1"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="m3.6 6.4 8.4 6 8.4-6"/>',
    phone: '<path d="M6.2 3.5h3l1.5 4-2 1.4a12 12 0 0 0 5.4 5.4l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.2 5.7a2 2 0 0 1 2-2.2Z"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5.5A1.5 1.5 0 0 1 16.5 21h-11A1.5 1.5 0 0 1 4 19.5v-11A1.5 1.5 0 0 1 5.5 7H11"/>',
    print: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="7.5" rx="1.5"/><path d="M7 14h10v6.5H7z"/>',
    bolt: '<path d="M13.5 2.5 4.5 13.5h6l-1 8 9-11h-6l1-8Z"/>',

    /* --- Social --- */
    instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none"/>',
    linkedin: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M7.5 10.5v6.5M7.5 7.4v.1M11.5 17v-3.6a2.1 2.1 0 0 1 4.2 0V17"/><path d="M11.5 10.5v6.5"/>',
    x: '<path d="M4 4h3.6l5 6.7L18 4h2.6l-6.6 7.9L21 20h-3.6l-5.3-7.1L6.4 20H3.8l7-8.3L4 4Z"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10.2 9.4 5 2.6-5 2.6V9.4Z"/>',
    whatsapp: '<path d="M3.5 20.5 5 16.3A8 8 0 1 1 8 19l-4.5 1.5Z"/><path d="M9 8.5c.4 2.4 2.1 4 4.5 4.4l1.2-1.4 2 .9-.4 1.8c-2.9.8-6.6-2-7.4-5.1l1.7-.9.9 1.5-1.5.8Z"/>',
    facebook: '<path d="M13.5 21v-8h2.7l.5-3.2h-3.2V7.7c0-.9.3-1.6 1.7-1.6h1.6V3.2A22 22 0 0 0 14.3 3c-2.4 0-4 1.5-4 4.2v2.6H7.6V13h2.7v8h3.2Z"/>',
    tiktok: '<path d="M14.2 3v9.9a3 3 0 1 1-3-3h.5"/><path d="M14.2 6.4A5 5 0 0 0 19 11V3h-4.8"/>'
  };

  function sprite() {
    var body = document.getElementById('uduf-icons');
    if (body) return body;
    var symbols = Object.keys(PATHS).map(function (name) {
      return '<symbol id="i-' + name + '" viewBox="0 0 24 24" fill="none" ' +
             'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ' +
             'stroke-linejoin="round">' + PATHS[name] + '</symbol>';
    }).join('');
    var host = document.createElement('div');
    host.id = 'uduf-icons';
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    host.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg">' + symbols + '</svg>';
    document.body.insertBefore(host, document.body.firstChild);
    return host;
  }

  function icon(name, cls) {
    return '<svg class="' + (cls || 'icon') + '" aria-hidden="true" focusable="false">' +
           '<use href="#i-' + name + '"></use></svg>';
  }

  Uduf.icons = { sprite: sprite, icon: icon, has: function (n) { return !!PATHS[n]; } };
})(window);
