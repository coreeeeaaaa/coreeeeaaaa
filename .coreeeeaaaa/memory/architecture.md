# 시스템 아키텍처 (System Architecture)

## 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                     coreeeeaaaa 생태계                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   개발자      │     │   AI (Claude)│     │  터미널 사용자│
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │ import             │ MCP Protocol       │ shell
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     SDK      │     │  MCP Server  │     │     CLI      │
│  (library)   │     │   (tools)    │     │  (commands)  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │                    └────────┬───────────┘
       │                             │
       │                             │ calls
       ▼                             ▼
┌──────────────────────────────────────────────────────────┐
│                     Taskfile.yml                          │
│                  (Single Source of Truth)                 │
└──────────────────────────────────────────────────────────┘
       │                             │
       │ invokes                     │ invokes
       ▼                             ▼
┌──────────────┐             ┌──────────────┐
│ Rust Engine  │             │  Local Tools │
│  (engine-rs) │             │  (npm, git)  │
└──────────────┘             └──────────────┘
```

---

## 패키지별 상세 아키텍처

### 1. @coreeeeaaaa/sdk (라이브러리)

**목적**: 다른 프로젝트에 embed하여 Gate, Evidence, Lineage 기능 제공

```typescript
// 사용 예시
import { CoreSDK } from '@coreeeeaaaa/sdk';

const sdk = new CoreSDK({
  projectId: 'my-app',
  rootDir: process.cwd(),
});

await sdk.init();
await sdk.runGate('quality', { code: '...' });
await sdk.appendEvidence({ type: 'test', path: './coverage' });
```

**내부 구조**:
```
sdk/src/
├── index.ts              # CoreSDK 메인 클래스
├── types.ts              # 타입 정의
├── utils.ts              # 유틸리티 (해시, 타임스탬프)
├── gate.ts               # Gate 검증
├── evidence.ts           # Evidence 수집
├── pointer.ts            # Pointer 관리 (CAS)
├── storage.ts            # Storage 백엔드
├── uem-adapter.ts        # Rust 엔진 연동
└── autonomous.ts         # 자율 에이전트 (실험적)
```

**데이터 흐름**:
1. SDK 메서드 호출 (`runGate`)
2. 로컬 artifacts/ 디렉토리에 기록
3. Rust 엔진으로 로그 전송 (선택적)
4. Storage 백엔드에 복제 (선택적)

---

### 2. @coreeeeaaaa/core (MCP 서버)

**목적**: AI 에이전트가 로컬 개발 자동화 작업을 수행할 수 있는 도구 제공

```json
// Claude Desktop 설정
{
  "mcpServers": {
    "coreeeeaaaa": {
      "command": "node",
      "args": ["/.../packages/core/dist/mcp-server.js"]
    }
  }
}
```

**내부 구조**:
```
core/src/
├── mcp-server.ts           # MCP SDK 기반 서버 엔트리포인트
└── tools/
    ├── taskRunner.ts       # Taskfile.yml 실행
    ├── specBridge.ts       # .coreeeeaaaa/specs/ CRUD
    ├── constitution.ts     # constitution.md 조회
    └── securityAudit.ts    # trivy/gitleaks 실행
```

**도구 목록**:
| 도구 이름 | 설명 | 파라미터 |
|-----------|------|----------|
| `run_task` | Taskfile.yml 작업 실행 | `task_name` |
| `manage_spec` | SpecKit 명세 관리 | `action`, `feature_id`, `content` |
| `consult_constitution` | 프로젝트 헌법 조회 | `query` |
| `audit_security` | 보안 스캔 | (없음) |

**프로토콜 흐름**:
```
AI Client (Claude Desktop)
    ↓ JSON-RPC 2.0 over stdio
MCP Server (Node.js)
    ↓ spawn()
Local Tools (task, trivy, gitleaks)
    ↓ stdout/stderr
MCP Server
    ↓ JSON response
AI Client
```

---

### 3. @coreeeeaaaa/cli (CLI 도구)

**목적**: 터미널에서 직접 실행 가능한 명령 제공

```bash
coreeeeaaaa init              # SDK 초기화
coreeeeaaaa log --text "..."  # UEM 로그 기록
coreeeeaaaa workflow --config workflow.json
coreeeeaaaa autonomous --llm ollama
```

**내부 구조**:
```
cli/src/
├── index.ts                  # Commander.js 기반 CLI
└── commands/
    ├── workflow.ts           # 멀티 에이전트 워크플로우
    └── autonomous.ts         # 자율 에이전트 루프
```

**CLI ↔ SDK 관계**:
```typescript
// CLI는 SDK를 사용
import { CoreSDK } from '@coreeeeaaaa/sdk';

const sdk = new CoreSDK();
await sdk.init();  // artifacts/ 디렉토리 생성
```

---

### 4. engine-rs (Rust 엔진)

**목적**: 고성능 로깅, UEM 트리, 양자 연산 (실험적)

**구조**:
```rust
engine-rs/src/
├── lib.rs              # 라이브러리 엔트리포인트
├── main.rs             # CLI 바이너리
├── ledger.rs           # 불변 원장
├── uem_tree.rs         # UEM 트리 구조
├── quantum.rs          # 양자 연산 (실험적)
├── jiwol_id.rs         # Jiwol ID 관리
└── ahs.rs              # AHS 시스템
```

**Node.js 연동**:
```typescript
// SDK에서 Rust 호출
private async sendToRustEngine(record: any) {
  const child = spawn('cargo', [
    'run',
    '--manifest-path',
    'packages/engine-rs/Cargo.toml',
    '--',
    'append'
  ]);

  child.stdin.write(JSON.stringify(record));
  child.stdin.end();
}
```

**상태**: 실험적 (선택적 의존성)

---

## 데이터 흐름

### 시나리오 1: AI가 품질 검사 수행

```
1. 사용자 → Claude: "quality 태스크 실행해줘"
2. Claude → MCP Server: run_task({ task_name: "quality" })
3. MCP Server → Taskfile: spawn("task", ["quality"])
4. Taskfile → Tools:
   - npm run lint
   - npm run test
   - trivy fs .
5. Tools → Taskfile: stdout/stderr
6. Taskfile → MCP Server: exit code + output
7. MCP Server → Claude: JSON response
8. Claude → 사용자: "품질 검사 완료, 3개 이슈 발견"
```

### 시나리오 2: 개발자가 SDK로 Gate 실행

```
1. 개발자 코드:
   const sdk = new CoreSDK();
   await sdk.runGate('quality', input);

2. SDK:
   - AJV로 JSON Schema 검증
   - 결과를 artifacts/gates/quality/2025-12-05.json에 저장
   - Rust 엔진으로 로그 전송 (선택적)
   - Storage 백엔드에 복제 (선택적)

3. 반환:
   { ok: true, gateId: 'quality', inputHash: '...' }
```

---

## 디렉토리 구조

```
coreeeeaaaa/
├── .coreeeeaaaa/           # 프레임워크 문서 중추
│   ├── MASTER.md           # 필독 시작점
│   ├── memory/             # 철학, 헌법, 아키텍처
│   ├── specs/              # 패키지 명세
│   ├── guides/             # 온보딩, 기여
│   └── knowledge/          # ADR, 트러블슈팅
│
├── packages/
│   ├── sdk/                # @coreeeeaaaa/sdk
│   │   ├── src/
│   │   ├── dist/           # 빌드 산출물
│   │   └── package.json
│   │
│   ├── core/               # @coreeeeaaaa/core (MCP)
│   │   ├── src/
│   │   │   ├── mcp-server.ts
│   │   │   └── tools/
│   │   ├── dist/
│   │   └── package.json
│   │
│   ├── cli/                # @coreeeeaaaa/cli
│   │   ├── src/
│   │   ├── dist/
│   │   └── package.json
│   │
│   └── engine-rs/          # Rust 엔진
│       ├── src/
│       ├── Cargo.toml
│       └── target/
│
├── artifacts/              # SDK 실행 시 생성
│   ├── gates/
│   ├── evidence/
│   ├── pointers/
│   ├── logs/
│   └── budget/
│
├── Taskfile.yml            # 자동화 작업 SSOT
├── package.json            # Monorepo 설정
├── USER_GUIDE.md           # 최종 사용자 문서
└── README.md               # 프로젝트 소개
```

---

## 의존성 그래프

```
┌─────────┐
│   CLI   │
└────┬────┘
     │ depends on
     ▼
┌─────────┐
│   SDK   │
└────┬────┘
     │ optional
     ▼
┌─────────┐
│ Rust    │
│ Engine  │
└─────────┘

┌─────────┐
│   MCP   │  (독립, 의존성 없음)
└─────────┘
```

**중요**: MCP Server는 SDK에 의존하지 **않는다**. 각자 독립 실행.

---

## 확장 포인트

### SDK 확장
- 새로운 Storage 백엔드 추가 (`storage.ts`)
- 커스텀 Gate 유형 정의
- Evidence 타입 확장

### MCP 확장
- 새 도구 추가: `tools/myTool.ts` + `mcp-server.ts` 등록
- Taskfile에 새 작업 정의

### CLI 확장
- 새 명령 추가: `commands/myCommand.ts` + `index.ts` 등록

---

**다음 읽기**: [`guides/onboarding.md`](../guides/onboarding.md) - 개발 환경 설정
