(function () {
  const vscode = acquireVsCodeApi();
  const canvas = document.getElementById('draft');
  const ctx = canvas.getContext('2d');
  const zoom = document.getElementById('zoom');
  const wrap = document.getElementById('wrap');
  const tip = document.getElementById('tip');
  let model = null;
  let name = '';
  let hl = null; // { end: i } | { pick: j } | { end, pick }

  const css = (v, f) => getComputedStyle(document.body).getPropertyValue(v).trim() || f;

  function warpUp(m, i, j) {
    const raised = new Set(m.liftplan ? m.liftplan[j] : m.treadling[j].flatMap((t) => m.tieup[t - 1] || []));
    const up = m.threading[i].some((s) => raised.has(s));
    return m.risingShed ? up : !up;
  }

  /** Geometry of the draft for cell size c. */
  function layout(m, c) {
    const gap = 2 * c;
    const hasTreadling = !m.liftplan;
    const sideCols = hasTreadling ? m.treadles : m.shafts;
    return {
      c, gap, hasTreadling, sideCols,
      W: (m.ends + sideCols) * c + gap,
      H: (m.shafts + m.picks) * c + gap,
      dy: m.shafts * c + gap,   // drawdown origin y
      sx: m.ends * c + gap,     // side grids origin x
      ex: (i) => (m.ends - 1 - i) * c, // end 1 on the right (weaver's view)
    };
  }

  /** Paint the draft on any 2D-like context. */
  function paint(g, m, L, colors, highlight) {
    const { c, dy, sx, ex, hasTreadling } = L;
    const cell = (x, y, filled, color) => {
      g.strokeStyle = colors.grid;
      g.strokeRect(x + .5, y + .5, c - 1, c - 1);
      if (filled) { g.fillStyle = color || colors.fg; g.fillRect(x + 1, y + 1, c - 2, c - 2); }
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

  function draw() {
    if (!model || model.error || !model.ends) return;
    const L = layout(model, +zoom.value);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.ceil((L.W + 2) * dpr);
    canvas.height = Math.ceil((L.H + 2) * dpr);
    canvas.style.width = L.W + 2 + 'px';
    canvas.style.height = L.H + 2 + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, dpr, dpr);
    ctx.clearRect(0, 0, L.W + 2, L.H + 2);
    paint(ctx, model, L, { fg: css('--vscode-foreground', '#888'), grid: css('--vscode-editorWidget-border', '#8886') }, hl);
  }

  // ---- export -------------------------------------------------------------
  const EXPORT_CELL = 16;
  const EXPORT_COLORS = { fg: '#222', grid: '#999' };

  function exportPng() {
    const L = layout(model, EXPORT_CELL);
    const off = document.createElement('canvas');
    off.width = L.W + 2;
    off.height = L.H + 2;
    const g = off.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, off.width, off.height);
    g.translate(1, 1);
    paint(g, model, L, EXPORT_COLORS, null);
    vscode.postMessage({ type: 'export', format: 'png', data: off.toDataURL('image/png') });
  }

  function exportSvg() {
    const L = layout(model, EXPORT_CELL);
    const parts = [];
    const rec = {
      fillStyle: '#000', strokeStyle: '#000',
      fillRect(x, y, w, h) { parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${this.fillStyle}"/>`); },
      strokeRect(x, y, w, h) { parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${this.strokeStyle}"/>`); },
    };
    paint(rec, model, L, EXPORT_COLORS, null);
    const w = L.W + 2, h = L.H + 2;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<rect width="${w}" height="${h}" fill="#fff"/><g transform="translate(1 1)">${parts.join('')}</g></svg>\n`;
    vscode.postMessage({ type: 'export', format: 'svg', data: svg });
  }

  // ---- hit testing --------------------------------------------------------
  function hit(x, y) {
    const m = model, L = layout(m, +zoom.value), c = L.c;
    const col = Math.floor(x / c), row = Math.floor(y / c);
    const topRows = m.shafts;
    const inEnds = x >= 0 && x < m.ends * c;
    const inSide = x >= L.sx && x < L.sx + L.sideCols * c;
    const inTop = y >= 0 && y < topRows * c;
    const inBottom = y >= L.dy && y < L.dy + m.picks * c;
    const j = Math.floor((y - L.dy) / c);
    if (inTop && inEnds) {
      const i = m.ends - 1 - col, s = m.shafts - row;
      return { kind: 'threading', i, s, on: m.threading[i].includes(s) };
    }
    if (inTop && inSide) {
      const k = Math.floor((x - L.sx) / c), s = m.shafts - row;
      if (L.hasTreadling) return { kind: 'tieup', t: k + 1, s, on: m.tieup[k].includes(s) };
      return null;
    }
    if (inBottom && inEnds) {
      const i = m.ends - 1 - col;
      return { kind: 'drawdown', i, j, up: warpUp(m, i, j) };
    }
    if (inBottom && inSide) {
      const k = Math.floor((x - L.sx) / c);
      return L.hasTreadling
        ? { kind: 'treadling', j, t: k + 1, on: m.treadling[j].includes(k + 1) }
        : { kind: 'liftplan', j, s: k + 1, on: m.liftplan[j].includes(k + 1) };
    }
    return null;
  }

  const onoff = (b) => (b ? 'on' : 'off');
  function describe(h) {
    const m = model;
    switch (h.kind) {
      case 'threading': return `End ${h.i + 1} · shaft ${h.s} · ${onoff(h.on)} · threaded on ${m.threading[h.i].join(',') || '—'}`;
      case 'tieup': return `Treadle ${h.t} · shaft ${h.s} · ${onoff(h.on)}`;
      case 'treadling': return `Pick ${h.j + 1} · treadle ${h.t} · ${onoff(h.on)}`;
      case 'liftplan': return `Pick ${h.j + 1} · shaft ${h.s} · ${onoff(h.on)}`;
      case 'drawdown': return `End ${h.i + 1}, pick ${h.j + 1} · ${h.up ? 'warp' : 'weft'} on top`;
    }
  }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left - 1, e.clientY - r.top - 1];
  }

  canvas.addEventListener('mousemove', (e) => {
    if (!model || model.error) return;
    const h = hit(...pos(e));
    if (!h) { tip.hidden = true; return; }
    tip.textContent = describe(h);
    tip.style.left = e.clientX + 14 + 'px';
    tip.style.top = e.clientY + 14 + 'px';
    tip.hidden = false;
  });
  canvas.addEventListener('mouseleave', () => { tip.hidden = true; });
  canvas.addEventListener('click', (e) => {
    if (!model || model.error) return;
    const h = hit(...pos(e));
    let next = null;
    if (h) {
      if (h.kind === 'threading') next = { end: h.i };
      else if (h.kind === 'treadling' || h.kind === 'liftplan') next = { pick: h.j };
      else if (h.kind === 'drawdown') next = { end: h.i, pick: h.j };
    }
    const same = hl && next && hl.end === next.end && hl.pick === next.pick;
    hl = same ? null : next;
    draw();
  });

  // ---- zoom / fit ---------------------------------------------------------
  function fit() {
    if (!model || !model.ends) return;
    const cols = model.ends + (model.liftplan ? model.shafts : model.treadles) + 2;
    const c = Math.floor((wrap.clientWidth - 4) / cols);
    zoom.value = Math.max(+zoom.min, Math.min(+zoom.max, c));
    draw();
  }
  wrap.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    zoom.value = Math.max(+zoom.min, Math.min(+zoom.max, +zoom.value + (e.deltaY < 0 ? 1 : -1)));
    draw();
  }, { passive: false });
  zoom.addEventListener('input', draw);
  document.getElementById('fit').addEventListener('click', fit);
  document.getElementById('png').addEventListener('click', () => model && !model.error && model.ends && exportPng());
  document.getElementById('svg').addEventListener('click', () => model && !model.error && model.ends && exportSvg());

  window.addEventListener('message', (e) => {
    if (e.data.type !== 'model') return;
    const first = !model;
    model = e.data.model;
    name = e.data.name;
    hl = null;
    const info = document.getElementById('info');
    const warn = document.getElementById('warn');
    if (model.error) {
      info.textContent = name;
      warn.textContent = 'Could not parse: ' + model.error;
      return;
    }
    info.textContent = `${model.title || name} — ${model.ends} ends × ${model.picks} picks, ${model.shafts} shafts` +
      (model.liftplan ? '' : `, ${model.treadles} treadles`);
    warn.textContent = model.warnings.join(' ');
    first ? fit() : draw();
  });
  vscode.postMessage({ type: 'ready' });
})();
