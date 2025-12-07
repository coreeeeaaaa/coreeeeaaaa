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

## Serena (풀버전) 실행

### 독립 서버 실행 (권장)
```bash
# Serena 독립 서버 시작 (포트 3435)
uvx --from git+https://github.com/oraios/serena serena start-mcp-server --project . --port 3435

# 헬스체크
curl http://127.0.0.1:3435/health
```

### 내부 Serena MCP 설정
- **기본 비활성 권장**: 내부 MCP 서버는 포트 충돌 방지를 위해 `SERENA_ENABLED=false` 환경변수로 비활성화
- **포트 분리**: 독립 실행 시 포트 3435 사용 (기본 24282와 충돌 방지)
- **환경변수 활성화**: `SERENA_ENABLED=true` 시 내부 MCP 자동 활성화

## 품질 게이트 & Stop 규칙
- DoD: 빌드(`npm run build --workspaces`), 테스트(`npm test --workspaces`), 정책(`npm run opa-check` 존재 시), 보안 스캔(gitleaks/trivy, 없으면 스킵 기록), 로그/증거 기록, 성능/커버리지 회귀 없음.
- Stop: DoD가 모두 통과하고 신규 요구/회귀가 없으면 추가 “개선” 중단. 실패 시에만 개선 반복.
- 자세한 규칙: `docs/QUALITY_GATES.md`

## 스크립트
```bash
# Serena 서버 실행
npm run serena:run

# Serena 헬스체크
npm run serena:health

# core MCP 서버 실행
npm run core:mcp

# OPA 정책 검증 (현재 스텁)
npm run opa-check

# 출시 전 품질 게이트 (권장)
npm run build --workspaces && npm run test --workspaces && npm run opa-check && task security
```

## Status
- SDK/CLI: v0.1.0 (Ready)
- Serena 통합: v0.1.0 (포트 분리 완료)
