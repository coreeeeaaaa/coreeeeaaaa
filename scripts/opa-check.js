#!/usr/bin/env node
// OPA check runner. Fails if opa is missing or evaluation fails.
// Expects gate input at policy/input.json (adjust if needed).

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const REGO = 'policy/gate.rego';
const INPUT = 'policy/input.json';

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

if (!exists(REGO)) {
  console.error(`[opa-check] Missing policy file: ${REGO}`);
  process.exit(1);
}
if (!exists(INPUT)) {
  console.error(`[opa-check] Missing input file: ${INPUT}`);
  process.exit(1);
}

try {
  execSync('opa version', { stdio: 'ignore' });
} catch {
  console.error('[opa-check] opa not installed. Install: https://www.openpolicyagent.org/docs/');
  process.exit(1);
}

try {
  const cmd = `opa eval -i ${INPUT} -d ${REGO} "data.gate.allow"`;
  const out = execSync(cmd, { encoding: 'utf8' });
  if (!out.includes('true')) {
    console.error('[opa-check] gate.allow is not true');
    console.error(out.trim());
    process.exit(1);
  }
  console.log('[opa-check] gate.allow == true');
} catch (err) {
  console.error('[opa-check] evaluation failed');
  console.error(err.stdout?.toString() || err.message);
  process.exit(1);
}
