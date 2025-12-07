#!/usr/bin/env node
const { runStep } = require('../packages/sdk/autonomous/index.js')

async function main() {
  const res = await runStep()
  console.log(JSON.stringify(res, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
