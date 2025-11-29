#!/usr/bin/env node
// Fail-closed budget gate. Reads env BUDGET (number) and optional COST_USED (number, default 0).
// Exits 1 if budget signal missing or exceeded.

const budgetEnv = process.env.BUDGET
if (!budgetEnv) {
  console.error('budget-check: missing BUDGET env (fail-closed)')
  process.exit(1)
}

const budget = Number(budgetEnv)
if (Number.isNaN(budget) || budget <= 0) {
  console.error('budget-check: invalid BUDGET env (must be > 0)')
  process.exit(1)
}

const usedEnv = process.env.COST_USED || '0'
const used = Number(usedEnv)
if (Number.isNaN(used) || used < 0) {
  console.error('budget-check: invalid COST_USED env')
  process.exit(1)
}

if (used > budget) {
  console.error(`budget-check: over budget (${used} > ${budget})`)
  process.exit(1)
}

console.log(`budget-check: ok (used=${used}, budget=${budget})`)
