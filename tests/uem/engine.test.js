const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const fs = require('fs')
const os = require('os')
const engine = require('../../core/uem/engine.js')

function tmpLedger() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'uem-')), 'core.uem')
}

test('serialize/deserialize roundtrip size', () => {
  const q = engine.createLogQuantum({ actor: 'tester', text: 'hello' })
  const buf = engine.serializeQuantum({ ...q, id: engine.coordToJiwol(q.coord), semantic_vec: new Float32Array(768) })
  assert.strictEqual(buf.length, engine.UEM_RECORD_SIZE)
  const parsed = engine.deserializeQuantum(buf)
  assert.strictEqual(parsed.semantic_vec.length, 768)
})

test('append and read ledger', () => {
  const file = tmpLedger()
  const q1 = engine.createLogQuantum({ actor: 'a1', text: 'one' })
  const q2 = engine.createLogQuantum({ actor: 'a2', text: 'two' })
  engine.appendQuantum(q1, file)
  engine.appendQuantum(q2, file)
  const recs = engine.iterQuanta(file)
  assert.strictEqual(recs.length, 2)
  assert.notStrictEqual(recs[0].prev_hash.toString('hex'), recs[1].prev_hash.toString('hex'))
})
