# 설계 철학 (Design Philosophy)

> "단순함이 최고의 정교함이다" - Leonardo da Vinci

---

## 핵심 철학

### 1. 분리와 독립 (Separation of Concerns)

**원칙**: 각 패키지는 독립적인 제품이며, 서로 다른 사용자를 대상으로 한다.

| 패키지 | 대상 사용자 | 사용 방식 |
|--------|-------------|-----------|
| SDK | 개발자 | `import { CoreSDK } from '@coreeeeaaaa/sdk'` |
| MCP Server | AI 에이전트 | MCP 프로토콜 도구 호출 |
| CLI | 터미널 사용자 | `coreeeeaaaa init` |

**왜?**
- SDK를 사용하는 개발자는 MCP 서버가 필요 없다
- AI는 CLI를 직접 실행하지 않는다
- 각 도구는 자신의 역할에만 집중

**금지 사항**:
- ❌ "SDK와 MCP를 통합"하려는 시도
- ❌ "CLI에서 MCP 서버를 자동 시작"하는 기능
- ❌ 모든 기능을 하나의 패키지에 넣기

---

### 2. 수동적 아키텍처 (Passive Architecture)

**원칙**: 서버/도구는 요청에만 반응한다. 스스로 AI를 호출하지 않는다.

```
✅ 올바른 흐름:
AI → [MCP 요청] → Server → [결과] → AI

❌ 잘못된 흐름:
AI → [MCP 요청] → Server → [AI 호출] → 무한 루프
```

**이유**:
- 예측 가능성: 서버는 deterministic하게 동작
- 보안: 외부 API 호출 최소화
- 디버깅 용이: 요청-응답만 추적하면 됨

**구현**:
- MCP 서버는 `CallToolRequest`만 처리
- LLM 호출 로직은 **클라이언트(AI)가 담당**
- 서버는 로컬 작업(파일, 프로세스)만 수행

---

### 3. 단일 진실 공급원 (Single Source of Truth)

**원칙**: 모든 자동화 작업은 `Taskfile.yml`에 정의된다.

```yaml
# Taskfile.yml - SSOT
tasks:
  quality:
    desc: '품질 검사'
    cmds:
      - npm run lint
      - npm run test
      - trivy fs .
```

MCP 도구 `run_task`는 **Taskfile을 호출하는 얇은 래퍼**일 뿐이다.

**이유**:
- 중복 방지: 같은 로직을 여러 곳에 구현하지 않음
- 일관성: CLI, MCP, 수동 실행 모두 동일한 작업 수행
- 유지보수: Taskfile만 수정하면 전체 시스템 업데이트

**금지 사항**:
- ❌ MCP 도구 안에 빌드 로직 하드코딩
- ❌ CLI와 MCP에 다른 구현 사용
- ❌ 환경변수로 동작 변경 (명시적 Task로 정의)

---

### 4. 증거 기반 개발 (Evidence-Based Development)

**원칙**: 모든 주장은 증거로 뒷받침되어야 한다.

```typescript
// SDK 예시
await sdk.runGate('quality', input);
// → artifacts/gates/quality/2025-12-05.json에 증거 저장

await sdk.appendEvidence({
  type: 'test_result',
  path: './coverage/lcov.info',
});
// → artifacts/evidence/manifest.jsonl에 기록
```

**증거 유형**:
- 빌드 로그
- 테스트 커버리지
- 보안 스캔 결과
- Git 커밋 해시
- 타임스탬프

**이유**:
- 감사 추적 (Audit Trail)
- 문제 재현 가능
- 규제 준수 (Compliance)

---

### 5. 표준 준수 (Standards Compliance)

**원칙**: 직접 발명하지 말고, 기존 표준을 따른다.

| 영역 | 표준 |
|------|------|
| MCP 프로토콜 | `@modelcontextprotocol/sdk` |
| 자동화 | Taskfile (Task Runner) |
| 타입 안전성 | TypeScript strict mode |
| 모듈 시스템 | ESM (ES Modules) |
| 버전 관리 | Semantic Versioning |

**비표준 금지**:
- ❌ 커스텀 stdin/stdout 프로토콜
- ❌ Plain JavaScript (타입 없음)
- ❌ CommonJS (`require()`)

---

### 6. 점진적 개선 (Incremental Improvement)

**원칙**: 완벽을 추구하기보다, 작동하는 최소 버전부터 시작한다.

**MVP (Minimum Viable Product)**:
- SDK: Gate + Evidence 기본 기능
- MCP: 4가지 핵심 도구
- CLI: init + log 명령

**확장 방향**:
- SDK: 더 많은 Gate 유형, Storage 백엔드
- MCP: 프로젝트별 커스텀 도구
- CLI: 대화형 모드, TUI

**원칙**:
- 기존 기능을 깨지 않고 추가
- Semantic Versioning으로 호환성 보장
- 각 릴리스는 독립적으로 사용 가능

---

## 안티패턴 (Anti-Patterns)

### ❌ 과도한 통합
```typescript
// 나쁜 예
class UnifiedSystem {
  sdk: CoreSDK;
  mcpServer: MCPServer;
  cli: CLI;
  // → 3개를 억지로 합치지 말 것
}
```

### ❌ 능동적 서버
```typescript
// 나쁜 예: MCP 서버가 AI를 호출
async function handleRequest(req) {
  const aiResponse = await callClaude(req); // ❌
  return aiResponse;
}
```

### ❌ 로직 중복
```typescript
// 나쁜 예
// mcp-server.ts
function runBuild() { /* 빌드 로직 */ }

// cli/index.ts
function runBuild() { /* 똑같은 빌드 로직 */ }

// 좋은 예: Taskfile.yml에 정의하고 둘 다 호출
```

---

## 의사결정 가이드

새로운 기능을 추가할 때:

### 1단계: 어느 패키지?
- 개발자가 import할까? → SDK
- AI가 도구로 쓸까? → MCP
- 터미널에서 실행할까? → CLI

### 2단계: 표준이 있나?
- MCP 프로토콜에 해당 기능이 있나? → 따른다
- Taskfile에 정의 가능한가? → 정의한다
- 없으면? → ADR 작성 후 결정

### 3단계: 증거가 있나?
- 이 기능이 필요하다는 증거는?
- 작동한다는 증거는?
- 없으면? → 먼저 증거 수집

---

## 결론

이 프로젝트의 철학은 **"단순하고, 독립적이며, 증거 기반"**입니다.

- 각 패키지는 자신의 역할만 충실히 수행
- 표준을 따르고, 커스텀 프로토콜 지양
- 모든 작업은 증거를 남김

이 철학을 위반하는 변경은 **Constitution 수정 절차**를 거쳐야 합니다.

---

**다음 읽기**: [`architecture.md`](./architecture.md) - 시스템 아키텍처
