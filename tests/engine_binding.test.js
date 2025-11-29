const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const fs = require('fs')
const os = require('os')

const binding = require('../packages/engine-rs/node')
const jsEngine = require('../core/uem/engine.js')

function tmpPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uem-'))
  return path.join(dir, 'core.uem')
}

test('binding append/query/validate via rust if available, otherwise js fallback', () => {
  const ledgerPath = tmpPath()
  binding.genesis(ledgerPath)
  const q = jsEngine.createLogQuantum({ actor_hash: 1, text: 'hi' })
  binding.appendQuantum(q, ledgerPath)
  const h = binding.openUem(ledgerPath)
  if (h) {
    binding.appendQuantumHandle(h, q)
    const ok = binding.validateChainHandle(h)
    assert.strictEqual(ok, true)
    const res = binding.queryQuanta(h, { j: 0 })
    assert.ok(Array.isArray(res))
    assert.ok(res.length >= 1)
  } else {
    const records = binding.iterQuanta(ledgerPath)
    assert.ok(records.length >= 1)
  }
})
