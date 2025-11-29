# coreeeeaaaa

Automation toolkit and governance canon, split from the `haaroooo` music app. This repo holds the SSOT for gates, logging, and CLI/SDK tooling.

## Layout
- `docs/` — ADAC / canon / process notes and logging protocol.
- `functions/` — Firebase Gen2 `logAgentWorkGen2` entry (dev_ai token gated).
- `packages/cli/` — `coreeeeaaaa` CLI (`gate`, `evidence`, `pointer`).
- `packages/sdk/` — helper utilities (hashing, gate persistence, pointer writes).
- `policy/` — sample OPA policy stub for gate decisions.
- `schema/` — JSON schema for gate records.
- `actions/` — composite GitHub Action for running a gate.
- `.github/workflows/ci.yml` — install + CLI smoke test.

## Quick start
```bash
npm install
npx coreeeeaaaa gate G4 --input sample.json --out artifacts/gates
npx coreeeeaaaa evidence artifacts/gates/G4/*.json --out artifacts/evidence/manifest.json
npx coreeeeaaaa pointer --hash coreeeeaaaa-ULT-FINAL+
```

## Privacy / anonymization
- CLI supports input redaction: `--project <name>` and `--redact <regex...>` remove project names, domains, and secrets before any policy/validation.
- Sample local config for private repos: `docs/CONFIG_SAMPLE.md` (keep in `.coreeeeaaaa/config.json`, gitignored).
- Stub guard/pre-commit: `.pre-commit-config.yaml` blocks TODO/NotImplemented and runs gitleaks.

## Gate validation
- Optional JSON schema: `--schema schema/dev_gate.schema.json`
- Optional policy JSON: `--policy policy/allow.json` (must contain `{"allow": true}` or include gate in `rules`)
- Optional OPA policy: `--opa policy/gate.rego` (expects `data.gate.allow == true`)

## Logging
- Append: `npx coreeeeaaaa log --add --type instruction --actor architect --context G1 --text "spec review"`
- Tail: `npx coreeeeaaaa log --tail --lines 20`
- Stored as JSONL in `artifacts/logs/YYYY-MM-DD.log`. See `docs/LOGGING.md`.

## CAS pointer writes
- `npx coreeeeaaaa pointer --hash <canon> --if-match <etag>` enforces optimistic CAS.

## Firebase function deploy (manual)
```bash
cd functions
npm install
firebase deploy --only functions --project haaroooo-85525
```

## GitHub Action (composite)
Use `actions/gate` inside workflows:
```yaml
- uses: ./actions/gate
  env:
    GATE_ID: G4
    INPUT_JSON: artifacts/gates/G4/input.json
    OUT_DIR: artifacts/gates
```

## Notes
- `coreeeeaaaa` automation is separate from the `haaroooo` music codebase.
- All access to Firestore dev logs is locked behind the `dev_ai` token in `firestore.rules`.
