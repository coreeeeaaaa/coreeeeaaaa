#!/usr/bin/env node
// Summarize today's logs into a compact JSON for quick review.
// Input: artifacts/logs/YYMMDD.log
// Output: artifacts/logs/YYMMDD.summary.json

import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'

const root = 'artifacts/logs'

function todayCompact() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const yy = String(now.getUTCFullYear()).slice(-2)
  return `${yy}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`
}

async function main() {
  const day = process.env.DAY || todayCompact()
  const logPath = path.join(root, `${day}.log`)
  let lines = []
  try {
    const content = await readFile(logPath, 'utf8')
    lines = content.trim().split('\n').filter(Boolean)
  } catch (err) {
    console.error(`no logs for ${day}`)
    return
  }

  const entries = lines.map((l) => {
    try { return JSON.parse(l) } catch { return null }
  }).filter(Boolean)

  const summary = {
    day,
    total: entries.length,
    by_type: {},
    by_actor: {},
    last: entries.slice(-5)
  }

  for (const e of entries) {
    summary.by_type[e.type || 'unknown'] = (summary.by_type[e.type || 'unknown'] || 0) + 1
    summary.by_actor[e.actor || 'unknown'] = (summary.by_actor[e.actor || 'unknown'] || 0) + 1
  }

  const outPath = path.join(root, `${day}.summary.json`)
  await mkdir(root, { recursive: true })
  await writeFile(outPath, JSON.stringify(summary, null, 2))
  console.log(`summary -> ${outPath}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
