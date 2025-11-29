const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { loadContext } = require('../core/sdk/context7')

test('loadContext uses mock file when provided', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx7-'))
  const mockPath = path.join(dir, 'mock.json')
  fs.writeFileSync(mockPath, JSON.stringify({ ok: true, note: 'mocked' }), 'utf8')
  process.env.CONTEXT7_MOCK_PATH = mockPath
  const ctx = await loadContext({ id: 'T1' })
  delete process.env.CONTEXT7_MOCK_PATH
  assert.strictEqual(ctx.ok, true)
  assert.strictEqual(ctx.note, 'mocked')
})
