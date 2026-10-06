/* ============================================================
   QR — self-contained QR Code encoder (byte mode, versions 1-10)
   ------------------------------------------------------------
   No network calls and no third-party service, so ticket codes
   never leave the attendee's device. Implements ISO/IEC 18004:
   Reed-Solomon error correction, block interleaving, the eight
   data masks with penalty scoring, BCH format and version info.

   Usage:
     UDQFRender.svg(text, { size, ec, margin, dark, light })
   ============================================================ */

(function (global) {
  'use strict';

  /* ---------- EC level tables, versions 1-10 ---------- */
  const ECL = { L: 0, M: 1, Q: 2, H: 3 };
  const ECL_FORMAT_BITS = [1, 0, 3, 2]; // L=01 M=00 Q=11 H=10
  const ECL_NAME = ['L', 'M', 'Q', 'H'];

  const ECC_PER_BLOCK = {
    L: [7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
    M: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
    Q: [13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
    H: [17, 28, 22, 16, 22, 28, 26, 26, 24, 28],
  };

  const EC_BLOCKS = {
    L: [1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
    M: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
    Q: [1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
    H: [1, 1, 2, 4, 4, 4, 5, 6, 8, 8],
  };

  const TOTAL_CODEWORDS = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346];

  const ALIGNMENT = {
    1: [],
    2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42],
    9: [6, 26, 46], 10: [6, 28, 50],
  };

  /* remainder bits per version 1-10 */
  const REMAINDER = [0, 7, 7, 7, 7, 7, 0, 0, 0, 0];

  /* ============================================================
     Galois field GF(256), primitive polynomial 0x11D
     ============================================================ */
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);

  (function initGF() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

  /* generator polynomial of degree n */
  function rsGenerator(n) {
    let poly = [1];
    for (let i = 0; i < n; i++) {
      const next = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  function rsRemainder(data, degree) {
    const gen = rsGenerator(degree);
    const result = new Array(degree).fill(0);
    for (const byte of data) {
      const factor = byte ^ result.shift();
      result.push(0);
      for (let i = 0; i < degree; i++) result[i] ^= gfMul(gen[i + 1], factor);
    }
    return result;
  }

  /* ============================================================
     Bit buffer
     ============================================================ */
  function BitBuffer() {
    this.bits = [];
  }
  BitBuffer.prototype.put = function (value, length) {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  };

  /* ============================================================
     Segment building — byte mode, UTF-8
     ============================================================ */
  function toUtf8(str) {
    if (global.TextEncoder) return new global.TextEncoder().encode(str);
    return Array.from(unescape(encodeURIComponent(str)), (c) => c.charCodeAt(0) & 0xff);
  }

  /* ---------- modes ---------- */
  const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

  /* character-count indicator width per mode and version band */
  function countBits(mode, version) {
    const band = version <= 9 ? 0 : version <= 26 ? 1 : 2;
    if (mode === 'numeric') return [10, 12, 14][band];
    if (mode === 'alnum') return [9, 11, 13][band];
    return [8, 16, 16][band];
  }

  function modeOf(text) {
    if (/^[0-9]*$/.test(text)) return 'numeric';
    let ok = true;
    for (const ch of text) if (ALNUM.indexOf(ch) === -1) { ok = false; break; }
    return ok ? 'alnum' : 'byte';
  }

  /* payload bits excluding mode + count indicators */
  function payloadBits(mode, text) {
    if (mode === 'numeric') {
      let bits = 0;
      for (let i = 0; i < text.length; ) {
        const left = text.length - i;
        if (left >= 3) { bits += 10; i += 3; }
        else if (left === 2) { bits += 7; i += 2; }
        else { bits += 4; i += 1; }
      }
      return bits;
    }
    if (mode === 'alnum') {
      let bits = 0;
      for (let i = 0; i < text.length; i += 2) {
        bits += text.length - i >= 2 ? 11 : 6;
      }
      return bits;
    }
    return new TextEncoder().encode(text).length * 8;
  }

  function dataCapacityBytes(version, ecl) {
    const total = TOTAL_CODEWORDS[version - 1];
    const blocks = EC_BLOCKS[ECL_NAME[ecl]][version - 1];
    const ecPerBlock = ECC_PER_BLOCK[ECL_NAME[ecl]][version - 1];
    const dataCodewords = total - blocks * ecPerBlock;
    return dataCodewords - 2 - Math.ceil(countBits('byte', version) / 8);
  }

  /* Smallest version that fits, then the mode with the fewest bits. */
  function chooseVersion(text, ecl) {
    const modes = ['numeric', 'alnum', 'byte'].filter((m) => {
      if (m === 'numeric') return /^[0-9]*$/.test(text);
      if (m === 'alnum') return modeOf(text) === 'alnum';
      return true;
    });

    for (let v = 1; v <= 10; v++) {
      const total = TOTAL_CODEWORDS[v - 1];
      const blocks = EC_BLOCKS[ECL_NAME[ecl]][v - 1];
      const ecPerBlock = ECC_PER_BLOCK[ECL_NAME[ecl]][v - 1];
      const available = (total - blocks * ecPerBlock) * 8;

      let best = null;
      for (const m of modes) {
        const need = 4 + countBits(m, v) + payloadBits(m, text);
        if (need <= available && (!best || need < best.need)) best = { mode: m, need };
      }
      if (best) return { version: v, mode: best.mode };
    }
    throw new Error('QR: data too long for versions 1-10.');
  }

  const MODE_BITS = { numeric: 1, alnum: 2, byte: 4 };

  function writePayload(bb, mode, text, version) {
    bb.put(MODE_BITS[mode], 4);
    bb.put(text.length, countBits(mode, version));

    if (mode === 'numeric') {
      for (let i = 0; i < text.length;) {
        const left = text.length - i;
        if (left >= 3) { bb.put(Number(text.substr(i, 3)), 10); i += 3; }
        else if (left === 2) { bb.put(Number(text.substr(i, 2)), 7); i += 2; }
        else { bb.put(Number(text.substr(i, 1)), 4); i += 1; }
      }
    } else if (mode === 'alnum') {
      for (let i = 0; i < text.length; i += 2) {
        if (text.length - i >= 2) {
          bb.put(ALNUM.indexOf(text[i]) * 45 + ALNUM.indexOf(text[i + 1]), 11);
        } else {
          bb.put(ALNUM.indexOf(text[i]), 6);
        }
      }
    } else {
      for (const b of toUtf8(text)) bb.put(b, 8);
    }
  }

  function buildCodewords(text, version, ecl, mode) {
    const eccName = ECL_NAME[ecl];
    const blocks = EC_BLOCKS[eccName][version - 1];
    const ecPerBlock = ECC_PER_BLOCK[eccName][version - 1];
    const total = TOTAL_CODEWORDS[version - 1];
    const dataCodewords = total - blocks * ecPerBlock;

    const bb = new BitBuffer();
    writePayload(bb, mode, text, version);

    /* terminator + byte alignment */
    const capacityBits = dataCodewords * 8;
    bb.put(0, Math.min(4, capacityBits - bb.bits.length));
    while (bb.bits.length % 8 !== 0) bb.bits.push(0);

    const data = [];
    for (let i = 0; i < bb.bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) byte = (byte << 1) | bb.bits[i + j];
      data.push(byte);
    }

    /* pad codewords alternate 0xEC / 0x11 */
    const PADS = [0xec, 0x11];
    for (let i = 0; data.length < dataCodewords; i++) data.push(PADS[i % 2]);

    /* split into blocks, add EC, interleave */
    const numShort = blocks - (dataCodewords % blocks);
    const shortLen = Math.floor(dataCodewords / blocks);

    const dataBlocks = [];
    const ecBlocks = [];
    let k = 0;
    for (let i = 0; i < blocks; i++) {
      const len = shortLen + (i < numShort ? 0 : 1);
      const chunk = data.slice(k, k + len);
      k += len;
      dataBlocks.push(chunk);
      ecBlocks.push(rsRemainder(chunk, ecPerBlock));
    }

    const out = [];
    const maxData = Math.max.apply(null, dataBlocks.map((b) => b.length));
    for (let i = 0; i < maxData; i++) {
      for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
    }
    for (let i = 0; i < ecPerBlock; i++) {
      for (const block of ecBlocks) out.push(block[i]);
    }

    return out;
  }

  /* ============================================================
     Matrix
     ============================================================ */
  function makeMatrix(version, ecl) {
    const size = version * 4 + 17;
    const modules = Array.from({ length: size }, () => new Array(size).fill(false));
    const fixed = Array.from({ length: size }, () => new Array(size).fill(false));

    const setFn = (r, c, dark) => {
      modules[r][c] = dark;
      fixed[r][c] = true;
    };

    /* finder patterns + separators */
    const drawFinder = (row, col) => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const rr = row + r;
          const cc = col + c;
          if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
          const inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                         (c >= 0 && c <= 6 && (r === 0 || r === 6));
          const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          setFn(rr, cc, inRing || inCore);
        }
      }
    };
    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    /* timing patterns */
    for (let i = 8; i < size - 8; i++) {
      setFn(6, i, i % 2 === 0);
      setFn(i, 6, i % 2 === 0);
    }

    /* alignment patterns */
    const pos = ALIGNMENT[version];
    for (const r of pos) {
      for (const c of pos) {
        const nearFinder =
          (r === 6 && c === 6) ||
          (r === 6 && c === size - 7) ||
          (r === size - 7 && c === 6);
        if (nearFinder) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const ring = Math.max(Math.abs(dr), Math.abs(dc));
            setFn(r + dr, c + dc, ring !== 1);
          }
        }
      }
    }

    /* reserve format areas */
    for (let i = 0; i <= 8; i++) {
      if (i !== 6) {
        fixed[8][i] = true;
        fixed[i][8] = true;
      }
    }
    fixed[8][6] = true;
    fixed[6][8] = true;
    for (let i = 0; i < 8; i++) {
      fixed[8][size - 1 - i] = true;
      fixed[size - 1 - i][8] = true;
    }
    /* dark module */
    setFn(size - 8, 8, true);

    /* version information blocks */
    if (version >= 7) {
      let rem = version;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const bits = ((version << 12) | rem) >>> 0;
      for (let i = 0; i < 18; i++) {
        const bit = ((bits >>> i) & 1) === 1;
        const r = Math.floor(i / 3);
        const c = size - 11 + (i % 3);
        setFn(r, c, bit);
        setFn(c, r, bit);
      }
    }

    return { size, modules, fixed };
  }

  /* zigzag data placement, skipping the vertical timing column */
  function placeData(m, codewords, remainder) {
    const { size, modules, fixed } = m;
    let bitIndex = 0;

    const bitAt = (i) => {
      const byte = codewords[i >>> 3];
      if (byte === undefined) return 0;
      return ((byte >>> (7 - (i & 7))) & 1) === 1;
    };

    let upward = true;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5; // skip timing column
      for (let vert = 0; vert < size; vert++) {
        const row = upward ? size - 1 - vert : vert;
        for (let c = 0; c < 2; c++) {
          const col = right - c;
          if (fixed[row][col]) continue;
          let dark = false;
          if (bitIndex < codewords.length * 8) dark = bitAt(bitIndex);
          else if (bitIndex < codewords.length * 8 + remainder) {
            dark = false;
          } else {
            dark = false;
          }
          modules[row][col] = dark;
          bitIndex++;
        }
      }
      upward = !upward;
    }
  }

  /* ---------- data masks ---------- */
  const MASKS = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];

  function applyMask(m, maskId, version, ecl) {
    const { size, modules, fixed } = m;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (fixed[r][c]) continue;
        if (MASKS[maskId](r, c)) modules[r][c] = !modules[r][c];
      }
    }
    /* format info (placed after masking so it is not double-flipped) */
    writeFormat(m, ecl, maskId);
    /* version info */
    if (version >= 7) {
      let rem = version;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const bits = ((version << 12) | rem) >>> 0;
      for (let i = 0; i < 18; i++) {
        const bit = ((bits >>> i) & 1) === 1;
        const r = Math.floor(i / 3);
        const c = size - 11 + (i % 3);
        modules[r][c] = bit;
        modules[c][r] = bit;
      }
    }
  }

  /* ---------- format information, BCH(15,5) ---------- */
  const FORMAT_GENERATOR = 0x537;
  function formatBits(ecl, maskId) {
    const data = (ECL_FORMAT_BITS[ecl] << 3) | maskId;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * FORMAT_GENERATOR);
    return (((data << 10) | rem) ^ 0x5412) & 0x7fff;
  }

  function writeFormat(m, ecl, maskId) {
    const { size, modules } = m;
    const bits = formatBits(ecl, maskId);
    const bit = (i) => ((bits >>> i) & 1) === 1;

    /* vertical copy, column 8: rows 0-5, then 7, 8, then size-7..size-1 */
    for (let i = 0; i <= 5; i++) modules[i][8] = bit(i);
    modules[7][8] = bit(6);
    modules[8][8] = bit(7);
    modules[size - 7][8] = bit(8);
    for (let i = 9; i <= 14; i++) modules[size - 15 + i][8] = bit(i);

    /* horizontal copy, row 8: cols size-1..size-8, then 7, then 0-5 */
    for (let i = 0; i <= 7; i++) modules[8][size - 1 - i] = bit(i);
    modules[8][7] = bit(8);
    for (let i = 9; i <= 14; i++) modules[8][14 - i] = bit(i);

    /* permanently dark module */
    modules[size - 8][8] = true;
  }

/* ---------- penalty scoring (ISO/IEC 18004 section 8.8.2) ---------- */
function penalty(m) {
    const { size, modules } = m;
    let score = 0;

    /* Rule 1 — runs of five or more modules of the same colour. */
    for (let i = 0; i < size; i++) {
      let runH = 1;
      for (let j = 1; j < size; j++) {
        if (modules[i][j] === modules[i][j - 1]) runH++;
        else { if (runH >= 5) score += 3 + (runH - 5); runH = 1; }
      }
      if (runH >= 5) score += 3 + (runH - 5);

      let runV = 1;
      for (let j = 1; j < size; j++) {
        if (modules[j][i] === modules[j - 1][i]) runV++;
        else { if (runV >= 5) score += 3 + (runV - 5); runV = 1; }
      }
      if (runV >= 5) score += 3 + (runV - 5);
    }

    /* Rule 2 — 2x2 blocks of a single colour. */
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const v = modules[r][c];
        if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) score += 3;
      }
    }

    /* Rule 3 — 1:1:3:1:1 finder-like pattern with four light modules
       beside it, detected as an 11-module sliding window. */
    for (let i = 0; i < size; i++) {
      let bitsRow = 0;
      let bitsCol = 0;
      for (let j = 0; j < size; j++) {
        bitsRow = ((bitsRow << 1) & 0x7ff) | (modules[i][j] ? 1 : 0);
        if (j >= 10 && (bitsRow === 0x5d0 || bitsRow === 0x05d)) score += 40;

        bitsCol = ((bitsCol << 1) & 0x7ff) | (modules[j][i] ? 1 : 0);
        if (j >= 10 && (bitsCol === 0x5d0 || bitsCol === 0x05d)) score += 40;
      }
    }

    /* Rule 4 — deviation from an even split of dark and light. */
    let dark = 0;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (modules[r][c]) dark++;
    const percent = (dark * 100) / (size * size);
    score += Math.abs(Math.ceil(percent / 5) - 10) * 10;

    return score;
  }

  /* ============================================================
     Public: build the module matrix
     ============================================================ */
  function build(text, ecName) {
    const key = (ecName || 'Q').toUpperCase();
    const ecl = ECL[key] !== undefined ? ECL[key] : ECL.Q;

    if (typeof text !== 'string' || !text.length) throw new Error('QR: nothing to encode.');
    if (text.length > 500) throw new Error('QR: payload too long.');

    const chosen = chooseVersion(text, ecl);
    const codewords = buildCodewords(text, chosen.version, ecl, chosen.mode);
    const remainder = REMAINDER[chosen.version - 1];

    let best = null;
    let bestScore = Infinity;

    for (let maskId = 0; maskId < 8; maskId++) {
      const m = makeMatrix(chosen.version, ecl);
      placeData(m, codewords, remainder);
      applyMask(m, maskId, chosen.version, ecl);
      const s = penalty(m);
      if (s < bestScore) {
        bestScore = s;
        best = m;
      }
    }

    return {
      size: best.size,
      version: chosen.version,
      mode: chosen.mode,
      ec: ECL_NAME[ecl],
      modules: best.modules,
    };
  }

  /* ============================================================
     Rendering
     ============================================================ */
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function toSVG(text, opts) {
    const o = opts || {};
    const qr = build(text, o.ec);
    const margin = o.margin === undefined ? 4 : o.margin;
    const dark = o.dark || '#000000';
    const light = o.light || '#ffffff';
    const total = qr.size + margin * 2;

    let path = '';
    for (let r = 0; r < qr.size; r++) {
      let run = 0;
      for (let c = 0; c <= qr.size; c++) {
        const on = c < qr.size && qr.modules[r][c];
        if (on) run++;
        else if (run) {
          path += `M${c - run + margin} ${r + margin}h${run}v1h-${run}z`;
          run = 0;
        }
      }
    }

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('viewBox', `0 0 ${total} ${total}`);
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Ticket QR code');
    if (o.size) {
      svg.setAttribute('width', String(o.size));
      svg.setAttribute('height', String(o.size));
    } else {
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
    }

    const bg = document.createElementNS(SVG_NS, 'rect');
    bg.setAttribute('width', String(total));
    bg.setAttribute('height', String(total));
    bg.setAttribute('fill', light);
    svg.appendChild(bg);

    const fg = document.createElementNS(SVG_NS, 'path');
    fg.setAttribute('d', path);
    fg.setAttribute('fill', dark);
    svg.appendChild(fg);

    return svg;
  }

  global.UDUFRender = {
    build,
    toSVG,
    toString: (text, ec) => JSON.stringify(build(text, ec)),
    capacities: dataCapacityBytes,
  };
})(typeof window !== 'undefined' ? window : globalThis);