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
