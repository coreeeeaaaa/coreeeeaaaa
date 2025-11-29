const fs = require('fs')
const path = require('path')
const { encodeQuantum } = require('./quantum')

const CORE_PATH = path.join('.core', 'core.uem')

function ensureCoreFile() {
  const dir = path.dirname(CORE_PATH)
  fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(CORE_PATH)) fs.writeFileSync(CORE_PATH, Buffer.alloc(0))
}

function appendQuantum(q) {
  ensureCoreFile()
  const buf = encodeQuantum(q)
  fs.appendFileSync(CORE_PATH, buf)
  return buf.length
}

function readAll() {
  ensureCoreFile()
  const buf = fs.readFileSync(CORE_PATH)
  const sz = 3255
  const out = []
  for (let off=0; off+sz<=buf.length; off+=sz) {
    out.push(buf.subarray(off, off+sz))
  }
  return out
}

module.exports = { appendQuantum, readAll, CORE_PATH }
