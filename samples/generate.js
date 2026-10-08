'use strict';
// Regenerates the example drafts in this folder:  node samples/generate.js
const fs = require('node:fs');
const path = require('node:path');

const range = (n) => Array.from({ length: n }, (_, i) => i + 1);
const cycle = (pat, n) => Array.from({ length: n }, (_, i) => pat[i % pat.length]);

function wif(d) {
  const colors = d.colors || [[20, 40, 140], [240, 230, 200]];
  const L = [];
  const sec = (name, rows) => { L.push(`[${name}]`, ...rows.map(([k, v]) => `${k}=${v}`), ''); };
  const kv = (arr) => arr.map((v, i) => [i + 1, Array.isArray(v) ? v.join(',') : v]);
  const parts = ['COLOR PALETTE', 'TEXT', 'WEAVING', 'WARP', 'WEFT', 'COLOR TABLE', 'THREADING',
    d.liftplan ? 'LIFTPLAN' : 'TIEUP', ...(d.liftplan ? [] : ['TREADLING']),
    ...(d.warpColors ? ['WARP COLORS'] : []), ...(d.weftColors ? ['WEFT COLORS'] : [])];
  sec('WIF', [['Version', '1.1'], ['Date', 'October 8, 2026'], ['Developers', 'wifviewer'],
    ['Source Program', 'wifviewer samples'], ['Source Version', '1']]);
  sec('CONTENTS', parts.concat('WEAVING').filter((v, i, a) => a.indexOf(v) === i).map((p) => [p, 'true']));
  sec('TEXT', [['Title', d.title]]);
  sec('COLOR PALETTE', [['Range', '0,255'], ['Entries', colors.length]]);
  sec('COLOR TABLE', colors.map((c, i) => [i + 1, c.join(',')]));
  sec('WEAVING', [['Shafts', d.shafts], ['Treadles', d.treadles || 0], ['Rising Shed', d.rising !== false]]);
  sec('WARP', [['Threads', d.threading.length], ['Color', d.warpColor || 1]]);
  const picks = (d.liftplan || d.treadling).length;
  sec('WEFT', [['Threads', picks], ['Color', d.weftColor || 2]]);
  if (d.warpColors) sec('WARP COLORS', kv(d.warpColors));
  if (d.weftColors) sec('WEFT COLORS', kv(d.weftColors));
  sec('THREADING', kv(d.threading));
  if (d.liftplan) sec('LIFTPLAN', kv(d.liftplan));
  else {
    sec('TIEUP', kv(d.tieup));
    sec('TREADLING', kv(d.treadling));
  }
  return L.join('\n');
}

const twillTieup = [[1, 2], [2, 3], [3, 4], [4, 1]];
const point = [1, 2, 3, 4, 3, 2];
const D = [100, 40, 40], Lt = [240, 235, 220];

const designs = {
  'plain-weave': { title: 'Plain weave', shafts: 2, treadles: 2,
    threading: cycle([1, 2], 16), tieup: [[1], [2]], treadling: cycle([1, 2], 16) },
  'basket-weave': { title: '2/2 Basket weave', shafts: 2, treadles: 2,
    threading: cycle([1, 1, 2, 2], 16), tieup: [[1], [2]], treadling: cycle([1, 1, 2, 2], 16) },
  'herringbone': { title: 'Herringbone twill', shafts: 4, treadles: 4,
    threading: cycle([1, 2, 3, 4, 4, 3, 2, 1], 32), tieup: twillTieup, treadling: cycle([1, 2, 3, 4], 32) },
  'point-twill-diamond': { title: 'Point twill diamonds', shafts: 4, treadles: 4,
    threading: cycle(point, 36), tieup: twillTieup, treadling: cycle(point, 36) },
  'satin-5': { title: '5-end satin', shafts: 5, treadles: 5,
    threading: cycle(range(5), 20), tieup: range(5).map((t) => [((t - 1) * 2) % 5 + 1]),
    treadling: cycle(range(5), 20) },
  'sinking-shed-3-1': { title: '3/1 twill, sinking shed', shafts: 4, treadles: 4, rising: false,
    threading: cycle(range(4), 16), tieup: [[1], [2], [3], [4]], treadling: cycle(range(4), 16) },
  'houndstooth': { title: 'Houndstooth (color-and-weave)', shafts: 4, treadles: 4, colors: [D, Lt],
    threading: cycle(range(4), 32), tieup: twillTieup, treadling: cycle(range(4), 32),
    warpColors: cycle([1, 1, 1, 1, 2, 2, 2, 2], 32), weftColors: cycle([1, 1, 1, 1, 2, 2, 2, 2], 32) },
  'rainbow-stripes': { title: 'Rainbow warp stripes', shafts: 2, treadles: 2, weftColor: 7,
    colors: [[200, 40, 40], [230, 130, 30], [235, 205, 40], [50, 160, 70], [40, 100, 200], [130, 60, 170], [245, 240, 225]],
    threading: cycle([1, 2], 36), tieup: [[1], [2]], treadling: cycle([1, 2], 24),
    warpColors: cycle([1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6], 36) },
  'dobby-liftplan': { title: 'Dobby crepe (liftplan)', shafts: 8,
    threading: range(8).concat(range(8), range(8), range(8)),
    liftplan: Array.from({ length: 32 }, (_, j) => range(8).filter((s) => (s * (j + 1)) % 5 < 2)) },
};

for (const [name, d] of Object.entries(designs)) {
  fs.writeFileSync(path.join(__dirname, `${name}.wif`), wif(d));
}
console.log(`wrote ${Object.keys(designs).length} samples`);
