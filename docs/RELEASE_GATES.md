# Release gates (minimum)
- Install succeeds: `npm install`
- CLI smoke: `npx coreeeeaaaa --help`
- Gate sample: `npx coreeeeaaaa gate G0 --out artifacts/gates`
- Evidence manifest writes: `npx coreeeeaaaa evidence artifacts/gates/G0/*.json`
- Pointer write: `npx coreeeeaaaa pointer --hash <canon>`
- Budget gate: `BUDGET` env set and `node scripts/budget-check.js` passes (fail-closed if missing)
- OPA gate: `coreeeeaaaa gate ... --opa policy/gate.rego --schema schema/dev_gate.schema.json`
