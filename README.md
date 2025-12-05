# coreeeeaaaa

Universal development automation framework. This repo holds the SSOT for gates, logging, and CLI/SDK tooling.

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
# Install globally
npm install -g @coreeeeaaaa/cli

# Initialize a new project
coreeeeaaaa init
```

## Storage drivers (Local-first by default)

- The canonical UEM ledger lives in `.core/core.uem`, but all auxiliary logs/gates/status snapshots flow through a `StorageDriver` abstraction.
- `.core/storage.toml` (plus `COREEEEEAAAA_STORAGE_PROVIDER`) selects the provider: `local-fs` (default), `gcp-firestore`, `aws-dynamodb`, `azure-cosmos`, or `http-rest`.
- `packages/sdk/src/storage` implements the interface; `local-fs` writes into `artifacts/logs`, `artifacts/gates`, and `artifacts/status`. The other modules are placeholders that throw until you implement them.
- See `docs/LOCAL_FIRST.md` for the local-only workflow and `docs/STORAGE_BACKENDS.md` for the inventory of existing logging endpoints.

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

## Supply chain
- Install syft/cosign via `./scripts/install-syft-cosign.sh` (workflows run it automatically)
- SBOM: `./scripts/sbom.sh .` (sign with `COSIGN_KEY` to emit `.sig`)

## CAS pointer writes
- `npx coreeeeaaaa pointer --hash <canon> --if-match <etag>` enforces optimistic CAS.

## Firebase function deploy (manual)
```bash
cd functions
npm install
firebase deploy --only functions --project <your-project-id>
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

## Auto PR / auto merge
- On push to `automation`, `.github/workflows/create-pr.yml` opens a PR to `main` if none exists.
- After `guard` workflow succeeds, `.github/workflows/auto-merge.yml` auto-merges that PR (squash).

## Legal / Disclaimer

This repository and its CLI/SDK packages are provided “as-is” under the Apache 2.0 license. No warranties are extended, and the maintainers are not liable for any direct, indirect, or consequential damages arising from the use of this software. When you build or publish the packages, ensure that you comply with all third-party license terms referenced in `package-lock.json` and `pnpm-lock.yaml`.

## Notes
- Project-agnostic; configure your own Firebase project ID and dev_ai token.
- All access to Firestore dev logs is locked behind the `dev_ai` token in `firestore.rules`.

## Status
- SDK/CLI: v0.1.0 (Ready)
