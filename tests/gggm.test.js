const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { existsCli, version, check } = require('../core/sdk/gggm')

function tmpGggm(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gggm-'))
  const file = path.join(dir, 'sample.gggm')
  fs.writeFileSync(file, content, 'utf8')
  return file
}

test('gggm version', () => {
  if (!existsCli()) return
  const res = version()
  assert.ok(res.ok, res.error || 'version failed')
  const out = (res.stdout || '') + (res.stderr || '')
  assert.ok(out.includes('gggm v'))
})

test('gggm check simple file', () => {
  if (!existsCli()) return
  const file = tmpGggm('☆ sin : ℝ → ℝ\n☆ cos : ℝ → ℝ\n')
  const res = check(file)
  assert.ok(res.ok, res.error || 'check failed')
})
