const { coord9 } = require('./coord')
const { encodeCoord } = require('./jiwol')
const crypto = require('crypto')

const ID_LEN = 20
const SEM_LEN = 768
const RECORD_SIZE = 3255

function zeroHash() { return Buffer.alloc(32) }

function encodeQuantum(q) {
  const buf = Buffer.alloc(RECORD_SIZE)
  let offset = 0
  const idStr = q.id
  if (!idStr || [...idStr].length !== ID_LEN) throw new Error('invalid id')
  for (const ch of [...idStr]) {
    const cp = ch.codePointAt(0)
    buf.writeUInt16LE(cp & 0xffff, offset)
    offset += 2
  }
  buf.writeBigUInt64LE(BigInt(q.coord.t || 0n), offset); offset+=8
  buf.writeBigUInt64LE(BigInt(q.coord.x || 0n), offset); offset+=8
  buf.writeUInt32LE(Number(q.coord.a||0), offset); offset+=4
  buf.writeUInt32LE(Number(q.coord.w||0), offset); offset+=4
  buf.writeBigUInt64LE(BigInt(q.coord.j||0n), offset); offset+=8
  buf.writeUInt32LE(Number(q.coord.k||0), offset); offset+=4
  buf.writeUInt8(Number(q.coord.p||0), offset); offset+=1
  buf.writeUInt8(Number(q.coord.m||0), offset); offset+=1
  buf.writeUInt8(Number(q.coord.c||0), offset); offset+=1

  const payloadHash = q.payload_hash || zeroHash()
  payloadHash.copy(buf, offset); offset+=32

  const sem = q.semantic_vec || new Float32Array(SEM_LEN)
  Buffer.from(sem.buffer).copy(buf, offset, 0, SEM_LEN*4); offset+=SEM_LEN*4

  const prevHash = q.prev_hash || zeroHash()
  prevHash.copy(buf, offset); offset+=32

  const snap = q.state_snapshot || zeroHash()
  snap.copy(buf, offset); offset+=32

  const thick = q.thickness || { re:0, im:0 }
  buf.writeFloatLE(thick.re || 0, offset); offset+=4
  buf.writeFloatLE(thick.im || 0, offset); offset+=4

  return buf
}

function decodeQuantum(buf) {
  if (!Buffer.isBuffer(buf) || buf.length !== RECORD_SIZE) throw new Error('invalid quantum buffer')
  let offset = 0
  const chars = []
  for (let i=0;i<ID_LEN;i++) {
    const cp = buf.readUInt16LE(offset); offset+=2
    chars.push(String.fromCodePoint(cp))
  }
  const id = chars.join('')
  const coord = {
    t: buf.readBigUInt64LE(offset), offset: undefined
  }
  offset += 8
  coord.x = buf.readBigUInt64LE(offset); offset+=8
  coord.a = buf.readUInt32LE(offset); offset+=4
  coord.w = buf.readUInt32LE(offset); offset+=4
  coord.j = buf.readBigUInt64LE(offset); offset+=8
  coord.k = buf.readUInt32LE(offset); offset+=4
  coord.p = buf.readUInt8(offset); offset+=1
  coord.m = buf.readUInt8(offset); offset+=1
  coord.c = buf.readUInt8(offset); offset+=1

  const payload_hash = buf.subarray(offset, offset+32); offset+=32
  // skip semantic vec
  offset += SEM_LEN*4
  const prev_hash = buf.subarray(offset, offset+32); offset+=32
  const state_snapshot = buf.subarray(offset, offset+32); offset+=32
  const re = buf.readFloatLE(offset); offset+=4
  const im = buf.readFloatLE(offset); offset+=4
  const thickness = { re, im }
  return { id, coord, payload_hash, prev_hash, state_snapshot, thickness, buffer: buf }
}

function createQuantum({coord, payload_hash, semantic_vec, prev_hash, state_snapshot, thickness}) {
  const id = encodeCoord(coord)
  return {
    id,
    coord,
    payload_hash: payload_hash || zeroHash(),
    semantic_vec: semantic_vec || new Float32Array(SEM_LEN),
    prev_hash: prev_hash || zeroHash(),
    state_snapshot: state_snapshot || zeroHash(),
    thickness: thickness || {re:0, im:0}
  }
}

function hashPayload(data) {
  return crypto.createHash('sha256').update(data).digest()
}

module.exports = { encodeQuantum, createQuantum, hashPayload, SEM_LEN }
