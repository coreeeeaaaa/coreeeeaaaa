const fs = require('fs');
const path = require('path');
const BUDGET = Number(process.env.BUDGET) || 100;

const budgetDir = path.join('artifacts', 'budget');
if (!fs.existsSync(budgetDir)) {
  console.log('✅ Budget OK (no budget data)');
  process.exit(0);
}

const budgetFiles = fs.readdirSync(budgetDir).filter(file => file.endsWith('.jsonl'));
let total = 0;

budgetFiles.forEach(file => {
  const lines = fs.readFileSync(path.join(budgetDir, file), 'utf8').split('\n');
  lines.forEach(line => {
    if (!line.trim()) return;
    try {
      const entry = JSON.parse(line);
      total += Number(entry.amount) || 0;
    } catch (err) {
      console.warn('invalid budget entry', err.message, line);
    }
  });
});

console.log(`Total: $${total} / $${BUDGET}`);

if (total > BUDGET) {
  console.error('❌ Budget exceeded!');
  process.exit(1);
}

if (total > BUDGET * 0.8) {
  console.warn('⚠️  80% budget used');
}

console.log('✅ Budget OK');
