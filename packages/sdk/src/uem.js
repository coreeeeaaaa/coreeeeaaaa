import { createRequire } from 'module'
import path from 'path'

const require = createRequire(import.meta.url)
const binding = require('../engine-rs/node')
const jsEngine = require('../../core/uem/engine.js')

const DEFAULT_PATH = path.join('.core', 'core.uem')

export function openUem(filePath = DEFAULT_PATH) {
  if (binding.openLedger) return binding.openLedger(filePath)
  return null
}

export function appendQuantumRecord(q, filePath = DEFAULT_PATH) {
  return binding.appendQuantum(q, filePath)
}

export function queryUem(filter = {}, filePath = DEFAULT_PATH) {
  const handle = openUem(filePath)
  if (handle && binding.queryRecords) {
    return binding.queryRecords(handle, filter)
  }
  const records = binding.iterQuanta(filePath)
  return records.filter((q) => {
    if (filter.t_min && q.coord.t < filter.t_min) return false
    if (filter.t_max && q.coord.t > filter.t_max) return false
    if (filter.j !== undefined && q.coord.j !== BigInt(filter.j)) return false
    if (filter.k !== undefined && q.coord.k !== filter.k) return false
    return true
  })
}

export function inspectUem({ filePath = DEFAULT_PATH, limit = 10 } = {}) {
  const records = binding.iterQuanta(filePath)
  const tail = records.slice(-limit)
  return tail.map((q) => ({
    id: jsEngine.jiwolToCoord ? jsEngine.jiwolToCoord(q.id) : q.coord,
    coord: q.coord,
    thickness: q.thickness,
    payload_hash: q.payload_hash?.toString('hex') || '',
    prev_hash: q.prev_hash?.toString('hex') || ''
  }))
}
