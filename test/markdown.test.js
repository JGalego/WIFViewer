'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseWif } = require('../src/wif');
const { layout, toSvg } = require('../src/draft');
const { plugin, isWifPath, renderWifFile } = require('../src/markdown');

const samples = path.join(__dirname, '../samples');
const twill = fs.readFileSync(path.join(samples, 'twill.wif'), 'utf8');

test('isWifPath accepts local .wif and skips remote URLs', () => {
  assert.ok(isWifPath('./twill.wif'));
  assert.ok(isWifPath('docs/draft.WIF'));
  assert.ok(!isWifPath('photo.png'));
  assert.ok(!isWifPath('https://example.com/a.wif'));
  assert.ok(!isWifPath('data:text/plain,x.wif'));
});

test('toSvg matches layout size and includes warp colour', () => {
  const m = parseWif(twill);
  const L = layout(m, 8);
  const svg = toSvg(m, { cell: 8, forPreview: true });
  assert.match(svg, new RegExp(`width="${L.W + 2}"`));
  assert.match(svg, /rgb\(20,40,140\)/);
  assert.doesNotMatch(svg, /fill="#fff"/);
});

test('renderWifFile embeds SVG and caption', () => {
  const html = renderWifFile('twill.wif', {}, {
    resolve: (src) => path.join(samples, src),
    alt: 'A twill',
  });
  assert.match(html, /<figure class="wif-draft">/);
  assert.match(html, /<svg /);
  assert.match(html, /<figcaption>A twill<\/figcaption>/);
});

test('renderWifFile reports missing files', () => {
  const html = renderWifFile('nope.wif', {}, { resolve: () => '/no/such/file.wif' });
  assert.match(html, /WIF file not found/);
  assert.match(html, /wif-draft-error/);
});

function markdownStub() {
  let transform;
  return {
    md: {
      core: { ruler: { after: (where, name, fn) => {
        assert.strictEqual(where, 'inline');
        assert.strictEqual(name, 'wif_images');
        transform = fn;
      } } },
      renderer: { rules: {} },
    },
    transform: (tokens) => transform({ tokens }),
  };
}

test('markdown-it plugin assigns .wif images a dedicated token type', () => {
  const stub = markdownStub();
  const md = stub.md;
  plugin(md, { resolve: (src) => path.join(samples, src) });
  const wifTok = { attrGet: (k) => (k === 'src' ? 'twill.wif' : null), content: 'Twill' };
  const pngTok = { attrGet: (k) => (k === 'src' ? 'photo.png' : null), content: '' };
  wifTok.type = pngTok.type = 'image';
  stub.transform([{ type: 'inline', children: [wifTok, pngTok] }]);
  assert.strictEqual(wifTok.type, 'wif_image');
  assert.strictEqual(pngTok.type, 'image');
  assert.match(md.renderer.rules.wif_image([wifTok], 0, {}, {}), /<svg /);
});

test('uses data-src when VS Code has rewritten src', () => {
  const stub = markdownStub();
  const md = stub.md;
  plugin(md, { resolve: (src) => path.join(samples, src) });
  const tok = {
    attrGet: (k) => (k === 'data-src' ? 'twill.wif' : k === 'src' ? 'https://webview/twill.wif' : null),
    content: '',
  };
  assert.match(md.renderer.rules.wif_image([tok], 0, {}, {}), /<svg /);
});

test('VS Code can replace the normal image renderer without affecting WIF images', () => {
  const stub = markdownStub();
  const md = stub.md;
  plugin(md, { resolve: (src) => path.join(samples, src) });
  const wifRenderer = md.renderer.rules.wif_image;
  md.renderer.rules.image = () => '<vscode-image>';
  assert.strictEqual(md.renderer.rules.wif_image, wifRenderer);
});
