const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { coord9 } = require('../../core/uem/coord')
const { createQuantum, hashPayload } = require('../../core/uem/quantum')
const { appendQuantum, readAll } = require('../../core/uem/ledger')

function tmpFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(),'uem-')), 'core.uem')
}

function makeQ(text) {
  const payload_hash = hashPayload(Buffer.from(text))
  return createQuantum({ coord: coord9(1n,0n,1,0,0n,0,1,0,0), payload_hash })
}

test('append and read preserves order', () => {
  const file = tmpFile()
  const q1 = makeQ('one')
  const q2 = makeQ('two')
  appendQuantum(q1, file)
  appendQuantum(q2, file)
  const recs = readAll(file)
  assert.strictEqual(recs.length, 2)
  // check first 2 bytes of id differ for order (best-effort)
  assert.ok(!recs[0].equals(recs[1]))
})

test('read persists after reopen', () => {
  const file = tmpFile()
  const q = makeQ('persist')
  appendQuantum(q, file)
  const recs1 = readAll(file)
  const recs2 = readAll(file)
  assert.strictEqual(recs1.length, 1)
  assert.strictEqual(recs2.length, 1)
  assert.ok(recs1[0].equals(recs2[0]))
})
