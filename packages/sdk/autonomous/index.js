import { createRequire } from 'module'
const require = createRequire(import.meta.url)

import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'

const { readAll, CORE_PATH } = require('../../core/uem/ledger')
const { decodeQuantum, createQuantum, hashPayload } = require('../../core/uem/quantum')

function nowBigInt() {
  return BigInt(Date.now())
}

function assessState({ sinceMinutes = 60 } = {}) {
  const cutoff = nowBigInt() - BigInt(sinceMinutes * 60 * 1000)
  const records = readAll(CORE_PATH)
  const decoded = records.map(decodeQuantum)
  const recent = decoded.filter((q) => q.coord.t >= cutoff)
  const errors = recent.filter((q) => q.coord.m === 3)
  const candidates = []
  if (errors.length > 0) candidates.push('fix_tests')
  if (recent.length === 0) candidates.push('write_spec')
  if (recent.length > 0) candidates.push('run_ci')
  if (candidates.length === 0) candidates.push('idle')
  return { recentCount: recent.length, errorCount: errors.length, candidates }
}

function decide(state) {
  if (state.errorCount > 0) return 'fix_tests'
  if (state.candidates.includes('write_spec')) return 'write_spec'
  if (state.candidates.includes('run_ci')) return 'run_ci'
  return 'idle'
}

function execCmd(cmd, args=[]) {
  const res = spawnSync(cmd, args, { stdio: 'inherit' })
  return { ok: res.status === 0, status: res.status, signal: res.signal }
}

async function execute(action) {
  if (action === 'run_ci') {
    return execCmd('npm', ['test'])
  }
  if (action === 'fix_tests' || action === 'write_spec' || action === 'idle') {
    return { ok: true, status: 0 }
  }
  return { ok: false, status: -1, reason: 'unknown action' }
}

function record({ action, result, attempt = 1 }) {
  const payload = JSON.stringify({ action, result, attempt, ts: Date.now() })
  const payload_hash = hashPayload(Buffer.from(payload))
  const coord = { t: nowBigInt(), x:0n, a:9, w:0, j:0n, k:2, p:3, m: result.ok ? 1 : 3, c:0 }
  const q = createQuantum({ coord, payload_hash })
  require('../../core/uem/ledger').appendQuantum(q, CORE_PATH)
}

async function runStep() {
  const state = assessState({ sinceMinutes: 60 })
  const action = decide(state)
  let attempt = 1
  let result = await execute(action)
  if (!result.ok && attempt === 1) {
    attempt = 2
    result = await execute(action)
  }
  if (!result.ok) {
    result = { ...result, note: 'fallback to idle' }
  }
  record({ action, result, attempt })
  return { state, action, result }
}

export { assessState, decide, execute, record, runStep }
