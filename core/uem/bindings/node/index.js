const fs = require('fs')
const path = require('path')
const jsEngine = require('../../engine.js')

function candidates() {
  return [
    path.join(__dirname, 'uem_engine.node'),
    path.join(__dirname, 'libuem_engine.node'),
    path.join(__dirname, '..', 'engine', 'target', 'release', 'uem_engine.node'),
    path.join(__dirname, '..', 'engine', 'target', 'release', 'libuem_engine.node'),
    path.join(__dirname, '..', 'engine', 'target', 'release', 'libuem_engine.dylib'),
    path.join(__dirname, '..', 'engine', 'target', 'release', 'libuem_engine.so')
  ]
}

function loadNative() {
  for (const c of candidates()) {
    if (fs.existsSync(c)) {
      try {
        return require(c)
      } catch (err) {
        // try next
      }
    }
  }
  return null
}

const native = loadNative()

const recordSize = native?.record_size ? native.record_size() : jsEngine.UEM_RECORD_SIZE

function appendQuantum(q, filePath) {
  if (native?.append_quantum) {
    const buf = jsEngine.serializeQuantum(q)
    return native.append_quantum(buf, filePath || null)
  }
  return jsEngine.appendQuantum(q, filePath)
}

function iterQuanta(filePath) {
  if (native?.read_all) {
    const buffers = native.read_all(filePath || null)
    return buffers.map((b) => jsEngine.deserializeQuantum(Buffer.from(b)))
  }
  return jsEngine.iterQuanta(filePath)
}

function genesis(filePath) {
  if (native?.genesis) return native.genesis(filePath || null)
  return jsEngine.ensureCoreFile(filePath)
}

module.exports = { appendQuantum, iterQuanta, genesis, recordSize, native }
