/**
 * Compact QR Code Generator — Byte mode, EC Level L, Versions 1-6
 */
const _e = new Array(510), _l = new Array(256);
!function () {
  for (let x = 1, i = 0; i < 255; i++) {
    _e[i] = x; _l[x] = i;
    x = (x * 2) ^ (x >> 7 ? 0x11d : 0);
  }
  for (let i = 0; i < 255; i++) _e[i + 255] = _e[i];
}();

function gfMul(a, b) { return a && b ? _e[_l[a] + _l[b]] : 0 }

function rsEncode(data, n) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    let ng = Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= gfMul(g[j], _e[i]) }
    g = ng;
  }
  let m = data.concat(Array(n).fill(0));
  for (let i = 0; i < data.length; i++) {
    let c = m[i]; if (c) for (let j = 1; j < g.length; j++) m[i + j] ^= gfMul(g[j], c);
  }
  return m.slice(data.length);
}

// [totalDataCW, ecPerBlock, numBlocks]
const VT = [null, [19, 7, 1], [34, 10, 1], [55, 15, 1], [80, 20, 1], [108, 26, 1], [136, 18, 2]];
const AP = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]];

function generate(text) {
  var bytes = [];
  for (var i = 0; i < text.length; i++) {
    var c = text.charCodeAt(i);
    if (c < 128) bytes.push(c);
    else if (c < 2048) bytes.push(192 | (c >> 6), 128 | (c & 63));
    else bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
  }

  var ver = 1;
  for (; ver <= 6; ver++) if (16 + bytes.length * 8 <= VT[ver][0] * 8) break;
  if (ver > 6) ver = 6;

  var dcw = VT[ver][0], ecpb = VT[ver][1], nb = VT[ver][2];
  var sz = ver * 4 + 17;

  var bits = [];
  function push(v, n) { for (var i = n - 1; i >= 0; i--) bits.push((v >> i) & 1) }
  push(4, 4);
  push(bytes.length, 8);
  for (var bi = 0; bi < bytes.length; bi++) push(bytes[bi], 8);
  push(0, Math.min(4, dcw * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  var pad = true;
  while (bits.length < dcw * 8) { push(pad ? 0xEC : 0x11, 8); pad = !pad }

  var cw = [];
  for (var i = 0; i < bits.length; i += 8) {
    var v = 0; for (var j = 0; j < 8; j++) v = (v << 1) | bits[i + j]; cw.push(v);
  }

  var bpc = Math.floor(dcw / nb);
  var blocks = [];
  for (var i = 0; i < nb; i++) blocks.push(cw.slice(i * bpc, (i + 1) * bpc));
  var ecbs = [];
  for (var i = 0; i < nb; i++) ecbs.push(rsEncode(blocks[i], ecpb));

  var stream = [];
  for (var i = 0; i < bpc; i++) for (var b = 0; b < nb; b++) stream.push(blocks[b][i]);
  for (var i = 0; i < ecpb; i++) for (var b = 0; b < nb; b++) stream.push(ecbs[b][i]);

  var M = [], R = [];
  for (var r = 0; r < sz; r++) {
    M[r] = []; R[r] = [];
    for (var c = 0; c < sz; c++) { M[r][c] = false; R[r][c] = false }
  }

  function setFinder(r0, c0) {
    for (var r = -1; r <= 7; r++) for (var c = -1; c <= 7; c++) {
      var rr = r0 + r, cc = c0 + c;
      if (rr < 0 || rr >= sz || cc < 0 || cc >= sz) continue;
      R[rr][cc] = true;
      var outer = r === -1 || r === 7 || c === -1 || c === 7;
      var border = r === 0 || r === 6 || c === 0 || c === 6;
      var center = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      M[rr][cc] = outer ? false : border || center;
    }
  }
  setFinder(0, 0); setFinder(0, sz - 7); setFinder(sz - 7, 0);

  for (var i = 8; i < sz - 8; i++) {
    M[6][i] = i % 2 === 0; R[6][i] = true;
    M[i][6] = i % 2 === 0; R[i][6] = true;
  }

  if (ver >= 2) {
    var ap = AP[ver];
    for (var ai = 0; ai < ap.length; ai++) for (var aj = 0; aj < ap.length; aj++) {
      var ar = ap[ai], ac = ap[aj];
      if ((ar < 9 && ac < 9) || (ar < 9 && ac > sz - 9) || (ar > sz - 9 && ac < 9)) continue;
      for (var dr = -2; dr <= 2; dr++) for (var dc = -2; dc <= 2; dc++) {
        M[ar + dr][ac + dc] = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
        R[ar + dr][ac + dc] = true;
      }
    }
  }

  M[sz - 8][8] = true; R[sz - 8][8] = true;

  function reserve(r, c) { if (r >= 0 && r < sz && c >= 0 && c < sz) { R[r][c] = true; M[r][c] = false } }
  for (var i = 0; i < 9; i++) { reserve(8, i); reserve(i, 8) }
  for (var i = 0; i < 8; i++) { reserve(8, sz - 1 - i); reserve(sz - 1 - i, 8) }

  var bitIdx = 0;
  function getBit() {
    if (bitIdx >= stream.length * 8) return 0;
    return (stream[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
  }

  var up = true;
  for (var cp = sz - 1; cp >= 1; cp -= 2) {
    if (cp === 6) cp = 5;
    for (var v = 0; v < sz; v++) {
      var row = up ? sz - 1 - v : v;
      for (var j = 0; j < 2; j++) {
        var col = cp - j;
        if (col < 0 || R[row][col]) continue;
        M[row][col] = !!getBit();
        bitIdx++;
      }
    }
    up = !up;
  }

  for (var r = 0; r < sz; r++) for (var c = 0; c < sz; c++) {
    if (!R[r][c] && (r + c) % 2 === 0) M[r][c] = !M[r][c];
  }

  var fmtData = 8;
  var d = fmtData << 10;
  for (var i = 14; i >= 10; i--) if (d & (1 << i)) d ^= 0x537 << (i - 10);
  var fmt = ((fmtData << 10) | d) ^ 0x5412;

  var fb = [];
  for (var i = 14; i >= 0; i--) fb.push((fmt >> i) & 1);

  var p1 = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
  [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
  var p2 = [];
  for (var i = 0; i < 7; i++) p2.push([sz - 1 - i, 8]);
  for (var i = 0; i < 8; i++) p2.push([8, sz - 8 + i]);

  for (var i = 0; i < 15; i++) {
    M[p1[i][0]][p1[i][1]] = !!fb[i];
    M[p2[i][0]][p2[i][1]] = !!fb[i];
  }

  return { matrix: M, size: sz };
}

module.exports = { generate: generate };
