/* =========================================================
   UDUF AFRICA — Minimal PDF writer + event ticket design
   ------------------------------------------------------------
   Dependency-free PDF generation. Uses the standard 14 PDF fonts
   (Helvetica family + Courier), so nothing needs embedding and the
   output stays tiny (~6 KB) and prints anywhere.

   The page API uses a TOP-LEFT origin (like the DOM) and converts
   to PDF's bottom-left origin internally.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};

  var MM = 72 / 25.4;                 /* points per millimetre */
  var A5 = { width: 148 * MM, height: 210 * MM };
  var A4 = { width: 210 * MM, height: 297 * MM };

  /* ---------- Glyph widths (units/1000) for the standard fonts ---------- */
  var W_HELV = [
    278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
    556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,
    1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,
    667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,
    333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,
    556,556,333,500,278,556,500,722,500,500,500,334,260,334,584
  ];
  var W_BOLD = [
    278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,
    556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,
    975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,
    667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,
    333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,
    611,611,389,556,333,611,556,778,556,556,500,389,280,389,584
  ];
  var W_MONO = null; /* Courier is fixed at 600 */

  var FONTS = {
    regular: { res: 'F1', base: 'Helvetica', widths: W_HELV, mono: false },
    bold:    { res: 'F2', base: 'Helvetica-Bold', widths: W_BOLD, mono: false },
    italic:  { res: 'F3', base: 'Helvetica-Oblique', widths: W_HELV, mono: false },
    mono:    { res: 'F4', base: 'Courier-Bold', widths: W_MONO, mono: true }
  };

  /* ---------- Text encoding ---------- */
  var WINANSI = {
    0x20AC: 128, 0x201A: 130, 0x0192: 131, 0x201E: 132, 0x2026: 133,
    0x2020: 134, 0x2021: 135, 0x02C6: 136, 0x2030: 137, 0x0160: 138,
    0x2039: 139, 0x0152: 140, 0x017D: 142, 0x2018: 145, 0x2019: 146,
    0x201C: 147, 0x201D: 148, 0x2022: 149, 0x2013: 150, 0x2014: 151,
    0x02DC: 152, 0x2122: 153, 0x0161: 154, 0x203A: 155, 0x0153: 156,
    0x017E: 158, 0x0178: 159
  };

  /* Fold anything outside WinAnsi down to a safe ASCII equivalent. */
  var FOLD = {
    0x2010: '-', 0x2011: '-', 0x2012: '-', 0x2013: '-', 0x2014: '-', 0x2015: '-',
    0x2018: "'", 0x2019: "'", 0x201A: ',', 0x201B: "'",
    0x201C: '"', 0x201D: '"', 0x201E: '"', 0x201F: '"',
    0x2026: '.', 0x2022: '-', 0x2023: '-', 0x2039: '<', 0x203A: '>',
    0x00A0: ' ', 0x2044: '/', 0x2212: '-', 0x00D7: 'x',
    0x20B6: 'GBP', 0x20A6: 'N', 0x20A9: 'C', 0x2122: '(R)',
    0x00E9: 'e', 0x00E8: 'e', 0x00EA: 'e', 0x00EB: 'e',
    0x00E0: 'a', 0x00E1: 'a', 0x00E2: 'a', 0x00E3: 'a', 0x00E4: 'a', 0x00E5: 'a',
    0x00ED: 'i', 0x00EC: 'i', 0x00EE: 'i', 0x00EF: 'i',
    0x00F3: 'o', 0x00F2: 'o', 0x00F4: 'o', 0x00F5: 'o', 0x00F6: 'o', 0x00F8: 'o',
    0x00FA: 'u', 0x00F9: 'u', 0x00FB: 'u', 0x00FC: 'u',
    0x00E7: 'c', 0x00F1: 'n', 0x00DF: 'ss', 0x00E5: 'a', 0x0153: 'oe',
    0x00E6: 'ae', 0x0152: 'oe', 0x00FE: 'th', 0x00F0: 'd'
  };

  function charToByte(code) {
    if (code >= 32 && code <= 126) return code;
    if (code >= 160 && code <= 255) return code;
    if (WINANSI[code]) return WINANSI[code];
    if (FOLD[code] !== undefined) return charToByte(FOLD[code].charCodeAt(0));
    return 63; /* '?' */
  }

  function encodeString(str) {
    var out = '';
    for (var i = 0; i < str.length; i++) {
      out += String.fromCharCode(charToByte(str.charCodeAt(i)));
    }
    return out;
  }

  function widths(fontKey) {
    var f = FONTS[fontKey] || FONTS.regular;
    if (f.mono) {
      var w = [];
      for (var i = 0; i < 95; i++) w.push(600);
      return w;
    }
    return f.widths;
  }

  /** Width of a string in points at the given size. */
  function measure(text, fontKey, size, tracking) {
    var w = widths(fontKey);
    var total = 0;
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      var idx = code >= 32 && code <= 126 ? code - 32
              : (code >= 160 && code <= 255 ? code - 160 + 95 : 95);
      total += (w[idx] !== undefined ? w[idx] : 556) / 1000 * size;
    }
    return total + (tracking || 0) * Math.max(0, text.length - 1);
  }

  /** Greedy word wrap to a maximum width. Returns an array of lines. */
  function wrap(text, fontKey, size, tracking, maxWidth) {
    var words = String(text).split(/\s+/).filter(Boolean);
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var probe = line ? line + ' ' + words[i] : words[i];
      if (measure(probe, fontKey, size, tracking) <= maxWidth || !line) {
        line = probe;
      } else {
        lines.push(line);
        line = words[i];
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  /* ---------- Colour ---------- */
  function rgb(hex) {
    var h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) n = 0;
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  function op(v) { return (Math.round(v * 1000) / 1000).toString(); }

  /* ---------- Escape for PDF literal strings ---------- */
  function pdfString(str) {
    var s = encodeString(str);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s.charCodeAt(i);
      if (ch === 40 || ch === 41 || ch === 92) out += '\\' + s[i];
      else if (ch < 32 || ch > 126) out += '\\' + ('000' + ch.toString(8)).slice(-3);
      else out += s[i];
    }
    return out;
  }

  /* =========================================================
     Page
     ========================================================= */
  function Page(doc) {
    this.doc = doc;
    this.ops = [];
  }

  Page.prototype.rect = function (x, y, w, h, opts) {
    opts = opts || {};
    var c = rgb(opts.fill || '#000000');
    this.ops.push('q', op(c[0]) + ' ' + op(c[1]) + ' ' + op(c[2]) + ' rg');
    if (opts.stroke) {
      var s = rgb(opts.stroke);
      this.ops.push(op(s[0]) + ' ' + op(s[1]) + ' ' + op(s[2]) + ' RG',
                     op(opts.lineWidth || 0.5) + ' w');
      if (opts.dash) this.ops.push('[' + opts.dash + '] 0 d');
    }
    this.ops.push(op(x) + ' ' + op(this.doc.height - y - h) + ' ' + op(w) + ' ' + op(h) + ' re');
    this.ops.push(opts.stroke && !opts.fill ? 'S' : (opts.fill && opts.stroke ? 'B' : 'f'));
    this.ops.push('Q');
    return this;
  };

  Page.prototype.line = function (x1, y1, x2, y2, opts) {
    opts = opts || {};
    var c = rgb(opts.color || '#000000');
    this.ops.push('q',
      op(c[0]) + ' ' + op(c[1]) + ' ' + op(c[2]) + ' RG',
      op(opts.width || 0.5) + ' w',
      opts.dash ? '[' + opts.dash + '] 0 d' : '[] 0 d',
      '1 J', '1 j');
    this.ops.push(op(x1) + ' ' + op(this.doc.height - y1) + ' m',
                  op(x2) + ' ' + op(this.doc.height - y2) + ' l', 'S', 'Q');
    return this;
  };

  Page.prototype.circle = function (cx, cy, r, opts) {
    opts = opts || {};
    var k = r * 0.5523;
    var py = this.doc.height - cy;
    this.ops.push('q');
    if (opts.fill) {
      var c = rgb(opts.fill);
      this.ops.push(op(c[0]) + ' ' + op(c[1]) + ' ' + op(c[2]) + ' rg');
    }
    if (opts.stroke) {
      var s = rgb(opts.stroke);
      this.ops.push(op(s[0]) + ' ' + op(s[1]) + ' ' + op(s[2]) + ' RG',
                     op(opts.lineWidth || 0.5) + ' w');
    }
    this.ops.push(
      op(cx + r) + ' ' + op(py) + ' m',
      op(cx + r) + ' ' + op(py + k) + ' ' + op(cx + k) + ' ' + op(py + r) + ' ' + op(cx) + ' ' + op(py + r) + ' c',
      op(cx - k) + ' ' + op(py + r) + ' ' + op(cx - r) + ' ' + op(py + k) + ' ' + op(cx - r) + ' ' + op(py) + ' c',
      'h', (opts.stroke && !opts.fill) ? 'S' : (opts.fill && opts.stroke ? 'B' : 'f'), 'Q');
    return this;
  };

  /**
   * Draw text with a top-left origin. y is the text baseline.
   * @param {string} text
   * @param {number} x
   * @param {number} y baseline
   * @param {object} opts font,size,color,tracking,align,maxWidth,lineHeight,opacity
   */
  Page.prototype.text = function (text, x, y, opts) {
    opts = opts || {};
    var fontKey = opts.font || 'regular';
    var f = FONTS[fontKey] || FONTS.regular;
    var size = opts.size || 10;
    var tracking = opts.tracking || 0;
    var c = rgb(opts.color || '#000000');
    var lines = String(text).split('\n');

    if (opts.maxWidth) {
      var wrapped = [];
      lines.forEach(function (ln) {
        wrap(ln, fontKey, size, tracking, opts.maxWidth).forEach(function (w) { wrapped.push(w); });
      });
      lines = wrapped;
    }

    var leading = opts.lineHeight || size * 1.25;

    this.ops.push('q', 'BT');
    if (opts.opacity !== undefined && opts.opacity < 1) {
      /* ExtGState would need an extra resource; approximate with colour. */
    }
    this.ops.push(op(c[0]) + ' ' + op(c[1]) + ' ' + op(c[2]) + ' rg');
    this.ops.push('/' + f.res + ' ' + op(size) + ' Tf');
    if (tracking) this.ops.push(op(tracking) + ' Tc');

    lines.forEach(function (ln, i) {
      var w = measure(ln, fontKey, size, tracking);
      var lx = x;
      if (opts.align === 'center') lx = x - w / 2;
      else if (opts.align === 'right') lx = x - w;
      var ty = this.doc.height - (y + i * leading);
      this.ops.push('1 0 0 1 ' + op(lx) + ' ' + op(ty) + ' Tm', '(' + pdfString(ln) + ') Tj');
    }, this);

    this.ops.push('ET', 'Q');
    return this;
  };

  /** Draw a QR matrix as vector modules (crisp at any print size). */
  Page.prototype.qr = function (payload, x, y, size, opts) {
    opts = opts || {};
    var qr = Uduf.qr.encode(payload, { level: opts.level || 'M' });
    var quiet = opts.quiet === undefined ? 1 : opts.quiet;
    var dim = qr.size + quiet * 2;
    var unit = size / dim;
    var c = rgb(opts.color || '#0a0a0b');
    var py = this.doc.height - y - size;

    this.ops.push('q', op(c[0]) + ' ' + op(c[1]) + ' ' + op(c[2]) + ' rg');
    for (var r = 0; r < qr.size; r++) {
      var col = 0;
      while (col < qr.size) {
        if (qr.modules[r * qr.size + col]) {
          var start = col;
          while (col < qr.size && qr.modules[r * qr.size + col]) col++;
          var w = (col - start) * unit;
          this.ops.push(op(x + (quiet + start) * unit) + ' ' + op(py + (quiet + r) * unit) +
                        ' ' + op(w) + ' ' + op(unit) + ' re');
        } else col++;
      }
    }
    this.ops.push('f', 'Q');
    return this;
  };

  /* =========================================================
     Document
     ========================================================= */
  function PDF(opts) {
    opts = opts || {};
    this.width = opts.width || A5.width;
    this.height = opts.height || A5.height;
    this.title = opts.title || 'UDUF Africa Ticket';
    this.author = opts.author || 'UDUF Africa';
    this.subject = opts.subject || 'Event ticket';
    this.keywords = opts.keywords || '';
    this.pages = [];
  }

  PDF.prototype.addPage = function () {
    var p = new Page(this);
    this.pages.push(p);
    return p;
  };

  PDF.prototype.build = function () {
    var self = this;
    var objects = [];
    function add(body) { objects.push(body); return objects.length; }  /* 1-based ids */

    var catalogId = 0, pagesId = 0;
    var fontIds = {};

    /* Reserve ids 1..4 for catalog/pages/page/contents bookkeeping */
    var pageIds = [];
    var contentIds = [];
    var i;

    /* Fixed layout: 1 catalog, 2 pages, then per page: page + contents */
    var n = self.pages.length;
    for (i = 0; i < n; i++) { pageIds.push(3 + i * 2); contentIds.push(4 + i * 2); }
    var nextId = 3 + n * 2;

    var f1 = nextId++, f2 = nextId++, f3 = nextId++, f4 = nextId++;
    var infoId = nextId++;
    var kids = pageIds.map(function (id) { return id + ' 0 R'; }).join(' ');

    var out = [];
    out[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    out[2] = '<< /Type /Pages /Count ' + n + ' /Kids [' + kids + '] >>';

    var resources = '<< /Font << /F1 ' + f1 + ' 0 R /F2 ' + f2 + ' 0 R /F3 ' + f3 + ' 0 R /F4 ' + f4 + ' 0 R >> >>';

    for (i = 0; i < n; i++) {
      out[pageIds[i]] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' +
        op(self.width) + ' ' + op(self.height) + '] /Resources ' + resources +
        ' /Contents ' + contentIds[i] + ' 0 R >>';
      var stream = self.pages[i].ops.join('\n');
      out[contentIds[i]] = '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream';
    }

    out[f1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    out[f2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    out[f3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>';
    out[f4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>';
    out[infoId] = '<< /Title (' + pdfString(self.title) + ') /Author (' + pdfString(self.author) +
      ') /Subject (' + pdfString(self.subject) + ') /Keywords (' + pdfString(self.keywords) +
      ') /Producer (UDUF Africa Bootcamp Portal) /Creator (UDUF Africa Bootcamp Portal) >>';

    /* Serialise */
    var chunks = [];
    var header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    chunks.push(header);

    var offsets = [];
    var pos = header.length;
    var total = infoId;
    for (i = 1; i <= total; i++) {
      offsets[i] = pos;
      var body = out[i] || '<< >>';
      var piece = i + ' 0 obj\n' + body + '\nendobj\n';
      chunks.push(piece);
      pos += piece.length;
    }

    var xrefPos = pos;
    var xref = 'xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n';
    for (i = 1; i <= total; i++) {
      xref += ('0000000000' + offsets[i]).slice(-10) + ' 00000 n \n';
    }
    var trailer = 'trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R /Info ' + infoId + ' 0 R >>\n' +
                  'startxref\n' + xrefPos + '\n%%EOF\n';
    chunks.push(xref);
    chunks.push(trailer);

    return chunks.join('');
  };

  PDF.prototype.blob = function () {
    return new Blob([this.build()], { type: 'application/pdf' });
  };

  PDF.prototype.download = function (filename) {
    var url = URL.createObjectURL(this.blob());
    var a = document.createElement('a');
    a.href = url;
    a.download = filename || 'uduf-ticket.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  };

  /* =========================================================
     Ticket design
     Mirrors the on-screen ticket so the PDF feels like the
     artefact, not a receipt.
     ========================================================= */
  var C = {
    ink: '#12110F',
    inkSoft: '#2B2924',
    orange: '#E8560F',
    orangeDeep: '#C4440A',
    orangeSoft: '#FDD9C8',
    green: '#0A6B45',
    greenSoft: '#CFE7DA',
    paper: '#FFFFFF',
    bone: '#F7F6F3',
    muted: '#57534B',
    faint: '#8B857A',
    line: '#E3DFD6',
    white: '#FFFFFF',
    success: '#0A6B45'
  };

  function ticketLabel(page, text, x, y) {
    page.text(text.toUpperCase(), x, y, {
      font: 'bold', size: 5.6, color: C.faint, tracking: 1.5
    });
  }

  /**
   * @param {object} record attendee record
   * @param {object} ticket  resolved ticket descriptor {typeName}
   * @param {object} meta    {event}
   */
  function buildTicketPDF(record, ticket, event) {
    var doc = new PDF({ width: A5.width, height: A5.height, title: event.org + ' Bootcamp Ticket' });
    var page = doc.addPage();
    var W = doc.width;   /* 419.5 */
    var H = doc.height;  /* 595.3 */
    var M = 26;          /* margin */
    var inner = W - M * 2;

    /* ---------- Masthead ---------- */
    page.rect(0, 0, W, 196, { fill: C.ink });
    /* orange hairline */
    page.rect(0, 196, W, 2.2, { fill: C.orange });

    page.text('UDUF AFRICA', M, 40, { font: 'bold', size: 13, color: C.white, tracking: 2.6 });
    page.rect(W - M - 74, 26, 74, 17, { stroke: '#3A3833', lineWidth: 0.6 });
    page.text('ADMIT ONE', W - M - 74 + 37, 37.5, {
      font: 'bold', size: 6, color: '#9C968B', tracking: 1.4, align: 'center'
    });

    page.text('2027 ACTIVE LEADERSHIP & ENTREPRENEURSHIP BOOTCAMP', M, 74, {
      font: 'bold', size: 6.4, color: '#9C968B', tracking: 1.7
    });

    page.text('YOUR IDEA. YOUR BUSINESS.', M, 112, {
      font: 'bold', size: 19, color: C.white, tracking: -0.4
    });
    page.text('YOUR LEGACY.', M, 134, {
      font: 'bold', size: 19, color: C.orange, tracking: -0.4
    });

    page.text('Building Enterprises That Stand the Test of Time', M, 158, {
      font: 'italic', size: 8.6, color: '#A9A399'
    });

    page.text('12 & 13 FEBRUARY 2027', M, 182, {
      font: 'bold', size: 8.4, color: C.orange, tracking: 1.8
    });

    /* ---------- Attendee ---------- */
    var y = 224;
    ticketLabel(page, 'Attendee', M, y);
    var nameLines = wrap(record.fullName || '', 'bold', 19, -0.3, inner);
    var nameY = y + 24;
    nameLines.slice(0, 2).forEach(function (ln, i) {
      page.text(ln, M, nameY + i * 21, { font: 'bold', size: 19, color: C.ink, tracking: -0.3 });
    });
    y = nameY + (nameLines.length > 1 ? 21 : 0) + 6;

    var orgLines = wrap(record.business || '—', 'regular', 9.6, 0, inner);
    orgLines.slice(0, 2).forEach(function (ln, i) {
      page.text(ln, M, y + 10 + i * 12, { font: 'regular', size: 9.6, color: C.muted });
    });
    y += 10 + Math.min(orgLines.length, 2) * 12 + 16;

    page.line(M, y, W - M, y, { color: C.line, width: 0.7 });
    y += 22;

    /* ---------- Detail grid ---------- */
    var col2 = M + inner * 0.42;
    var rows = [
      ['Ticket type', (ticket && ticket.name) || String(record.ticketType || '')],
      ['Registered', Uduf.util.formatDate(record.createdAt)],
      ['Status', String(record.paymentStatus || 'paid').toUpperCase()]
    ];
    rows.forEach(function (row) {
      ticketLabel(page, row[0], M, y);
      page.text(String(row[1]).toUpperCase(), M, y + 13, {
        font: 'bold', size: 9.4, color: C.ink, tracking: 0.3
      });
      y += 30;
    });

    /* Ticket code, right column */
    var codeX = col2;
    var codeY = rows.length ? 224 + 22 : y;
    ticketLabel(page, 'Unique ticket code', codeX, codeY);
    var code = String(record.ticketCode || '');
    page.text(code, codeX, codeY + 20, { font: 'mono', size: 15, color: C.ink });

    /* Barcode-style underline for the code */
    var codeW = Uduf.pdfMeasure ? Uduf.pdfMeasure(code, 'mono', 15, 0) : code.length * 9;
    page.line(codeX, codeY + 30, codeX + Math.min(codeW, inner * 0.58), codeY + 30, {
      color: C.orange, width: 1.6
    });

    /* ---------- Perforation ---------- */
    var perfY = 430;
    page.line(M, perfY, W - M, perfY, { color: '#D2CCC0', width: 0.8, dash: '2 3' });
    page.circle(M, perfY, 8, { fill: C.paper });
    page.circle(W - M, perfY, 8, { fill: C.paper });

    /* ---------- Stub ---------- */
    var stubTop = perfY + 1;
    var stubH = H - stubTop - 34;
    page.rect(M, stubTop + 6, inner, stubH, { fill: C.bone });

    var qrSize = 74;
    var qrX = W - M - 14 - qrSize;
    var qrY = stubTop + 22;
    page.rect(qrX - 7, qrY - 7, qrSize + 14, qrSize + 14, { fill: C.white });
    page.qr(record.ticketCode, qrX, qrY, qrSize, { level: 'M', quiet: 1 });

    var tx = M + 14;
    var tw = qrX - 7 - tx - 10;
    var ty = stubTop + 26;
    ticketLabel(page, 'Verification', tx, ty);
    ty += 15;
    page.text('Present this ticket', tx, ty, { font: 'bold', size: 9.4, color: C.ink, maxWidth: tw });
    ty += 12;
    page.text('for verification at the event.', tx, ty, { font: 'regular', size: 8.4, color: C.muted, maxWidth: tw });
    ty += 20;
    page.line(tx, ty, tx + 34, ty, { color: C.orange, width: 1.4 });
    ty += 16;
    page.text('Gate staff will scan the code', tx, ty, { font: 'regular', size: 7.4, color: C.faint, maxWidth: tw });
    ty += 10;
    page.text('or enter it at the verification desk.', tx, ty, { font: 'regular', size: 7.4, color: C.faint, maxWidth: tw });

    /* ---------- Footer ---------- */
    page.line(M, H - 34, W - M, H - 34, { color: C.line, width: 0.6 });
    page.text('© 2027 UDUF Africa. All rights reserved.', M, H - 18, {
      font: 'regular', size: 6.6, color: C.faint
    });
    page.text(String(event.email || 'udufafrica@gmail.com'), W - M, H - 18, {
      font: 'regular', size: 6.6, color: C.muted, align: 'right'
    });

    return doc;
  }

  /* pdf.js hands back a latin1 string of raw bytes (one char per byte).
     A Blob built straight from that string would be UTF-8 encoded, which
     mangles every byte >= 128 and corrupts the file. Convert first. */
  function toBytes(out) {
    if (out instanceof Uint8Array) return out;
    if (typeof out === 'string') {
      var bytes = new Uint8Array(out.length);
      for (var i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xFF;
      return bytes;
    }
    return new Uint8Array(out);
  }

  Uduf.pdf = {
    PDF: PDF,
    A4: A4,
    A5: A5,
    measure: measure,
    wrap: wrap,
    toBytes: toBytes,
    buildTicketPDF: buildTicketPDF,
    colours: C
  };
  Uduf.pdfMeasure = measure;
})(window);
