const fs = require('fs')
const path = require('path')

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

async function loadContext(task = {}) {
  const mockPath = process.env.CONTEXT7_MOCK_PATH
  if (mockPath) {
    const resolved = path.isAbsolute(mockPath) ? mockPath : path.join(process.cwd(), mockPath)
    return loadMockContext(resolved)
  }
  return fetchContextFromApi(task)
}

module.exports = { loadContext }
