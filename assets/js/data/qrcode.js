/* =========================================================
   UDUF AFRICA — QR code encoder
   ------------------------------------------------------------
   Small, dependency-free QR encoder (byte mode, EC level M,
   versions 1–10). Ticket payloads are short, so this covers the
   whole range we need with no external library and no network.

   Reference: ISO/IEC 18004. Reed–Solomon over GF(256), poly 0x11D.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};

  /* ---- EC block table, versions 1–10 ----
     [ecCodewordsPerBlock, blocksInGroup1, dataWordsInGroup1,
      blocksInGroup2, dataWordsInGroup2] */
  var EC_TABLE = {
    L: [[7,1,19,0,0],[10,1,34,0,0],[15,1,55,0,0],[20,1,80,0,0],[26,1,108,0,0],
        [18,2,68,0,0],[20,2,78,0,0],[24,2,97,0,0],[30,2,116,0,0],[18,2,68,2,69]],
    M: [[10,1,16,0,0],[16,1,28,0,0],[26,1,44,0,0],[18,2,32,0,0],[24,2,43,0,0],
        [16,4,27,0,0],[18,4,31,0,0],[22,2,38,2,39],[22,3,36,2,37],[26,4,43,1,44]],
    Q: [[13,1,13,0,0],[22,1,22,0,0],[18,2,17,0,0],[26,2,24,0,0],[18,2,15,2,16],
        [24,4,19,0,0],[18,2,14,4,15],[22,4,18,2,19],[20,4,16,4,17],[24,6,19,2,20]],
    H: [[17,1,9,0,0],[28,1,16,0,0],[22,2,13,0,0],[16,4,9,0,0],[22,2,11,2,12],
        [28,4,15,0,0],[26,4,13,1,14],[26,4,14,2,15],[24,4,12,4,13],[28,6,15,2,16]]
  };

  var TOTAL_WORDS = [0,26,44,70,100,134,172,196,242,292,346];

  /* Alignment pattern centre coordinates per version. */
  var ALIGN = [null, [], [6,18], [6,22], [6,26], [6,30],
               [6,34], [6,22,38], [6,24,42], [6,26,46], [6,28,50]];

  /* Format-info EC level bits. */
  var EC_BITS = { L: 1, M: 0, Q: 3, H: 2 };

  /* ---- GF(256) ---- */
  var EXP = new Uint8Array(512);
  var LOG = new Uint8Array(256);
  (function initGF() {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  /* Generator polynomial for n error-correction codewords. */
  function generatorPoly(n) {
    var poly = [1];
    for (var i = 0; i < n; i++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  function rsEncode(data, ecLen) {
    var gen = generatorPoly(ecLen);
    var rem = new Array(ecLen).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ rem[0];
      rem.shift();
      rem.push(0);
      if (factor !== 0) {
        for (var j = 0; j < ecLen; j++) {
          rem[j] ^= gfMul(gen[j + 1], factor);
        }
      }
    }
    return rem;
  }

  /* ---- BCH helpers for format + version information ---- */
  function bchFormat(data) {
    var d = data << 10;
    for (var i = 14; i >= 10; i--) {
      if ((d >> i) & 1) d ^= 0x537 << (i - 10);
    }
    return ((data << 10) | d) ^ 0x5412;
  }

  function bchVersion(version) {
    var d = version << 12;
    for (var i = 17; i >= 12; i--) {
      if ((d >> i) & 1) d ^= 0x1F25 << (i - 12);
    }
    return (version << 12) | d;
  }

  /* ---- Capacity ---- */
  function dataCapacity(version, level) {
    var row = EC_TABLE[level][version - 1];
    return row[1] * row[2] + row[3] * row[4];
  }

  /* ---- Bit buffer ---- */
  function Bits() { this.bytes = []; this.length = 0; }
  Bits.prototype.put = function (value, bits) {
    for (var i = bits - 1; i >= 0; i--) {
      var bit = (value >>> i) & 1;
      var idx = this.length >>> 3;
      if (this.bytes.length <= idx) this.bytes.push(0);
      if (bit) this.bytes[idx] |= 0x80 >>> (this.length & 7);
      this.length++;
    }
  };
  Bits.prototype.toBytes = function () { return this.bytes; };

  function utf8Bytes(str) {
    if (global.TextEncoder) return Array.from(new global.TextEncoder().encode(str));
    return unescape(encodeURIComponent(str)).split('').map(function (c) { return c.charCodeAt(0); });
  }

  /* ---- Matrix ---- */
  function Matrix(size) {
    this.size = size;
    this.modules = new Uint8Array(size * size);
    this.reserved = new Uint8Array(size * size);
  }
  Matrix.prototype.get = function (r, c) { return this.modules[r * this.size + c]; };
  Matrix.prototype.set = function (r, c, dark, reserve) {
    this.modules[r * this.size + c] = dark ? 1 : 0;
    if (reserve) this.reserved[r * this.size + c] = 1;
  };
  Matrix.prototype.isReserved = function (r, c) { return this.reserved[r * this.size + c] === 1; };

  function placeFinder(m, row, col) {
    for (var r = -1; r <= 7; r++) {
      for (var c = -1; c <= 7; c++) {
        var rr = row + r, cc = col + c;
        if (rr < 0 || rr >= m.size || cc < 0 || cc >= m.size) continue;
        var inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                     (c >= 0 && c <= 6 && (r === 0 || r === 6));
        var inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        m.set(rr, cc, inRing || inCore, true);
      }
    }
  }

  function placeAlignment(m, row, col) {
    for (var r = -2; r <= 2; r++) {
      for (var c = -2; c <= 2; c++) {
        var dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
        m.set(row + r, col + c, dark, true);
      }
    }
  }

  function placeTiming(m) {
    for (var i = 8; i < m.size - 8; i++) {
      var dark = i % 2 === 0;
      if (!m.isReserved(6, i)) m.set(6, i, dark, true);
      if (!m.isReserved(i, 6)) m.set(i, 6, dark, true);
    }
  }

  function placeDarkModule(m) {
    m.set(m.size - 8, 8, true, true);
  }

  /* Reserve exactly the 15+15 format modules plus the dark module, so the
     mask never touches them. (6,8) and (8,6) are timing, not format. */
  function reserveFormat(m) {
    var i, size = m.size;
    for (i = 0; i < 6; i++)  m.set(i, 8, false, true);
    for (i = 6; i < 8; i++)  m.set(i + 1, 8, false, true);
    for (i = 8; i < 15; i++) m.set(size - 15 + i, 8, false, true);
    for (i = 0; i < 8; i++)  m.set(8, size - i - 1, false, true);
    m.set(8, 7, false, true);
    for (i = 9; i < 15; i++) m.set(8, 14 - i, false, true);
    placeDarkModule(m);
  }

  function reserveVersion(m, version) {
    if (version < 7) return;
    for (var i = 0; i < 18; i++) {
      var r = Math.floor(i / 3), c = m.size - 11 + (i % 3);
      m.set(r, c, false, true);
      m.set(c, r, false, true);
    }
  }

  function placeFormat(m, level, mask) {
    var bits = bchFormat((EC_BITS[level] << 3) | mask);
    for (var i = 0; i < 15; i++) {
      var dark = ((bits >> i) & 1) === 1;
      /* vertical copy — column 8 */
      if (i < 6) m.set(i, 8, dark, true);
      else if (i < 8) m.set(i + 1, 8, dark, true);
      else m.set(m.size - 15 + i, 8, dark, true);
      /* horizontal copy — row 8 */
      if (i < 8) m.set(8, m.size - i - 1, dark, true);
      else if (i < 9) m.set(8, 15 - i, dark, true);
      else m.set(8, 14 - i, dark, true);
    }
    /* permanently dark module */
    m.set(m.size - 8, 8, true, true);
  }

  function placeVersion(m, version) {
    if (version < 7) return;
    var bits = bchVersion(version);
    for (var i = 0; i < 18; i++) {
      var dark = ((bits >> i) & 1) === 1;
      var r = Math.floor(i / 3), c = m.size - 11 + (i % 3);
      m.set(r, c, dark, true);
      m.set(c, r, dark, true);
    }
  }

  /* Zig-zag data placement, right to left, skipping the vertical timing column. */
  function placeData(m, bytes) {
    var bitIndex = 0;
    var totalBits = bytes.length * 8;
    var upward = true;
    for (var col = m.size - 1; col > 0; col -= 2) {
      if (col === 6) col--; /* skip vertical timing pattern */
      for (var step = 0; step < m.size; step++) {
        var row = upward ? m.size - 1 - step : step;
        for (var k = 0; k < 2; k++) {
          var c = col - k;
          if (m.isReserved(row, c)) continue;
          var dark = false;
          if (bitIndex < totalBits) {
            dark = ((bytes[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) === 1;
          }
          m.set(row, c, dark, false);
          bitIndex++;
        }
      }
      upward = !upward;
    }
  }

  function maskAt(mask, r, c) {
    switch (mask) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      case 7: return (((r * c) % 3) + ((r + c) % 2)) % 2 === 0;
      default: return false;
    }
  }

  function applyMask(m, mask) {
    for (var r = 0; r < m.size; r++) {
      for (var c = 0; c < m.size; c++) {
        if (m.isReserved(r, c)) continue;
        if (maskAt(mask, r, c)) {
          m.modules[r * m.size + c] ^= 1;
        }
      }
    }
  }

  /* ---- Penalty scoring (ISO/IEC 18004 section 8.8.2) ---- */
  function penalty(m) {
    var size = m.size;
    var score = 0;
    var r, c, i, run, dark;

    /* Rule 1: runs of 5+ */
    for (r = 0; r < size; r++) {
      run = 1;
      for (c = 1; c < size; c++) {
        if (m.get(r, c) === m.get(r, c - 1)) {
          run++;
          if (run === 5) score += 3; else if (run > 5) score += 1;
        } else run = 1;
      }
    }
    for (c = 0; c < size; c++) {
      run = 1;
      for (r = 1; r < size; r++) {
        if (m.get(r, c) === m.get(r - 1, c)) {
          run++;
          if (run === 5) score += 3; else if (run > 5) score += 1;
        } else run = 1;
      }
    }

    /* Rule 2: 2x2 blocks */
    for (r = 0; r < size - 1; r++) {
      for (c = 0; c < size - 1; c++) {
        var v = m.get(r, c);
        if (v === m.get(r, c + 1) && v === m.get(r + 1, c) && v === m.get(r + 1, c + 1)) score += 3;
      }
    }

    /* Rule 3: finder-like patterns 1011101 with 4 light modules */
    var pattern1 = [1,0,1,1,1,0,1,0,0,0,0];
    var pattern2 = [0,0,0,0,1,0,1,1,1,0,1];
    function matches(get, idx, pat) {
      for (var k = 0; k < pat.length; k++) if (get(idx + k) !== pat[k]) return false;
      return true;
    }
    for (r = 0; r < size; r++) {
      for (c = 0; c + 11 <= size; c++) {
        var rowGet = (function (rr) { return function (i) { return m.get(rr, i); }; })(r);
        if (matches(rowGet, c, pattern1) || matches(rowGet, c, pattern2)) score += 40;
      }
    }
    for (c = 0; c < size; c++) {
      for (r = 0; r + 11 <= size; r++) {
        var colGet = (function (cc) { return function (i) { return m.get(i, cc); }; })(c);
        if (matches(colGet, r, pattern1) || matches(colGet, r, pattern2)) score += 40;
      }
    }

    /* Rule 4: dark/light balance */
    dark = 0;
    for (i = 0; i < m.modules.length; i++) dark += m.modules[i];
    var ratio = (dark * 100) / m.modules.length;
    var deviation = Math.abs(ratio - 50);
    score += Math.floor(deviation / 5) * 10;

    return score;
  }

  /* ---- Build the final codeword stream ---- */
  function interleave(dataWords, ecWords, level, version) {
    var row = EC_TABLE[level][version - 1];
    var ecLen = row[0];
    var blocks = [];
    var offset = 0;
    var i;
    for (i = 0; i < row[1]; i++) { blocks.push(dataWords.slice(offset, offset + row[2])); offset += row[2]; }
    for (i = 0; i < row[3]; i++) { blocks.push(dataWords.slice(offset, offset + row[4])); offset += row[4]; }

    var ecBlocks = blocks.map(function (b) { return rsEncode(b, ecLen); });
    var total = row[1] + row[3];
    var out = [];
    var maxData = Math.max.apply(null, blocks.map(function (b) { return b.length; }));
    for (i = 0; i < maxData; i++) {
      for (var b = 0; b < total; b++) {
        if (i < blocks[b].length) out.push(blocks[b][i]);
      }
    }
    for (i = 0; i < ecLen; i++) {
      for (var e = 0; e < total; e++) out.push(ecBlocks[e][i]);
    }
    return out;
  }

  /**
   * Encode a string as a QR matrix.
   * @param {string} text
   * @param {{level?:'L'|'M'|'Q'|'H', minVersion?:number}} [opts]
   * @returns {{size:number, modules:Uint8Array, version:number, level:string}}
   */
  function encode(text, opts) {
    opts = opts || {};
    var level = opts.level || 'M';
    var payload = utf8Bytes(String(text === null || text === undefined ? '' : text));

    var version = 0;
    var floorVersion = Math.max(1, opts.minVersion || 1);
    for (var v = floorVersion; v <= 10; v++) {
      var countBits = v < 10 ? 8 : 16;
      var needed = Math.ceil((4 + countBits + payload.length * 8) / 8);
      if (needed <= dataCapacity(v, level)) { version = v; break; }
    }
    if (!version) throw new Error('QR payload too long for the supported range.');

    var countBits = version < 10 ? 8 : 16;
    var capacityBits = dataCapacity(version, level) * 8;
    var bits = new Bits();
    bits.put(4, 4);                      /* byte mode */
    bits.put(payload.length, countBits);
    payload.forEach(function (b) { bits.put(b, 8); });
    /* terminator + byte alignment */
    var remaining = capacityBits - bits.length;
    bits.put(0, Math.min(4, remaining));
    while (bits.length % 8 !== 0) bits.put(0, 1);
    var words = bits.toBytes();
    var padBytes = [0xEC, 0x11];
    var p = 0;
    while (words.length < dataCapacity(version, level)) {
      words.push(padBytes[p++ % 2]);
    }

    var stream = interleave(words, null, level, version);
    var streamBytes = stream.map(function (n) { return n & 0xFF; });
    /* Remainder bits are zero and already handled by placeData. */

    var size = version * 4 + 17;
    var best = null;
    for (var mask = 0; mask < 8; mask++) {
      var m = new Matrix(size);
      placeFinder(m, 0, 0);
      placeFinder(m, 0, size - 7);
      placeFinder(m, size - 7, 0);
      var centres = ALIGN[version] || [];
      for (var a = 0; a < centres.length; a++) {
        for (var b = 0; b < centres.length; b++) {
          /* Skip the three finder corners. */
          if ((a === 0 && b === 0) ||
              (a === 0 && b === centres.length - 1) ||
              (a === centres.length - 1 && b === 0)) continue;
          placeAlignment(m, centres[a], centres[b]);
        }
      }
      placeTiming(m);
      placeDarkModule(m);
      reserveFormat(m);
      reserveVersion(m, version);
      placeData(m, streamBytes);
      applyMask(m, mask);
      placeFormat(m, level, mask);
      placeVersion(m, version);

      var score = penalty(m);
      if (!best || score < best.score) best = { score: score, matrix: m, mask: mask };
    }

    return {
      size: size,
      version: version,
      level: level,
      mask: best.mask,
      modules: best.matrix.modules
    };
  }

  /* ---- Renderers ---- */

  /** Render to an SVG string. `quiet` is the quiet-zone width in modules. */
  function toSVG(text, opts) {
    opts = opts || {};
    var qr = encode(text, opts);
    var quiet = opts.quiet === undefined ? 2 : opts.quiet;
    var dim = qr.size + quiet * 2;
    var fg = opts.fg || '#0a0a0b';
    var bg = opts.bg || '#ffffff';
    var radius = opts.radius === undefined ? 0 : opts.radius;
    var path = [];
    for (var r = 0; r < qr.size; r++) {
      var c = 0;
      while (c < qr.size) {
        if (qr.modules[r * qr.size + c]) {
          var start = c;
          while (c < qr.size && qr.modules[r * qr.size + c]) c++;
          var w = c - start;
          var x = quiet + start, y = quiet + r;
          if (radius > 0) {
            path.push('M' + (x + radius) + ' ' + y + 'h' + (w - 2 * radius) +
                      'a' + radius + ' ' + radius + ' 0 0 1 ' + radius + ' ' + radius +
                      'v' + (1 - 2 * radius) +
                      'a' + radius + ' ' + radius + ' 0 0 1 ' + (-radius) + ' ' + radius +
                      'h' + (-(w - 2 * radius)) +
                      'a' + radius + ' ' + radius + ' 0 0 1 ' + (-radius) + ' ' + (-radius) +
                      'v' + (-(1 - 2 * radius)) +
                      'a' + radius + ' ' + radius + ' 0 0 1 ' + radius + ' ' + (-radius) + 'z');
          } else {
            path.push('M' + x + ' ' + y + 'h' + w + 'v1h-' + w + 'z');
          }
        } else c++;
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + ' ' + dim + '" ' +
           'shape-rendering="crispEdges" role="img" aria-label="Ticket QR code">' +
           '<rect width="' + dim + '" height="' + dim + '" fill="' + bg + '"/>' +
           '<path d="' + path.join('') + '" fill="' + fg + '"/>' +
           '</svg>';
  }

  /** Render onto a canvas at a crisp device-pixel size. */
  function toCanvas(canvas, text, opts) {
    opts = opts || {};
    var quiet = opts.quiet === undefined ? 2 : opts.quiet;
    var qr = encode(text, opts);
    var dim = qr.size + quiet * 2;
    var scale = opts.scale || 4;
    var size = dim * scale;
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = opts.bg || '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = opts.fg || '#0a0a0b';
    for (var r = 0; r < qr.size; r++) {
      for (var c = 0; c < qr.size; c++) {
        if (qr.modules[r * qr.size + c]) {
          ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
        }
      }
    }
    return canvas;
  }

  Uduf.qr = { encode: encode, toSVG: toSVG, toCanvas: toCanvas };
})(window);
