'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { parseWif, warpUp } = require('../src/wif');

const sample = fs.readFileSync(path.join(__dirname, '../samples/twill.wif'), 'utf8');

test('parses dimensions and structure', () => {
  const m = parseWif(sample);
  assert.strictEqual(m.title, '2/2 Twill sample');
  assert.deepStrictEqual([m.ends, m.picks, m.shafts, m.treadles], [16, 16, 4, 4]);
  assert.deepStrictEqual(m.tieup[0], [1, 2]);
  assert.deepStrictEqual(m.treadling[3], [4]);
});

test('resolves colors via palette range', () => {
  const m = parseWif(sample);
  assert.strictEqual(m.warpColors[0], 'rgb(20,40,140)');
  assert.strictEqual(m.warpColors[4], 'rgb(240,230,200)');
  assert.strictEqual(m.weftColors[0], 'rgb(20,40,140)');
});

test('drawdown follows tie-up (rising shed)', () => {
  const m = parseWif(sample);
  assert.strictEqual(warpUp(m, 0, 0), true);  // shaft 1 raised by treadle 1
  assert.strictEqual(warpUp(m, 2, 0), false); // shaft 3 not raised
  m.risingShed = false;
  assert.strictEqual(warpUp(m, 0, 0), false);
});

test('liftplan files work, comments and BOM tolerated', () => {
  const m = parseWif('﻿; hi\n[WEAVING]\nShafts=2\n[WARP]\nThreads=2\n[WEFT]\nThreads=1\n[THREADING]\n1=1\n2=2\n[LIFTPLAN]\n1=2\n');
  assert.ok(m.liftplan);
  assert.strictEqual(warpUp(m, 0, 0), false);
  assert.strictEqual(warpUp(m, 1, 0), true);
});

test('warns on non-WIF input without throwing', () => {
  assert.ok(parseWif('hello').warnings.length > 0);
});

test('diagnose: clean sample has no errors', () => {
  const { diagnose } = require('../src/wif');
  assert.deepStrictEqual(diagnose(sample).filter((d) => d.severity === 'error'), []);
});

test('diagnose: flags out-of-range shaft with line number', () => {
  const { diagnose } = require('../src/wif');
  const bad = sample.replace('1=1\n2=2\n3=3\n4=4\n5=1', '1=1\n2=2\n3=9\n4=4\n5=1');
  const errs = diagnose(bad).filter((d) => d.severity === 'error');
  assert.strictEqual(errs.length, 1);
  assert.match(errs[0].message, /shaft 9/);
  assert.strictEqual(bad.split('\n')[errs[0].line], '3=9');
});

test('diagnose: flags non-numeric and missing color', () => {
  const { diagnose } = require('../src/wif');
  const d = diagnose(sample.replace('Color=1', 'Color=7').replace('1=1,2', '1=x'));
  assert.ok(d.some((x) => /not in \[COLOR TABLE\]/.test(x.message)));
  assert.ok(d.some((x) => /whole numbers/.test(x.message)));
});

test('every sample parses and has no errors', () => {
  const { diagnose } = require('../src/wif');
  const dir = path.join(__dirname, '../samples');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.wif'));
  assert.ok(files.length >= 9);
  for (const f of files) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    const m = parseWif(text);
    assert.ok(m.ends > 0 && m.picks > 0, `${f}: empty draft`);
    assert.deepStrictEqual(diagnose(text), [], f);
  }
});

test('satin has one warp float per pick, sinking shed inverts', () => {
  const sat = parseWif(fs.readFileSync(path.join(__dirname, '../samples/satin-5.wif'), 'utf8'));
  const upCount = [...Array(5).keys()].filter((i) => warpUp(sat, i, 0)).length;
  assert.strictEqual(upCount, 1);
  const sink = parseWif(fs.readFileSync(path.join(__dirname, '../samples/sinking-shed-3-1.wif'), 'utf8'));
  assert.strictEqual(sink.risingShed, false);
  assert.strictEqual([...Array(4).keys()].filter((i) => warpUp(sink, i, 0)).length, 3);
});
