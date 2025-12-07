const fs = require('fs')
const path = require('path')

function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

function readDirIfExists(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true })
    return fs.readdirSync(dir)
  } catch {
    return []
  }
}

function loadMemoriesSync() {
  const docs = []
  const serenaDir = path.join(process.cwd(), '.serena', 'memories')
  const coreDir = path.join(process.cwd(), '.coreeeeaaaa', 'memory')

  for (const dir of [serenaDir, coreDir]) {
    const files = readDirIfExists(dir).filter((f) => f.endsWith('.md'))
    for (const file of files) {
      const p = path.join(dir, file)
      try {
        const content = fs.readFileSync(p, 'utf8')
        docs.push({
          name: path.basename(file, '.md'),
          path: p,
          source: dir.includes('.serena') ? 'serena' : 'core',
          content,
        })
      } catch {
        // ignore read errors per file
      }
    }
  }
  return docs
}

function rankDocs(docs, query) {
  const queryTokens = tokenize(query)
  if (!queryTokens.length) return []

  const tokenized = docs.map((d) => ({ ...d, tokens: tokenize(d.content) }))
  const df = new Map()
  for (const d of tokenized) {
    for (const tok of new Set(d.tokens)) {
      df.set(tok, (df.get(tok) || 0) + 1)
    }
  }
  const N = tokenized.length || 1

  const qCounts = new Map()
  queryTokens.forEach((t) => qCounts.set(t, (qCounts.get(t) || 0) + 1))
  const qVec = new Map()
  for (const [tok, c] of qCounts.entries()) {
    const idf = Math.log(1 + N / (1 + (df.get(tok) || 0)))
    qVec.set(tok, (c / queryTokens.length) * idf)
  }

  const results = []
  for (const d of tokenized) {
    if (!d.tokens.length) continue
    const tf = new Map()
    d.tokens.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1))

    const dVec = new Map()
    for (const [tok, c] of tf.entries()) {
      const idf = Math.log(1 + N / (1 + (df.get(tok) || 0)))
      dVec.set(tok, (c / d.tokens.length) * idf)
    }

    let dot = 0
    let dNorm = 0
    let qNorm = 0
    for (const v of dVec.values()) dNorm += v * v
    for (const v of qVec.values()) qNorm += v * v
    const norm = Math.sqrt(dNorm) * Math.sqrt(qNorm || 1)
    for (const [tok, qVal] of qVec.entries()) {
      dot += qVal * (dVec.get(tok) || 0)
    }
    const score = norm === 0 ? 0 : dot / norm

    const lower = d.content.toLowerCase()
    let idx = -1
    for (const tok of queryTokens) {
      idx = lower.indexOf(tok)
      if (idx >= 0) break
    }
    const start = Math.max(0, idx >= 0 ? idx - 50 : 0)
    const end = Math.min(d.content.length, idx >= 0 ? idx + 200 : 200)
    const snippet = d.content.slice(start, end).replace(/\s+/g, ' ').trim()

    results.push({
      name: d.name,
      path: d.path,
      source: d.source,
      score,
      snippet,
    })
  }

  return results
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}

async function loadMockContext(mockPath) {
  try {
    const raw = fs.readFileSync(mockPath, 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    return { error: err.message }
  }
}

async function fetchContextFromApi(task) {
  const url = process.env.CONTEXT7_API_URL
  const key = process.env.CONTEXT7_API_KEY
  if (!url || !key || typeof fetch !== 'function') {
    return { note: 'context7 api unavailable' }
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({ task })
    })
    if (!res.ok) {
      return { error: `context7 http ${res.status}` }
    }
    return await res.json()
  } catch (err) {
    return { error: err.message }
  }
}

function deriveQueryFromTask(task) {
  if (typeof task === 'string') return task
  if (!task || typeof task !== 'object') return ''
  return (
    task.query ||
    task.text ||
    task.title ||
    task.description ||
    JSON.stringify(task)
  )
}

async function localContext(task) {
  const docs = loadMemoriesSync()
  if (!docs.length) {
    return { note: 'no local memories found' }
  }
  const query = deriveQueryFromTask(task)
  const results = rankDocs(docs, query)
  return {
    source: 'local-memory',
    query,
    results,
  }
}

async function loadContext(task = {}) {
  const mockPath = process.env.CONTEXT7_MOCK_PATH
  if (mockPath) {
    const resolved = path.isAbsolute(mockPath) ? mockPath : path.join(process.cwd(), mockPath)
    return loadMockContext(resolved)
  }
  const remote = await fetchContextFromApi(task)
  if (remote && !remote.error && !remote.note) {
    return remote
  }
  return localContext(task)
}

module.exports = { loadContext }
