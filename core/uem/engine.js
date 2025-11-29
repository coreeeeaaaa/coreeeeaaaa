const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// Core constants
const GG_BASE = 11172n
const JIWOL_LEN = 20
const SEMANTIC_VEC_LEN = 768
const UEM_RECORD_SIZE = 3255 // bytes, matches existing quantum encoding
const CORE_UEM_PATH = path.join('.core', 'core.uem')

function ensureCoreFile(filePath = CORE_UEM_PATH) {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, Buffer.alloc(0))
}

// --- Jiwol encode/decode ---
function encodeBaseDigits(value, digits) {
  let v = BigInt(value)
  const out = []
  for (let i = 0; i < digits; i++) {
    out.push(Number(v % GG_BASE))
    v = v / GG_BASE
  }
  return out
}

function decodeBaseDigits(digits) {
  let acc = 0n
  let mul = 1n
  for (const d of digits) {
    acc += BigInt(d) * mul
    mul *= GG_BASE
  }
  return acc
}

// Layout of 20 digits across Coord9 fields
const JIWOL_LAYOUT = [
  { field: 't', digits: 6 },
  { field: 'x', digits: 4 },
  { field: 'j', digits: 4 },
  { field: 'a', digits: 1 },
  { field: 'w', digits: 1 },
  { field: 'k', digits: 1 },
  { field: 'p', digits: 1 },
  { field: 'm', digits: 1 },
  { field: 'c', digits: 1 }
]

function coordToJiwol(coord) {
  const out = []
  for (const { field, digits } of JIWOL_LAYOUT) {
    const val = coord[field] ?? 0n
    out.push(...encodeBaseDigits(val, digits))
  }
  while (out.length < JIWOL_LEN) out.push(0)
  return Uint16Array.from(out.slice(0, JIWOL_LEN))
}

function jiwolToCoord(idArr) {
  const digits = Array.from(idArr || []).slice(0, JIWOL_LEN)
  let idx = 0
  const coord = {}
  for (const { field, digits: span } of JIWOL_LAYOUT) {
    const slice = digits.slice(idx, idx + span)
    coord[field] = decodeBaseDigits(slice)
    idx += span
  }
  return coord
}

// --- UemQuantum encode/decode ---
function createEmptySemanticVec() {
  return new Float32Array(SEMANTIC_VEC_LEN)
}

function normalizeThickness(thickness = { re: 0, im: 0 }) {
  return { re: Number(thickness.re || 0), im: Number(thickness.im || 0) }
}

function serializeQuantum(q) {
  const buf = Buffer.alloc(UEM_RECORD_SIZE)
  let offset = 0

  // id: 20 u16
  const id = q.id || new Uint16Array(JIWOL_LEN)
  for (let i = 0; i < JIWOL_LEN; i++) {
    buf.writeUInt16LE(id[i] || 0, offset)
    offset += 2
  }

  // coord fields
  const coord = q.coord || {}
  const coordFields = ['t', 'x', 'a', 'w', 'j', 'k', 'p', 'm', 'c']
  const coordSizes = [8, 8, 4, 4, 8, 4, 1, 1, 1]
  for (let i = 0; i < coordFields.length; i++) {
    const key = coordFields[i]
    const size = coordSizes[i]
    const val = coord[key] !== undefined ? BigInt(coord[key]) : 0n
    if (size === 8) {
      buf.writeBigUInt64LE(val, offset)
    } else if (size === 4) {
      buf.writeUInt32LE(Number(val), offset)
    } else {
      buf.writeUInt8(Number(val), offset)
    }
    offset += size
  }

  const writeBytes = (source, len) => {
    if (source && source.length >= len) {
      buf.set(source.subarray ? source.subarray(0, len) : source.slice(0, len), offset)
    } else if (source) {
      const tmp = Buffer.alloc(len)
      Buffer.from(source).copy(tmp)
      buf.set(tmp, offset)
    }
    offset += len
  }

  writeBytes(q.payload_hash || Buffer.alloc(32), 32)
  const semantic = q.semantic_vec || createEmptySemanticVec()
  for (let i = 0; i < SEMANTIC_VEC_LEN; i++) {
    buf.writeFloatLE(semantic[i] || 0, offset)
    offset += 4
  }
  writeBytes(q.prev_hash || Buffer.alloc(32), 32)
  writeBytes(q.state_snapshot || Buffer.alloc(32), 32)
  const thickness = normalizeThickness(q.thickness)
  buf.writeFloatLE(thickness.re, offset); offset += 4
  buf.writeFloatLE(thickness.im, offset); offset += 4
  return buf
}

function deserializeQuantum(buf) {
  if (buf.length !== UEM_RECORD_SIZE) throw new Error('invalid record size')
  let offset = 0
  const id = new Uint16Array(JIWOL_LEN)
  for (let i = 0; i < JIWOL_LEN; i++) {
    id[i] = buf.readUInt16LE(offset)
    offset += 2
  }
  const coordFields = ['t', 'x', 'a', 'w', 'j', 'k', 'p', 'm', 'c']
  const coordSizes = [8, 8, 4, 4, 8, 4, 1, 1, 1]
  const coord = {}
  for (let i = 0; i < coordFields.length; i++) {
    const size = coordSizes[i]
    let val
    if (size === 8) val = buf.readBigUInt64LE(offset)
    else if (size === 4) val = BigInt(buf.readUInt32LE(offset))
    else val = BigInt(buf.readUInt8(offset))
    coord[coordFields[i]] = val
    offset += size
  }
  const readBytes = (len) => {
    const out = Buffer.alloc(len)
    buf.copy(out, 0, offset, offset + len)
    offset += len
    return out
  }

  const payload_hash = readBytes(32)
  const semantic_vec = new Float32Array(SEMANTIC_VEC_LEN)
  for (let i = 0; i < SEMANTIC_VEC_LEN; i++) {
    semantic_vec[i] = buf.readFloatLE(offset)
    offset += 4
  }
  const prev_hash = readBytes(32)
  const state_snapshot = readBytes(32)
  const thickness = { re: buf.readFloatLE(offset), im: buf.readFloatLE(offset + 4) }

  const coordFull = Object.assign({}, coord, jiwolToCoord(id))

  return { id, coord: coordFull, payload_hash, semantic_vec, prev_hash, state_snapshot, thickness }
}

// --- Ledger operations ---
function recordHash(buf) {
  return crypto.createHash('sha256').update(buf).digest()
}

function lastRecord(filePath = CORE_UEM_PATH) {
  ensureCoreFile(filePath)
  const stat = fs.statSync(filePath)
  if (stat.size < UEM_RECORD_SIZE) return null
  const fd = fs.openSync(filePath, 'r')
  const offset = stat.size - UEM_RECORD_SIZE
  const buf = Buffer.alloc(UEM_RECORD_SIZE)
  fs.readSync(fd, buf, 0, UEM_RECORD_SIZE, offset)
  fs.closeSync(fd)
  return buf
}

function appendQuantum(q, filePath = CORE_UEM_PATH) {
  ensureCoreFile(filePath)
  const prevBuf = lastRecord(filePath)
  const prev_hash = prevBuf ? recordHash(prevBuf) : Buffer.alloc(32)
  const payload_hash = q.payload_hash || recordHash(Buffer.from(JSON.stringify(q.payload || {})))
  const state_snapshot = q.state_snapshot || Buffer.alloc(32)
  const id = q.id || coordToJiwol(q.coord || {})
  const semantic_vec = q.semantic_vec || createEmptySemanticVec()
  const thickness = normalizeThickness(q.thickness)
  const record = serializeQuantum({ ...q, id, payload_hash, prev_hash, state_snapshot, semantic_vec, thickness })
  fs.appendFileSync(filePath, record)
  return { bytes: record.length, prev_hash }
}

function iterQuanta(filePath = CORE_UEM_PATH) {
  ensureCoreFile(filePath)
  const stat = fs.statSync(filePath)
  const count = Math.floor(stat.size / UEM_RECORD_SIZE)
  const fd = fs.openSync(filePath, 'r')
  const out = []
  const buf = Buffer.alloc(UEM_RECORD_SIZE)
  for (let i = 0; i < count; i++) {
    fs.readSync(fd, buf, 0, UEM_RECORD_SIZE, i * UEM_RECORD_SIZE)
    out.push(deserializeQuantum(buf))
  }
  fs.closeSync(fd)
  return out
}

function createLogQuantum(entry, coordOverrides = {}) {
  const now = BigInt(Date.now())
  const coord = {
    t: now,
    x: 0n,
    a: BigInt(entry.actor_hash || 0),
    w: 0n,
    j: 0n,
    k: 1n,
    p: 1n,
    m: 0n,
    c: 0n,
    ...coordOverrides
  }
  const payload = Buffer.from(JSON.stringify(entry || {}))
  const payload_hash = recordHash(payload)
  return { coord, payload_hash, payload }
}

module.exports = {
  UEM_RECORD_SIZE,
  coordToJiwol,
  jiwolToCoord,
  serializeQuantum,
  deserializeQuantum,
  appendQuantum,
  iterQuanta,
  createLogQuantum,
  ensureCoreFile,
  CORE_UEM_PATH
}
