#!/usr/bin/env node
// Fail-closed budget gate.
// Usage: node scripts/budget-check.js [--budget=N] [--used=N]
// Or via ENV: BUDGET=N COST_USED=N

const args = process.argv.slice(2);
const getArg = (key) => {
    const flag = args.find(a => a.startsWith(`--${key}=`));
    return flag ? flag.split('=')[1] : process.env[key.toUpperCase()];
};

const budgetStr = getArg('budget');
if (!budgetStr) {
  console.error('budget-check: missing budget limit (env BUDGET or --budget)');
  process.exit(1);
}

const budget = Number(budgetStr);
if (Number.isNaN(budget) || budget <= 0) {
  console.error('budget-check: invalid budget limit');
  process.exit(1);
}

const usedStr = getArg('used') || getArg('cost_used') || '0';
const used = Number(usedStr);

if (Number.isNaN(used) || used < 0) {
  console.error('budget-check: invalid used amount');
  process.exit(1);
}

console.log(`Budget Check: Used ${used} / Limit ${budget}`);

if (used > budget) {
  console.error(`TOTAL FAILURE: Over budget!`);
  process.exit(1);
}

console.log('Budget OK.');