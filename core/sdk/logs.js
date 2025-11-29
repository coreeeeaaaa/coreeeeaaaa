const path = require('node:path')
const { readAll } = require('../uem/ledger')

async function fetchRecentErrors({ sinceMinutes = 30, source } = {}) {
  const corePath = path.join(__dirname, '..', '..', '.core', 'core.uem')
  const records = readAll(corePath)
  const cutoff = Date.now() - sinceMinutes * 60 * 1000
  // TODO: decode quanta to inspect coord/payload; currently returns all buffers
  return records.filter(() => true).map((buf) => ({ buffer: buf, cutoff }))
}

module.exports = { fetchRecentErrors }
