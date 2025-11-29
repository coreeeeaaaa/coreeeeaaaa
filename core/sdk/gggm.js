const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

function resolveRoot() {
  const envRoot = process.env.GGGMLANG_ROOT
  if (envRoot) return envRoot
  return path.resolve(process.cwd(), '..', 'gggm_lang', 'gggm')
}

function resolveCli(root) {
  return path.join(root, 'cli.py')
}

function existsCli() {
  const root = resolveRoot()
  const cli = resolveCli(root)
  return fs.existsSync(root) && fs.existsSync(cli)
}

function runCli(args = [], { root } = {}) {
  const resolvedRoot = root || resolveRoot()
  const cli = resolveCli(resolvedRoot)
  if (!fs.existsSync(cli)) return { ok: false, error: `gggm cli not found: ${cli}` }
  const proc = spawnSync('python3', [cli, ...args], {
    cwd: resolvedRoot,
    env: process.env,
    encoding: 'utf8'
  })
  if (proc.error) return { ok: false, error: proc.error.message }
  if (proc.status !== 0) return { ok: false, error: proc.stderr || `exit ${proc.status}` }
  return { ok: true, stdout: proc.stdout.trim(), stderr: proc.stderr }
}

function version(opts = {}) {
  return runCli(['version'], opts)
}

function check(filePath, opts = {}) {
  return runCli(['check', filePath], opts)
}

function run(filePath, opts = {}) {
  return runCli(['run', filePath], opts)
}

module.exports = { version, check, run, existsCli, runCli }
