const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawnSync } = require('child_process')

function resolveRoot() {
  const envRoot = process.env.JIWOLLF_ROOT
  if (envRoot) return envRoot
  return path.resolve(process.cwd(), '..', 'jiwol2', 'jiwollf_refimpl_v1_1')
}

function resolveRunner(root) {
  return path.join(root, 'tools', 'jiwol_run.py')
}

function existsRunner() {
  const root = resolveRoot()
  const runner = resolveRunner(root)
  return fs.existsSync(root) && fs.existsSync(runner)
}

function runFile(filePath, { mode = 'STRICT', seed = 0, root } = {}) {
  const resolvedRoot = root || resolveRoot()
  const runner = resolveRunner(resolvedRoot)
  if (!fs.existsSync(runner)) {
    return { ok: false, error: `runner not found: ${runner}` }
  }
  const env = { ...process.env, PYTHONPATH: `${resolvedRoot}${path.delimiter}${process.env.PYTHONPATH || ''}` }
  const proc = spawnSync('python3', [runner, filePath, '--mode', mode, '--seed', String(seed)], {
    cwd: resolvedRoot,
    env,
    encoding: 'utf8'
  })
  if (proc.error) return { ok: false, error: proc.error.message }
  if (proc.status !== 0) return { ok: false, error: proc.stderr || `exit ${proc.status}` }
  try {
    const parsed = JSON.parse(proc.stdout)
    return { ok: true, result: parsed }
  } catch (err) {
    return { ok: false, error: `parse failed: ${err.message}`, stdout: proc.stdout }
  }
}

function runSource(source, opts = {}) {
  const tmp = path.join(os.tmpdir(), `jiwol-${Date.now()}-${Math.random().toString(16).slice(2)}.jiwol`)
  fs.writeFileSync(tmp, source, 'utf8')
  try {
    return runFile(tmp, opts)
  } finally {
    try { fs.unlinkSync(tmp) } catch (err) { /* ignore */ }
  }
}

module.exports = { runFile, runSource, existsRunner }
