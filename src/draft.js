'use strict';
const { warpUp } = require('./wif');

/** Geometry of the draft for cell size c. Keep in sync with media/viewer.js. */
function layout(m, c) {
  const gap = 2 * c;
  const hasTreadling = !m.liftplan;
  const sideCols = hasTreadling ? m.treadles : m.shafts;
  return {
    c,
    gap,
    hasTreadling,
    sideCols,
    W: (m.ends + sideCols) * c + gap,
    H: (m.shafts + m.picks) * c + gap,
    dy: m.shafts * c + gap,
    sx: m.ends * c + gap,
    ex: (i) => (m.ends - 1 - i) * c,
  };
}

/** Paint the draft on any 2D-like context. Keep in sync with media/viewer.js. */
function paint(g, m, L, colors, highlight) {
  const { c, dy, sx, ex, hasTreadling } = L;
  const cell = (x, y, filled, color) => {
    g.strokeStyle = colors.grid;
    g.strokeRect(x + 0.5, y + 0.5, c - 1, c - 1);
    if (filled) {
      g.fillStyle = color || colors.fg;
      g.fillRect(x + 1, y + 1, c - 2, c - 2);
    }
  };
  for (let s = 0; s < m.shafts; s++)
    for (let i = 0; i < m.ends; i++)
      cell(ex(i), (m.shafts - 1 - s) * c, m.threading[i].includes(s + 1), m.warpColors[i]);
  if (hasTreadling) {
    for (let s = 0; s < m.shafts; s++)
      for (let t = 0; t < m.treadles; t++)
        cell(sx + t * c, (m.shafts - 1 - s) * c, m.tieup[t].includes(s + 1));
    for (let j = 0; j < m.picks; j++)
      for (let t = 0; t < m.treadles; t++)
        cell(sx + t * c, dy + j * c, m.treadling[j].includes(t + 1), m.weftColors[j]);
  } else {
    for (let j = 0; j < m.picks; j++)
      for (let s = 0; s < m.shafts; s++)
        cell(sx + s * c, dy + j * c, m.liftplan[j].includes(s + 1), m.weftColors[j]);
  }
  for (let j = 0; j < m.picks; j++)
    for (let i = 0; i < m.ends; i++) {
      g.fillStyle = warpUp(m, i, j) ? m.warpColors[i] : m.weftColors[j];
      g.fillRect(ex(i), dy + j * c, c, c);
    }
  if (highlight) {
    g.fillStyle = 'rgba(255,200,0,0.35)';
    if (highlight.end != null) g.fillRect(ex(highlight.end), 0, c, L.H);
    if (highlight.pick != null) g.fillRect(0, dy + highlight.pick * c, L.W, c);
  }
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function svgRecorder() {
  const parts = [];
  return {
    parts,
    fillStyle: '#000',
    strokeStyle: '#000',
    fillRect(x, y, w, h) {
      parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${esc(this.fillStyle)}"/>`);
    },
    strokeRect(x, y, w, h) {
      parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${esc(this.strokeStyle)}"/>`);
    },
  };
}

const MARKDOWN_COLORS = {
  fg: 'currentColor',
  grid: 'currentColor',
};

/**
 * SVG of a parsed draft. `forPreview` uses a transparent background and theme-aware
 * grid so the figure sits in the Markdown preview; otherwise a white page is used.
 */
function toSvg(model, { cell = 8, forPreview = false } = {}) {
  const L = layout(model, cell);
  const rec = svgRecorder();
  paint(rec, model, L, forPreview ? MARKDOWN_COLORS : { fg: '#222', grid: '#999' }, null);
  const w = L.W + 2;
  const h = L.H + 2;
  const bg = forPreview ? '' : '<rect width="100%" height="100%" fill="#fff"/>';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="wif-draft-svg" width="${w}" height="${h}" ` +
    `viewBox="0 0 ${w} ${h}" role="img">${bg}<g transform="translate(1 1)">${rec.parts.join('')}</g></svg>`
  );
}

module.exports = { layout, paint, toSvg };
