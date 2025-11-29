#!/usr/bin/env node
// Read Firebase logs and append as UEM quanta.

const path = require('node:path')
const admin = require('firebase-admin')
const { createQuantum, hashPayload } = require('../core/uem/quantum')
const { appendQuantum } = require('../core/uem/ledger')

function ensureInit() {
  try { admin.initializeApp() } catch (_) {}
  return admin.firestore()
}

function mapSourceToIndex(source) {
  switch (source) {
    case 'web': return 1
    case 'api': return 2
    case 'dev-server': return 3
    case 'worker': return 4
    default: return 0
  }
}

async function ingestFirebaseLogsToUem({ sinceMinutes = 10 } = {}) {
  const db = ensureInit()
  const cutoffMs = Date.now() - sinceMinutes * 60 * 1000
  const snap = await db.collection('coreeeeaaaa_logs').where('ts_ms', '>=', cutoffMs).get()
  const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const corePath = path.join(__dirname, '..', '.core', 'core.uem')

  for (const log of logs) {
    const t = typeof log.ts_ms === 'number' ? BigInt(log.ts_ms) : BigInt(Date.now())
    const levelMap = { info:1, warn:2, error:3 }
    const m = levelMap[log.level] || 0
    const a = mapSourceToIndex(log.source)
    const coord = { t, x:0n, a, w:0, j:0n, k:1, p:1, m, c:0 }

    const payload = JSON.stringify(log)
    const payload_hash = hashPayload(Buffer.from(payload))
    const q = createQuantum({ coord, payload_hash })
    appendQuantum(q, corePath)
  }
}

if (require.main === module) {
  ingestFirebaseLogsToUem().catch((err) => {
    console.error('Failed to ingest Firebase logs to UEM:', err)
    process.exit(1)
  })
}

module.exports = { ingestFirebaseLogsToUem }
