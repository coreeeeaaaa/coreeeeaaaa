const fs = require('fs')
const path = require('path')
const { encodeQuantum } = require('./quantum')

const CORE_PATH = path.join('.core', 'core.uem')

function ensureCoreFile(filePath = CORE_PATH) {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, Buffer.alloc(0))
}

function appendQuantum(q, filePath = CORE_PATH) {
  ensureCoreFile(filePath)
  const buf = encodeQuantum(q)
  fs.appendFileSync(filePath, buf)
  return buf.length
}

function readAll(filePath = CORE_PATH) {
  ensureCoreFile(filePath)
  const buf = fs.readFileSync(filePath)
  const sz = 3255
  const out = []
  for (let off=0; off+sz<=buf.length; off+=sz) {
    out.push(buf.subarray(off, off+sz))
  }
  return out
}

async function readAllFromLedger(filePath = CORE_PATH) {
  return readAll(filePath)
}

module.exports = { appendQuantum, readAll, readAllFromLedger, CORE_PATH }
