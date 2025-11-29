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

// reversible packing of Coord9 into 20 base-11172 digits
function encodeCoord(coord) {
  // bit layout (total 204 bits): t48 | x48 | a16 | w16 | j48 | k16 | p4 | m4 | c4
  let val = BigInt(0)
  val = (val << 48n) + (BigInt(coord.t) & ((1n<<48n)-1n))
  val = (val << 48n) + (BigInt(coord.x) & ((1n<<48n)-1n))
  val = (val << 16n) + (BigInt(coord.a) & ((1n<<16n)-1n))
  val = (val << 16n) + (BigInt(coord.w) & ((1n<<16n)-1n))
  val = (val << 48n) + (BigInt(coord.j) & ((1n<<48n)-1n))
  val = (val << 16n) + (BigInt(coord.k) & ((1n<<16n)-1n))
  val = (val << 4n)  + (BigInt(coord.p) & 0xfn)
  val = (val << 4n)  + (BigInt(coord.m) & 0xfn)
  val = (val << 4n)  + (BigInt(coord.c) & 0xfn)

  const digits = []
  for (let i=0;i<ID_LEN;i++) {
    const d = Number(val % BigInt(HANGUL_COUNT))
    digits.push(String.fromCodePoint(toHangulCodepoint(d)))
    val /= BigInt(HANGUL_COUNT)
  }
  return digits.reverse().join('')
}

function decodeId(id) {
  if ([...id].length !== ID_LEN) throw new Error('invalid JiwolId length')
  let val = BigInt(0)
  for (const ch of [...id]) {
    const d = fromHangulCodepoint(ch.codePointAt(0))
    val = val * BigInt(HANGUL_COUNT) + BigInt(d)
  }
  function take(bits) {
    const mask = (1n<<BigInt(bits))-1n
    const out = val & mask
    val >>= BigInt(bits)
    return out
  }
  const c = take(4)
  const m = take(4)
  const p = take(4)
  const k = take(16)
  const j = take(48)
  const w = take(16)
  const a = take(16)
  const x = take(48)
  const t = take(48)
  return {
    t, x, a: Number(a), w: Number(w), j, k: Number(k), p: Number(p), m: Number(m), c: Number(c)
  }
}

module.exports = { encodeCoord, decodeId, HANGUL_COUNT, ID_LEN }
