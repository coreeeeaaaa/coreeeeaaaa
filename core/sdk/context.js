const path = require('node:path')
const { readAll } = require('../uem/ledger')
const { decodeQuantum } = require('../uem/quantum')

function loadProjectContext(projectId = 0n, sinceMinutes = 60) {
  const corePath = path.join(__dirname, '..', '..', '.core', 'core.uem')
  const records = readAll(corePath)
  const cutoff = BigInt(Date.now() - sinceMinutes * 60 * 1000)
  const quanta = records.map(decodeQuantum).filter((q) => q.coord.t >= cutoff && (projectId === null || q.coord.j === BigInt(projectId)))

  const decisions = []
  const failures = []
  const pending = []

  for (const q of quanta) {
    if (q.coord.m === 3) failures.push(q)
    else if (q.coord.m === 1) decisions.push(q)
    else pending.push(q)
  }

  return { decisions, failures, pending }
}

module.exports = { loadProjectContext }
