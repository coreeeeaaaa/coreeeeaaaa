const test = require('node:test')
const assert = require('node:assert')
const { encodeCoord, decodeId, ID_LEN, HANGUL_COUNT } = require('../../core/uem/jiwol')
const { coord9 } = require('../../core/uem/coord')

function sampleCoords() {
  return [
    coord9(1n, 2n, 3, 4, 5n, 6, 1, 0, 0),
    coord9(123456789n, 987654321n, 65535, 65535, 281474976710655n, 65535, 15, 15, 15),
    coord9(0n, 0n, 0, 0, 0n, 0, 0, 0, 0),
  ]
}

test('encodeCoord produces 20 hangul chars', () => {
  const id = encodeCoord(coord9())
  assert.strictEqual([...id].length, ID_LEN)
  for (const ch of [...id]) {
    const cp = ch.codePointAt(0)
    assert.ok(cp >= 0xac00 && cp < 0xac00 + HANGUL_COUNT)
  }
})

test('encode/decode roundtrip for Coord9', () => {
  for (const c of sampleCoords()) {
    const id = encodeCoord(c)
    const dec = decodeId(id)
    assert.strictEqual(dec.t.toString(), c.t.toString())
    assert.strictEqual(dec.x.toString(), c.x.toString())
    assert.strictEqual(dec.j.toString(), c.j.toString())
    assert.strictEqual(dec.a, c.a)
    assert.strictEqual(dec.w, c.w)
    assert.strictEqual(dec.k, c.k)
    assert.strictEqual(dec.p, c.p)
    assert.strictEqual(dec.m, c.m)
    assert.strictEqual(dec.c, c.c)
  }
})

test('decode rejects wrong length', () => {
  assert.throws(() => decodeId(''), /invalid JiwolId length/)
})
