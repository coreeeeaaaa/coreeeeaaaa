import { createRequire } from 'module'
const require = createRequire(import.meta.url)

import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'

const { readAll, CORE_PATH } = require('../../core/uem/ledger')
const { decodeQuantum, createQuantum, hashPayload } = require('../../core/uem/quantum')
const { getPendingTasks, commentOnTask } = require('../../core/sdk/tasks')
const { loadContext } = require('../../core/sdk/context7')

function nowBigInt() {
  return BigInt(Date.now())
}

async function assessState({ sinceMinutes = 60 } = {}) {
  const cutoff = nowBigInt() - BigInt(sinceMinutes * 60 * 1000)
  const records = readAll(CORE_PATH)
  const decoded = records.map(decodeQuantum)
  const recent = decoded.filter((q) => q.coord.t >= cutoff)
  const errors = recent.filter((q) => q.coord.m === 3)
  let pendingTasks = []
  try {
    pendingTasks = await Promise.resolve(getPendingTasks())
  } catch (err) {
    pendingTasks = []
  }
  const candidates = []
  if (errors.length > 0) candidates.push('fix_tests')
  if (recent.length === 0) candidates.push('write_spec')
  if (recent.length > 0) candidates.push('run_ci')
  if (candidates.length === 0) candidates.push('idle')
  return { recentCount: recent.length, errorCount: errors.length, candidates, pendingTasks }
}

function decide(state) {
  if (state.errorCount > 0) return { action: 'fix_tests' }
  if (state.pendingTasks && state.pendingTasks.length > 0) {
    return { action: 'work_on_task', task: state.pendingTasks[0] }
  }
  if (state.candidates.includes('write_spec')) return { action: 'write_spec' }
  if (state.candidates.includes('run_ci')) return { action: 'run_ci' }
  return { action: 'idle' }
}

function execCmd(cmd, args=[]) {
  const res = spawnSync(cmd, args, { stdio: 'inherit' })
  return { ok: res.status === 0, status: res.status, signal: res.signal }
}

async function execute(decision) {
  const action = typeof decision === 'string' ? decision : decision.action
  if (action === 'run_ci') {
    return execCmd('npm', ['test'])
  }
  if (action === 'fix_tests' || action === 'write_spec' || action === 'idle') {
    return { ok: true, status: 0 }
  }
  if (action === 'work_on_task') {
    const task = decision.task || {}
    const ctx = await loadContext(task)
    const comment = commentOnTask(task.id, `auto: starting work_on_task; context=${JSON.stringify(ctx).slice(0,200)}`)
    return { ok: true, status: 0, taskId: task.id, context: ctx, comment }
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
  const state = await assessState({ sinceMinutes: 60 })
  const decision = decide(state)
  let attempt = 1
  let result = await execute(decision)
  if (!result.ok && attempt === 1) {
    attempt = 2
    result = await execute(decision)
  }
  if (!result.ok) {
    const taskId = decision.task ? decision.task.id : undefined
    if (taskId) commentOnTask(taskId, `auto: escalate after failure ${JSON.stringify(result).slice(0,200)}`)
    result = { ...result, followup: 'escalate', note: 'escalated after retry' }
  }
  record({ action: decision.action || decision, result, attempt })
  return { state, decision, result }
}

export { assessState, decide, execute, record, runStep }
