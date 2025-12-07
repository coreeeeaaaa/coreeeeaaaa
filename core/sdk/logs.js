const path = require('node:path')
const { readAll } = require('../uem/ledger')
const { decodeQuantum } = require('../uem/quantum')

function mapMToLevel(m) {
  if (m === 3) return 'error'
  if (m === 2) return 'warn'
  if (m === 1) return 'info'
  return 'unknown'
}

async function fetchRecentErrors({ sinceMinutes = 30, source } = {}) {
  const corePath = path.join(__dirname, '..', '..', '.core', 'core.uem')
  const records = readAll(corePath)
  const cutoff = BigInt(Date.now() - sinceMinutes * 60 * 1000)
  const sourceIdx = source ? { web:1, api:2, 'dev-server':3, worker:4 }[source] || 0 : null

  const decoded = records.map((buf) => {
    const q = decodeQuantum(buf)
    const level = mapMToLevel(q.coord.m)
    return { ...q, level }
  })

  const filtered = decoded.filter((q) => {
    const isRecent = q.coord.t >= cutoff
    const isError = q.level === 'error'
    const matchSource = sourceIdx ? q.coord.a === sourceIdx : true
    return isRecent && isError && matchSource
  })

  return filtered
}

module.exports = { fetchRecentErrors }
