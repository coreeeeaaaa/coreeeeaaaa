import { mkdir, readFile, writeFile } from 'fs/promises'
import { createHash } from 'crypto'
import path from 'path'
import Ajv from 'ajv'
import { appendFile } from 'fs/promises'

export const defaultDirs = {
  gates: 'artifacts/gates',
  evidence: 'artifacts/evidence',
  pointers: 'artifacts/pointers',
  logs: 'artifacts/logs'
}

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true })
}

export function hashObject(value) {
  const normalized = JSON.stringify(value ?? {}, null, 2)
  return createHash('sha256').update(normalized).digest('hex')
}

export function compactTs(date = new Date()) {
  // YYMMDDHHMMSS (UTC) for compact logging
  const pad = (n) => String(n).padStart(2, '0')
  const yr = String(date.getUTCFullYear()).slice(-2)
  return `${yr}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
}

export function isoNow() {
  return new Date().toISOString()
}

export async function evaluateGate(gateId, input = {}, meta = {}) {
  const evaluatedAt = isoNow()
  const inputHash = hashObject(input)
  return {
    gateId,
    ok: true,
    evaluatedAt,
    inputHash,
    meta
  }
}

export async function validateWithSchema(data, schemaPath) {
  if (!schemaPath) return { valid: true }
  const ajv = new Ajv({ allErrors: true, strict: false })
  const schemaRaw = await readFile(schemaPath, 'utf8')
  const schema = JSON.parse(schemaRaw)
  const validate = ajv.compile(schema)
  const valid = validate(data)
  return { valid, errors: validate.errors || [] }
}

export function anonymizeContent(text, { projectName, redactPatterns = [] } = {}) {
  let result = text
  if (projectName) {
    const safe = projectName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    result = result.replace(new RegExp(safe, 'gi'), 'project-anon')
  }
  for (const pattern of redactPatterns) {
    try {
      const re = new RegExp(pattern, 'gi')
      result = result.replace(re, '[REDACTED]')
    } catch (err) {
      // ignore invalid patterns
    }
  }
  // strip likely secrets (simple heuristic)
  result = result.replace(/[A-Za-z0-9_]{16,}=*/g, '[REDACTED]')
  return result
}

export async function persistGateResult(gateId, result, rootDir = defaultDirs.gates) {
  const dir = path.join(rootDir, gateId)
  await ensureDir(dir)
  const safeStamp = (result.evaluatedAt || new Date().toISOString()).replace(/[:]/g, '-')
  const filePath = path.join(dir, `${safeStamp}.json`)
  await writeFile(filePath, JSON.stringify(result, null, 2))
  return filePath
}

export async function hashFile(filePath) {
  const buf = await readFile(filePath)
  return createHash('sha256').update(buf).digest('hex')
}

export async function packEvidence(paths = [], outputFile = path.join(defaultDirs.evidence, 'manifest.json')) {
  const createdAt = isoNow()
  const entries = []

  for (const p of paths) {
    const digest = await hashFile(p)
    entries.push({ path: p, sha256: digest })
  }

  const manifest = { createdAt, count: entries.length, entries }
  await ensureDir(path.dirname(outputFile))
  await writeFile(outputFile, JSON.stringify(manifest, null, 2))
  return { outputFile, manifest }
}

export async function setPointer(newHash, { pointerFile = path.join(defaultDirs.pointers, 'current.json'), supersedes, snapshotTs, ifMatch } = {}) {
  const now = isoNow()
  await ensureDir(path.dirname(pointerFile))
  let etagPrev = null
  try {
    const prevRaw = await readFile(pointerFile, 'utf8')
    const prev = JSON.parse(prevRaw)
    etagPrev = prev.etag || hashObject(prev)
    if (ifMatch && etagPrev !== ifMatch) {
      throw new Error('ETag mismatch; CAS failed')
    }
    supersedes = supersedes || prev.current_hash
  } catch (err) {
    // no previous pointer; proceed
  }

  const record = {
    current_hash: newHash,
    supersedes: supersedes || null,
    snapshot_ts: snapshotTs || now,
    updated_at: now,
    etag: hashObject({ newHash, supersedes, snapshotTs: snapshotTs || now })
  }
  await writeFile(pointerFile, JSON.stringify(record, null, 2))
  return pointerFile
}

export async function appendLog(entry, rootDir = defaultDirs.logs) {
  const dir = rootDir
  await ensureDir(dir)
  const tsIso = entry.ts || isoNow()
  const tsCompact = entry.ts_compact || compactTs()
  const line = JSON.stringify({ ts: tsIso, ts_compact: tsCompact, ...entry }) + '\n'
  const dayCompact = tsCompact.slice(0, 6) // YYMMDD
  const filePath = path.join(dir, `${dayCompact}.log`)
  await appendFile(filePath, line, 'utf8')
  return filePath
}

export async function tailLogs({ rootDir = defaultDirs.logs, lines = 20 } = {}) {
  const files = []
  try {
    const day = isoNow().slice(0, 10)
    files.push(path.join(rootDir, `${day}.log`))
    files.push(path.join(rootDir, `${day.replace(/\d+$/, (m) => String(Number(m) - 1).padStart(m.length, '0'))}.log`))
  } catch (err) {
    // ignore
  }
  let collected = []
  for (const f of files) {
    try {
      const content = await readFile(f, 'utf8')
      collected = collected.concat(content.trim().split('\n').filter(Boolean))
    } catch (err) {
      // skip missing
    }
  }
  const sliced = collected.slice(-lines)
  return sliced.map((l) => {
    try {
      return JSON.parse(l)
    } catch (err) {
      return { raw: l }
    }
  })
}
