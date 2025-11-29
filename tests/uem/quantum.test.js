const test = require('node:test')
const assert = require('node:assert')
const { coord9 } = require('../../core/uem/coord')
const { createQuantum, encodeQuantum, hashPayload, SEM_LEN } = require('../../core/uem/quantum')

const coord = coord9(1n,2n,3,4,5n,6,7,8,9)

function makeQ() {
  const payload_hash = hashPayload(Buffer.from('hello'))
  return createQuantum({ coord, payload_hash })
}

test('createQuantum fills required fields', () => {
  const q = makeQ()
  assert.ok(q.id)
  assert.ok(q.payload_hash)
  assert.ok(q.semantic_vec)
  assert.strictEqual(q.semantic_vec.length, SEM_LEN)
  assert.ok(q.prev_hash)
  assert.ok(q.state_snapshot)
  assert.ok(q.thickness)
})

test('encodeQuantum fixed length and deterministic', () => {
  const q = makeQ()
  const buf1 = encodeQuantum(q)
  const buf2 = encodeQuantum(q)
  assert.strictEqual(buf1.length, 3255)
  assert.strictEqual(buf2.length, 3255)
  assert.ok(buf1.equals(buf2))
})
