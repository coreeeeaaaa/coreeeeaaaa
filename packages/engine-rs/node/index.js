const fs = require('fs')
const path = require('path')
const jsEngine = require('../../../core/uem/engine.js')

function candidates() {
  const root = __dirname
  return [
    path.join(root, 'uem_engine.node'),
    path.join(root, 'libuem_engine.node'),
    path.join(__dirname, '..', 'target', 'release', 'uem_engine.node'),
    path.join(__dirname, '..', 'target', 'release', 'libuem_engine.node'),
    path.join(__dirname, '..', 'target', 'release', 'libuem_engine.dylib'),
    path.join(__dirname, '..', 'target', 'release', 'libuem_engine.so')
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

function appendQuantumHandle(handle, q) {
  if (native?.append_record && handle != null) {
    const buf = jsEngine.serializeQuantum(q)
    return native.append_record(handle, buf)
  }
  // fallback: direct append to path if provided in q
  return appendQuantum(q, q?.path)
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

function openLedger(filePath) {
  if (native?.open_ledger) return native.open_ledger(filePath || null)
  return null
}

function validateChain(handle) {
  if (native?.validate_chain_handle && handle != null) return native.validate_chain_handle(handle)
  return true
}

function queryRecords(handle, filter) {
  if (native?.query_records && handle != null) {
    const res = native.query_records(handle, filter || {})
    return res.map((b) => jsEngine.deserializeQuantum(Buffer.from(b)))
  }
  return []
}

// Canonical aliases for SDK/CLI usage
const openUem = openLedger
const appendQuantumHandleAlias = appendQuantumHandle
const queryQuanta = queryRecords
const validateChainHandleAlias = validateChain

module.exports = {
  appendQuantum,
  appendQuantumHandle: appendQuantumHandleAlias,
  iterQuanta,
  genesis,
  recordSize,
  native,
  openLedger,
  validateChain,
  queryRecords,
  openUem,
  queryQuanta,
  validateChainHandle: validateChainHandleAlias
}
