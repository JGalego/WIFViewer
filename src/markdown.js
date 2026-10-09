'use strict';
const fs = require('fs');
const { parseWif } = require('./wif');
const { toSvg } = require('./draft');

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Original image path, before VS Code rewrites `src` to a webview URI. */
function imageSrc(token) {
  const raw = token.attrGet('data-src') || token.attrGet('src') || '';
  try {
    return decodeURIComponent(raw.split('#')[0].split('?')[0]);
  } catch {
    return raw;
  }
}

function isWifPath(src) {
  if (!src || /^(https?|data|mailto):/i.test(src)) return false;
  return /\.wif$/i.test(src);
}

function defaultResolve(src, env) {
  const vscode = require('vscode');
  const doc = env && env.currentDocument;
  if (!doc) return null;
  try {
    if (/^file:/i.test(src)) return vscode.Uri.parse(src).fsPath;
    const parts = src.replace(/\\/g, '/').split('/').filter((p) => p && p !== '.');
    return vscode.Uri.joinPath(doc, '..', ...parts).fsPath;
  } catch {
    return null;
  }
}

function errorFigure(src, message) {
  return `<figure class="wif-draft wif-draft-error"><p>${esc(message)}</p><p><code>${esc(src)}</code></p></figure>`;
}

function renderWifFile(src, env, opts = {}) {
  const resolve = opts.resolve || defaultResolve;
  const readFile = opts.readFile || ((p) => fs.readFileSync(p, 'utf8'));
  const path = resolve(src, env);
  if (!path) return errorFigure(src, 'Could not resolve WIF path (is the Markdown file saved?)');
  let text;
  try {
    text = readFile(path);
  } catch {
    return errorFigure(src, 'WIF file not found');
  }
  let model;
  try {
    model = parseWif(text);
  } catch (e) {
    return errorFigure(src, 'Could not parse WIF: ' + (e && e.message ? e.message : e));
  }
  if (!model.ends || !model.picks) return errorFigure(src, 'WIF file has no warp or weft threads');
  const alt = (opts.alt || '').trim();
  const caption = alt || model.title || '';
  const svg = toSvg(model, { cell: opts.cell || 8, forPreview: true });
  const cap = caption ? `<figcaption>${esc(caption)}</figcaption>` : '';
  return `<figure class="wif-draft">${svg}${cap}</figure>`;
}

function plugin(md, opts = {}) {
  // VS Code installs its own `image` renderer after contributed markdown-it
  // plugins. Give WIF images a distinct token type so that renderer cannot
  // overwrite ours.
  md.core.ruler.after('inline', 'wif_images', (state) => {
    const visit = (tokens) => {
      for (const token of tokens || []) {
        if (token.type === 'image' && isWifPath(imageSrc(token))) token.type = 'wif_image';
        if (token.children) visit(token.children);
      }
    };
    visit(state.tokens);
  });

  md.renderer.rules.wif_image = (tokens, idx, options, env) => {
    const src = imageSrc(tokens[idx]);
    const alt = tokens[idx].content || '';
    return renderWifFile(src, env, { ...opts, alt });
  };
  return md;
}

module.exports = { plugin, isWifPath, imageSrc, renderWifFile };
