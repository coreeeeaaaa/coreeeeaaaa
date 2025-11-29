#!/usr/bin/env node
import { readFileSync } from 'fs'

const forbidden = [
  'TODO',
  'FIXME',
  'NotImplemented',
  'raise NotImplementedError',
  'pass  # TODO',
  'return None  # stub',
  'skeleton',
  'placeholder',
  'example only'
]

const filePatterns = process.argv.slice(2)
if (!filePatterns.length) {
  console.error('usage: stub-guard.js <file> [file...]')
  process.exit(1)
}

let violations = []
for (const file of filePatterns) {
  try {
    const text = readFileSync(file, 'utf8')
    forbidden.forEach((marker) => {
      if (text.includes(marker)) {
        violations.push(`${file}: ${marker}`)
      }
    })
  } catch (err) {
    // ignore missing files
  }
}

if (violations.length) {
  console.error('Stub guard violations:')
  violations.forEach((v) => console.error(`- ${v}`))
  process.exit(1)
}

console.log('stub-guard: OK')
