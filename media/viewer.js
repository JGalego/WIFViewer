(function () {
  const vscode = acquireVsCodeApi();
  const canvas = document.getElementById('draft');
  const ctx = canvas.getContext('2d');
  const zoom = document.getElementById('zoom');
  let model = null;
  let name = '';

  const css = (v, f) => getComputedStyle(document.body).getPropertyValue(v).trim() || f;

  function warpUp(m, i, j) {
    const raised = new Set(m.liftplan ? m.liftplan[j] : m.treadling[j].flatMap((t) => m.tieup[t - 1] || []));
    const up = m.threading[i].some((s) => raised.has(s));
    return m.risingShed ? up : !up;
  }

  function draw() {
    if (!model || model.error) return;
    const m = model;
    const c = +zoom.value;
    const gap = 2 * c;
    const fg = css('--vscode-foreground', '#888');
    const grid = css('--vscode-editorWidget-border', '#8886');
    const hasTreadling = !m.liftplan;
    const sideCols = hasTreadling ? m.treadles : m.shafts;
    const W = (m.ends + sideCols) * c + gap;
    const H = (m.shafts + m.picks) * c + gap;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr + 2 * dpr;
    canvas.height = H * dpr + 2 * dpr;
    canvas.style.width = W + 2 + 'px';
    canvas.style.height = H + 2 + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, dpr, dpr);
    ctx.clearRect(0, 0, W + 2, H + 2);

    const dx = 0, dy = m.shafts * c + gap; // drawdown origin
    const sx = m.ends * c + gap;            // side grid origin x
    // threading: shaft 1 at bottom, end 1 at right (weaver's view)
    const ex = (i) => dx + (m.ends - 1 - i) * c;
    const cell = (x, y, filled, color) => {
      ctx.strokeStyle = grid;
      ctx.strokeRect(x + .5, y + .5, c - 1, c - 1);
      if (filled) { ctx.fillStyle = color || fg; ctx.fillRect(x + 1, y + 1, c - 2, c - 2); }
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
        ctx.fillStyle = warpUp(m, i, j) ? m.warpColors[i] : m.weftColors[j];
        ctx.fillRect(ex(i), dy + j * c, c, c);
      }
  }

  window.addEventListener('message', (e) => {
    if (e.data.type !== 'model') return;
    model = e.data.model;
    name = e.data.name;
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
    draw();
  });
  zoom.addEventListener('input', draw);
  vscode.postMessage({ type: 'ready' });
})();
