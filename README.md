# coreeeeaaaa V3.0.0.0

🚀 **지속성 고도화 개발 자동화 프레임워크**

Universal development automation framework with **V3 지속성 워크스페이스** - 반복 지시 없는 다중 에이전트 장기 작업 자율 운영 시스템.

## 🎯 V3.0.0.0 핵심 혁신

### 🤖 **다중 에이전트 시스템**
- **boosaan**: 컨텍스트 관리자 - 상태 지속성, 세션 격리
- **uijeongboo**: 인터페이스 관리자 - UI 자동화, UX 최적화
- **oolsaan**: 품질 보증 - 코드 검증, 자동 테스트, 성능 분석
- **ilsaan**: 워크플로우 관리자 - 작업 순서화, 자동 복구

### 🔄 **지속성 워크플로우 엔진**
- **자동 작업 이어가기**: 15분 간격 체크포인트
- **실패 자동 복구**: 중단 지점에서 즉시 재개
- **에이전트 간 자동 전환**: 순차적 작업 흐름
- **장기 작업 지원**: 여러 날에 걸친 고도화 작업

### 💾 **상태 관리 시스템**
- **Agent Registry**: 실시간 에이전트 상태 추적
- **Task Continuum**: 워크플로우 템플릿 및 진행률 관리
- **체크포인트 메모리**: `.persistence/agent_memory/`에 영구 저장

## Layout
- `docs/` — ADAC / canon / process notes and logging protocol.
- `functions/` — Firebase Gen2 `logAgentWorkGen2` entry (dev_ai token gated).
- `packages/cli/` — `coreeeeaaaa` CLI (`gate`, `evidence`, `pointer`).
- `packages/sdk/` — helper utilities (hashing, gate persistence, pointer writes).
- `policy/` — sample OPA policy stub for gate decisions.
- `schema/` — JSON schema for gate records.
- `actions/` — composite GitHub Action for running a gate.
- `.github/workflows/ci.yml` — install + CLI smoke test.

## 🚀 Quick start

### V3 지속성 워크스페이스 시작
```bash
# 1. V3 지속성 시스템 직접 실행
python3 -c "
import sys
sys.path.append('.')
exec(open('.automation/task_templates/auto_continuation_engine.py').read())

# 에이전트 활성화
import asyncio
engine = AutoContinuationEngine('.')

# 복잡한 프로젝트 시작
async def start_project():
    result = await engine.start_workflow('development_cycle', {
        'project_name': '내프로젝트',
        'target_feature': '자동화_시스템',
        'priority': 'high'
    })
    print(f'🚀 워크플로우 시작: {result[\"id\"]}')
    print('🤖 에이전트들이 자동으로 작업을 시작합니다')

asyncio.run(start_project())
"

# 2. 전통 coreeeeaaaa CLI 사용
npm install -g @coreeeeaaaa/cli
coreeeeaaaa init
```

### 📊 실시간 상태 확인
```bash
# 에이전트 상태 확인
python3 -c "
import json
with open('.state_management/agent_registry.json', 'r') as f:
    registry = json.load(f)

for agent_id, agent in registry['agents'].items():
    if agent.get('current_task'):
        print(f'🤖 {agent[\"role\"]} ({agent_id}): {agent[\"current_task\"][\"description\"]}')
"

# 워크플로우 진행률 확인
python3 -c "
import json
with open('.state_management/task_continuum.json', 'r') as f:
    continuum = json.load(f)

print(f'🔄 활성 워크플로우: {len(continuum.get(\"active_workflows\", []))}')
print(f'✅ 완료 워크플로우: {len(continuum.get(\"completed_workflows\", []))}')
"
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

## 🔧 V3 지속성 시스템 아키텍처

### 📁 **핵심 구조**
```
├── .automation/
│   └── task_templates/
│       └── auto_continuation_engine.py    # 🚀 자동화 엔진
├── .state_management/
│   ├── agent_registry.json                 # 🤖 에이전트 상태
│   └── task_continuum.json               # 🔄 워크플로우 관리
├── .persistence/
│   └── agent_memory/                       # 💾 체크포인트 저장
│       ├── boosaan/                        # 컨텍스트 관리자
│       ├── oolsaan/                         # 품질 보증
│       ├── ilsaan/                          # 워크플로우 관리
│       └── uijeongboo/                      # 인터페이스 관리
└── .mcp.json                              # 🌐 MCP 서버 설정
```

### ⚙️ **워크플로우 템플릿**
1. **development_cycle**: 요구사항 → 설계 → 구현 → 테스트 → 배포
2. **feature_enhancement**: 분석 → 설계 → 구현 → 검증

### 🎯 **사용 시나리오**
- **단일 프로젝트**: 자동화된 개발 사이클
- **다중 프로젝트**: 병렬 에이전트 작업 분배
- **장기 프로젝트**: 수일간 지속적인 작업 자동화
- **복잡 시스템**: 여러 단계 걸친 고도화 작업

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
- **V3.0.0.0**: ✅ 지속성 워크스페이스 완전 통합
- **SDK/CLI**: v0.1.0 (Ready)
- **Serena 통합**: v0.1.0 (포트 분리 완료)
- **다중 에이전트**: ✅ 4개 전문가 에이전트 운영 중
- **자동 복구**: ✅ 15분 간격 체크포인트 시스템
- **실전 증명**: ✅ AI_기반_자동화_플랫폼� 프로젝트 운영

## 🎯 V3 실전 운영 결과

### 📊 **현재 운영 중인 프로젝트**
- **AI_기반_자동화_플랫폼�**: 다중 에이전트 협업 시스템 구축
- **다중_에이전트_협업_시스템**: 분산형 작업 자동화
- **자동 체크포인트**: 실시간 상태 저장 및 복구

### 🤖 **에이전트 배치 현황**
1. **boosaan** (컨텍스트 관리자): 코드 구현 및 개발
2. **uijeongboo** (인터페이스 관리자): 시스템 설계 및 UI/UX
3. **oolsaan** (품질 보증): 테스트 및 검증
4. **ilsaan** (워크플로우 관리자): 배포 준비 및 자동화

## 🔗 연관 시스템
- **MCP 오케스트레이션**: 다중 서버 통합 관리
- **Firebase 연동**: 클라우드 로깅 및 상태 저장
- **GitHub Actions**: 자동 빌드 및 배포 파이프라인
- **OPA 정책**: 정책 기반 게이트 검증

---

**🚀 V3.0.0.0: 반복 지시 없는 완전 자동화 개발 환경**
