const fs = require('fs')
const path = require('path')

const DEFAULT_TASKS_PATH = path.join(process.cwd(), '.serena', 'tasks.json')
const DEFAULT_ACTIVITY_LOG = path.join(process.cwd(), '.serena', 'activity.log')

function loadTasks(customPath) {
  const tasksPath = customPath || process.env.SERENA_TASKS_PATH || DEFAULT_TASKS_PATH
  try {
    const raw = fs.readFileSync(tasksPath, 'utf8')
    const data = JSON.parse(raw)
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.tasks)) return data.tasks
  } catch (err) {
    // fallback to empty
  }
  return []
}

function normalizeTask(t) {
  return {
    id: t.id || t.taskId || String(t.title || 'task'),
    title: t.title || t.summary || '',
    status: (t.status || '').toLowerCase() || 'pending',
    raw: t
  }
}

function getPendingTasks(options = {}) {
  const tasks = loadTasks(options.tasksPath)
  const pendingStatuses = new Set(['pending', 'open', 'todo'])
  return tasks
    .map(normalizeTask)
    .filter((t) => pendingStatuses.has(t.status))
}

function writeActivity(taskId, message, options = {}) {
  const logPath = options.activityLog || DEFAULT_ACTIVITY_LOG
  const line = JSON.stringify({ ts: new Date().toISOString(), taskId, message }) + '\n'
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true })
    fs.appendFileSync(logPath, line, 'utf8')
    return { ok: true, path: logPath }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

function commentOnTask(taskId, comment, options = {}) {
  const message = comment || 'no comment'
  return writeActivity(taskId || 'unknown', message, options)
}

module.exports = { getPendingTasks, commentOnTask, loadTasks }
