const HANGUL_BASE = 0xac00
const HANGUL_COUNT = 11172
const ID_LEN = 20

function toHangulCodepoint(idx) {
  if (idx < 0 || idx >= HANGUL_COUNT) throw new Error('jiwol index out of range')
  return HANGUL_BASE + idx
}

function fromHangulCodepoint(cp) {
  const idx = cp - HANGUL_BASE
  if (idx < 0 || idx >= HANGUL_COUNT) throw new Error('not a Hangul syllable in range')
  return idx
}

// lossy hash-based encoding of Coord9 into 20 Hangul chars (base-11172)
function encodeCoord(coord) {
  const data = [coord.t, coord.x, coord.a, coord.w, coord.j, coord.k, coord.p, coord.m, coord.c]
  let hash = BigInt(0)
  for (const v of data) {
    hash ^= BigInt(v) + (hash << BigInt(7)) + (hash >> BigInt(3))
    hash &= BigInt('0xffffffffffffffff')
  }
  const chars = []
  for (let i = 0; i < ID_LEN; i++) {
    const digit = Number(hash % BigInt(HANGUL_COUNT))
    chars.push(String.fromCodePoint(toHangulCodepoint(digit)))
    hash /= BigInt(HANGUL_COUNT)
  }
  return chars.join('')
}

function decodeId(id) {
  if (id.length !== ID_LEN) throw new Error('invalid JiwolId length')
  const digits = Array.from(id).map((ch) => fromHangulCodepoint(ch.codePointAt(0)))
  // lossy reverse: reconstruct hash only; coordinates cannot be fully recovered
  let hash = BigInt(0)
  for (let i = digits.length - 1; i >= 0; i--) {
    hash = hash * BigInt(HANGUL_COUNT) + BigInt(digits[i])
  }
  return { hash }
}

module.exports = { encodeCoord, decodeId, HANGUL_COUNT, ID_LEN }
