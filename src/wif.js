'use strict';

/** Parse INI-style WIF text into { SECTION: { key: value } } (keys lower-cased, sections upper-cased). */
function parseIni(text) {
  const out = {};
  let cur = null;
  for (const raw of text.replace(/^﻿/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith(';')) continue;
    const sec = /^\[([^\]]+)\]/.exec(line);
    if (sec) {
      cur = out[sec[1].trim().toUpperCase()] ||= {};
      continue;
    }
    const eq = line.indexOf('=');
    if (eq < 0 || !cur) continue;
    cur[line.slice(0, eq).trim().toLowerCase()] = line.slice(eq + 1).replace(/\s;.*$/, '').trim();
  }
  return out;
}

const isTrue = (v, dflt) => (v === undefined ? dflt : /^(true|yes|on|1)$/i.test(v));
const ints = (v) => (v || '').split(',').map((s) => parseInt(s, 10)).filter(Number.isFinite);

/** Convert a colour entry (r,g,b) scaled from the palette range to a CSS rgb() string. */
function makeColor(entry, lo, hi) {
  const c = ints(entry);
  if (c.length < 3 || hi === lo) return null;
  const [r, g, b] = c.map((x) => Math.max(0, Math.min(255, Math.round(((x - lo) / (hi - lo)) * 255))));
  return `rgb(${r},${g},${b})`;
}

/**
 * Build a drawing model from WIF text.
 * Returns { title, ends, picks, shafts, treadles, risingShed, threading[], treadling[], tieup[],
 *           liftplan[]|null, warpColors[], weftColors[], warnings[] }
 * threading[i]: shafts (array) for end i. treadling[j]: treadles (array) for pick j.
 * tieup[t]: shafts (array) for treadle t (1-based keys → 0-based array index t-1).
 */
function parseWif(text) {
  const ini = parseIni(text);
  const warnings = [];
  if (!ini.WIF && !ini.WEAVING) warnings.push('Missing [WIF]/[WEAVING] section; is this a WIF file?');

  const weaving = ini.WEAVING || {};
  const warp = ini.WARP || {};
  const weft = ini.WEFT || {};

  const indexed = (sec) =>
    Object.entries(sec || {})
      .filter(([k]) => /^\d+$/.test(k))
      .map(([k, v]) => [parseInt(k, 10), ints(v)]);

  const threadingE = indexed(ini.THREADING);
  const treadlingE = indexed(ini.TREADLING);
  const liftE = indexed(ini.LIFTPLAN);
  const tieupE = indexed(ini.TIEUP);

  const maxKey = (e) => e.reduce((m, [k]) => Math.max(m, k), 0);
  const ends = parseInt(warp.threads, 10) || maxKey(threadingE);
  const picks = parseInt(weft.threads, 10) || maxKey(treadlingE.length ? treadlingE : liftE);
  const shafts =
    parseInt(weaving.shafts, 10) ||
    Math.max(0, ...threadingE.flatMap(([, v]) => v), ...tieupE.flatMap(([, v]) => v), ...liftE.flatMap(([, v]) => v));
  const treadles =
    parseInt(weaving.treadles, 10) || Math.max(0, maxKey(tieupE), ...treadlingE.flatMap(([, v]) => v));

  const threading = Array.from({ length: ends }, () => []);
  for (const [k, v] of threadingE) if (k >= 1 && k <= ends) threading[k - 1] = v;
  const treadling = Array.from({ length: picks }, () => []);
  for (const [k, v] of treadlingE) if (k >= 1 && k <= picks) treadling[k - 1] = v;
  const tieup = Array.from({ length: treadles }, () => []);
  for (const [k, v] of tieupE) if (k >= 1 && k <= treadles) tieup[k - 1] = v;
  let liftplan = null;
  if (liftE.length && !treadlingE.length) {
    liftplan = Array.from({ length: picks }, () => []);
    for (const [k, v] of liftE) if (k >= 1 && k <= picks) liftplan[k - 1] = v;
  }
  if (!ends) warnings.push('No warp threads found.');
  if (!picks) warnings.push('No weft picks found.');

  // Colours
  const pal = ini['COLOR PALETTE'] || {};
  const [lo, hi] = ints(pal.range).length === 2 ? ints(pal.range) : [0, 255];
  const table = {};
  for (const [k, v] of Object.entries(ini['COLOR TABLE'] || {})) {
    if (/^\d+$/.test(k)) table[k] = makeColor(v, lo, hi);
  }
  const colorOf = (idx, dflt) => (idx != null && table[idx] ? table[idx] : dflt);
  const defWarp = colorOf(warp.color, '#1e3a8a');
  const defWeft = colorOf(weft.color, '#f5f0e1');
  const perThread = (sec, n, dflt) => {
    const arr = Array(n).fill(dflt);
    for (const [k, v] of Object.entries(sec || {})) {
      const i = parseInt(k, 10);
      if (/^\d+$/.test(k) && i >= 1 && i <= n) arr[i - 1] = colorOf(parseInt(v, 10), dflt);
    }
    return arr;
  };

  return {
    title: (ini.TEXT && ini.TEXT.title) || '',
    author: (ini.TEXT && ini.TEXT.author) || '',
    ends,
    picks,
    shafts,
    treadles,
    risingShed: isTrue(weaving['rising shed'], true),
    threading,
    treadling,
    tieup,
    liftplan,
    warpColors: perThread(ini['WARP COLORS'], ends, defWarp),
    weftColors: perThread(ini['WEFT COLORS'], picks, defWeft),
    warnings,
  };
}

/** True where the warp thread is on top at (end i, pick j). */
function warpUp(model, i, j) {
  const raised = new Set(model.liftplan ? model.liftplan[j] : model.treadling[j].flatMap((t) => model.tieup[t - 1] || []));
  const up = model.threading[i].some((s) => raised.has(s));
  return model.risingShed ? up : !up;
}

module.exports = { parseIni, parseWif, warpUp };
