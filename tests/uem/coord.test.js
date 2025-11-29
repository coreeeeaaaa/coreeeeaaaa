const test = require('node:test')
const assert = require('node:assert')
const { coord9 } = require('../../core/uem/coord')

const a = coord9(1n,2n,3,4,5n,6,7,8,9)
const b = coord9(1n,2n,3,4,5n,6,7,8,9)
const c = coord9(0n,0n,0,0,0n,0,0,0,0)

test('coord9 deterministic and distinct', () => {
  assert.deepStrictEqual(a, b)
  assert.notDeepStrictEqual(a, c)
})
