const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const { runFile, runSource, existsRunner } = require('../core/sdk/jiwol_lf')

const SAMPLE = path.resolve('..', 'jiwol2', 'jiwollf_refimpl_v1_1', 'sample.clean.jiwol')

test('jiwollf sample runs if runner exists', () => {
  if (!existsRunner()) return
  const out = runFile(SAMPLE)
  assert.ok(out.ok, out.error || 'run failed')
  assert.ok(out.result && out.result.hash, 'missing hash')
})

test('jiwollf inline source runs if runner exists', () => {
  if (!existsRunner()) return
  const src = 'x = 1 + 2; y = x * 3'
  const out = runSource(src)
  assert.ok(out.ok, out.error || 'run failed')
  assert.ok(out.result && out.result.hash)
})
