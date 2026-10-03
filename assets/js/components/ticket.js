/* =========================================================
   UDUF AFRICA — Ticket renderer

   One component, used on the register page after payment and
   anywhere else a ticket needs to be shown. Renders the
   on-screen ticket with its QR code and wires print / PDF.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  function ticketInfo(ticketType) {
    var list = Uduf.config.TICKETS;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === ticketType) return list[i];
    }
    return { id: ticketType, name: ticketType || 'Attendee', note: '', price: 0 };
  }

  function row(k, v, mod) {
    if (v === null || v === undefined || v === '') return '';
    return '<div class="tk__row"><span class="tk__k">' + U.esc(k) + '</span>' +
           '<span class="tk__v' + (mod ? ' ' + mod : '') + '">' + U.esc(v) + '</span></div>';
  }

  function markup(record) {
    var E = Uduf.config.EVENT;
    var info = ticketInfo(record.ticketType);
    var paid = record.paymentStatus === 'paid';

    return '' +
      '<article class="tk" data-ticket>' +

        '<div class="tk__top">' +
          '<div class="tk__brand">' +
            '<img class="tk__logo" src="' + Uduf.config.ASSETS.logoTiny + '" alt="" width="128" height="128" decoding="async">' +
            '<span class="tk__brandtext">' + U.esc(E.org) + '</span>' +
          '</div>' +
          '<span class="tk__status' + (paid ? '' : ' tk__status--pending') + '">' +
            Uduf.icons.icon(paid ? 'checkCircle' : 'clock', 'icon') +
            (paid ? 'Confirmed' : 'Pending') +
          '</span>' +
        '</div>' +

        '<div class="tk__body">' +
          '<div>' +
            '<p class="tk__event">' + U.esc(E.nameUpper) + '</p>' +
            '<p class="tk__theme">' + E.themeLines.join(' ') + '</p>' +
            '<div class="tk__rows">' +
              row('Attendee', record.fullName) +
              row('Business', record.business) +
              row('Ticket type', info.name) +
              row('Ticket code', record.ticketCode, 'tk__v--code') +
            '</div>' +
          '</div>' +
          '<div class="tk__qr">' +
            '<div class="tk__qrbox" data-ticket-qr role="img" ' +
                 'aria-label="QR code for ticket ' + U.esc(record.ticketCode) + '"></div>' +
            '<p class="tk__qrlabel">Scan at the entrance</p>' +
          '</div>' +
        '</div>' +

        '<div class="tk__foot">' +
          '<p class="tk__instr">' +
            U.esc(E.dates) + ' \u00b7 ' + U.esc(E.venue) +
            '<br>Present this ticket for verification at the event.' +
          '</p>' +
        '</div>' +

      '</article>';
  }

  function paintQR(host, record) {
    if (!host || !Uduf.qr) return;
    /* level M reads reliably off a phone screen at the entrance. */
    host.innerHTML = Uduf.qr.toSVG(record.ticketCode, {
      level: 'M', quiet: 2, fg: '#12110F', bg: '#FFFFFF'
    });
  }

  /** Build and download a print-ready A5 PDF. */
  function downloadPDF(record) {
    var info = ticketInfo(record.ticketType);
    var doc = Uduf.pdf.buildTicketPDF(record, info, Uduf.config.EVENT);
    /* toBytes matters: pdf.js returns a latin1 string, and a Blob built
       straight from that string is UTF-8 encoded and corrupts every byte
       above 127. Convert to bytes first. */
    var bytes = Uduf.pdf.toBytes(doc.build());
    var blob = new Blob([bytes], { type: 'application/pdf' });
    var url = URL.createObjectURL(blob);
    var a = U.el('a', {
      href: url,
      download: 'UDUF-2027-Bootcamp-' + String(record.ticketCode || '').replace(/[^\w-]/g, '') + '.pdf'
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return blob;
  }

  /**
   * @param {object} record
   * @param {{actions?:boolean, onDownload?:Function, onPrint?:Function}} [opts]
   * @returns {HTMLElement}
   */
  function render(record, opts) {
    if (!record) return null;
    opts = opts || {};

    var wrap = U.el('div', { class: 'tk-wrap' });
    wrap.innerHTML = markup(record);

    if (opts.actions !== false) {
      var foot = U.qs('.tk__foot', wrap);
      var acts = U.el('div', { class: 'tk__acts' });

      var dl = Uduf.Button.create({
        label: 'Download PDF', variant: 'green', arrow: false,
        onClick: function () {
          if (opts.onDownload) return opts.onDownload(record);
          try {
            downloadPDF(record);
            Uduf.notify.ok('Ticket PDF downloaded.');
          } catch (e) {
            if (global.console) console.error('[UDUF] PDF failed:', e);
            Uduf.notify.error('Could not build the PDF. Try printing instead.');
          }
        }
      });
      dl.insertBefore(Uduf.icons.icon('download', 'icon'), dl.firstChild);

      var pr = Uduf.Button.create({
        label: 'Print', variant: 'ghost', arrow: false,
        onClick: function () {
          if (opts.onPrint) return opts.onPrint(record);
          global.print();
        }
      });
      pr.insertBefore(Uduf.icons.icon('print', 'icon'), pr.firstChild);

      acts.appendChild(dl);
      acts.appendChild(pr);
      foot.appendChild(acts);
    }

    paintQR(U.qs('[data-ticket-qr]', wrap), record);
    return wrap;
  }

  Uduf.Ticket = {
    render: render,
    markup: markup,
    downloadPDF: downloadPDF,
    info: ticketInfo
  };
})(window);
