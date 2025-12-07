const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { getPendingTasks, commentOnTask } = require('../core/sdk/tasks')

function tmpTasks(entries) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'serena-'))
  const file = path.join(dir, 'tasks.json')
  fs.writeFileSync(file, JSON.stringify(entries), 'utf8')
  return file
}

test('getPendingTasks filters pending/open/todo', () => {
  const tasksPath = tmpTasks([
    { id: '1', status: 'pending', title: 'A' },
    { id: '2', status: 'done', title: 'B' },
    { id: '3', status: 'todo', title: 'C' }
  ])
  const pending = getPendingTasks({ tasksPath })
  const ids = pending.map((t) => t.id)
  assert.deepStrictEqual(ids.sort(), ['1','3'])
})

test('commentOnTask writes activity log', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'serena-'))
  const logPath = path.join(dir, 'activity.log')
  const res = commentOnTask('T1', 'hello', { activityLog: logPath })
  assert.ok(res.ok)
  const content = fs.readFileSync(logPath, 'utf8')
  assert.ok(content.includes('T1'))
})
