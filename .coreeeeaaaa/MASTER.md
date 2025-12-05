# coreeeeaaaa MASTER 문서

> **⚠️ 필독**: 이 프로젝트에 참여하는 모든 사람(AI 포함)은 반드시 이 문서를 읽어야 합니다.

---

## 🎯 이 프로젝트는 무엇인가?

**coreeeeaaaa**는 **3개의 독립된 제품**으로 구성된 개발 자동화 생태계입니다:

| 패키지 | 사용자 | 용도 | 설치 방법 |
|--------|--------|------|-----------|
| **@coreeeeaaaa/sdk** | 개발자 | 프로젝트에 import해서 사용하는 라이브러리 | `npm install @coreeeeaaaa/sdk` |
| **@coreeeeaaaa/core** | AI (Claude, GPT 등) | MCP 프로토콜로 로컬 개발 자동화 | Claude Desktop 설정 |
| **@coreeeeaaaa/cli** | 개발자 | 터미널에서 직접 실행하는 도구 | `npm install -g @coreeeeaaaa/cli` |

### 왜 3개로 나뉘었나?

**각자 독립적인 사용 시나리오가 있기 때문입니다.**

- **SDK**: 다른 프로젝트에 embed
  ```typescript
  import { CoreSDK } from '@coreeeeaaaa/sdk';
  const sdk = new CoreSDK();
  await sdk.runGate('quality', input);
  ```

- **MCP Server**: AI가 도구로 사용
  ```
  사용자: "run_task로 quality 검사 실행해줘"
  AI: [run_task 도구 호출] → 결과 반환
  ```

- **CLI**: 사람이 터미널에서 사용
  ```bash
  coreeeeaaaa init
  coreeeeaaaa log --text "작업 완료"
  ```

**이 3개를 통합하지 않습니다. 통합하면 안 됩니다.**

---

## 📖 필수 읽기 순서 (강제 온보딩)

### Level 0: 프로젝트 이해하기

1. **이 파일 (MASTER.md)** ← 지금 여기
2. [`memory/philosophy.md`](./memory/philosophy.md) - 설계 철학
3. [`memory/constitution.md`](./memory/constitution.md) - 불변 원칙
4. [`knowledge/SPECKIT.md`](./knowledge/SPECKIT.md) - 기능 명세 작성 표준

### Level 1: 사용자로서 시작하기

- **SDK 사용자**: [`specs/sdk-spec.md`](./specs/sdk-spec.md)
- **MCP 사용자 (AI)**: [`specs/mcp-spec.md`](./specs/mcp-spec.md)
- **CLI 사용자**: [`specs/cli-spec.md`](./specs/cli-spec.md)

### Level 2: 기여자로 참여하기

1. [`guides/onboarding.md`](./guides/onboarding.md) - 개발 환경 설정
2. [`guides/contributor.md`](./guides/contributor.md) - 기여 규칙
3. [`memory/architecture.md`](./memory/architecture.md) - 시스템 아키텍처

### Level 3: 의사결정 참여하기

- [`knowledge/adr/`](./knowledge/adr/) - 아키텍처 결정 기록
- [`guides/versioning.md`](./guides/versioning.md) - 버전 관리

---

## 🏗️ 프로젝트 구조

```
coreeeeaaaa/
├── .coreeeeaaaa/           # 📚 문서 중추 (이 디렉토리)
│   ├── MASTER.md           # ← 시작점 (이 파일)
│   ├── memory/             # 설계 철학, 헌법, 아키텍처
│   ├── specs/              # 각 패키지 명세
│   ├── guides/             # 온보딩, 기여, 버전 관리
│   └── knowledge/          # ADR, 트러블슈팅
│
├── packages/
│   ├── sdk/                # @coreeeeaaaa/sdk (라이브러리)
│   ├── core/               # @coreeeeaaaa/core (MCP 서버)
│   ├── cli/                # @coreeeeaaaa/cli (CLI)
│   └── engine-rs/          # Rust 엔진 (SDK 내부 사용)
│
├── Taskfile.yml            # 자동화 작업 정의
├── package.json            # Monorepo 설정
└── USER_GUIDE.md           # 최종 사용자 가이드
```

---

## 🚦 빠른 시작 (역할별)

### 나는 개발자이고, SDK를 사용하고 싶다
→ [`specs/sdk-spec.md`](./specs/sdk-spec.md) 읽고 시작

### 나는 AI이고, MCP 서버를 설치해야 한다
→ [`specs/mcp-spec.md`](./specs/mcp-spec.md) 읽고 설정

### 나는 CLI를 써보고 싶다
→ [`specs/cli-spec.md`](./specs/cli-spec.md) 읽고 설치

### 나는 이 프로젝트에 기여하고 싶다
→ [`guides/onboarding.md`](./guides/onboarding.md)부터 시작

### 나는 설계를 이해하고 싶다
→ [`memory/philosophy.md`](./memory/philosophy.md) + [`memory/architecture.md`](./memory/architecture.md)

---

## 🛡️ 불변 규칙

이 프로젝트에는 **절대 변경할 수 없는 원칙**이 있습니다:

1. **3개 패키지는 독립적이다** - SDK, MCP, CLI를 통합하지 않는다
2. **표준을 준수한다** - MCP는 `@modelcontextprotocol/sdk` 사용 필수
3. **수동적 아키텍처** - 서버는 AI를 호출하지 않는다
4. **증거 기반 개발** - 모든 주장은 증거(로그, 테스트)로 뒷받침
5. **문서 우선** - 코드 작성 전 명세 작성

자세한 내용: [`memory/constitution.md`](./memory/constitution.md)

---

## 📊 현재 상태

| 항목 | 상태 | 버전 |
|------|------|------|
| @coreeeeaaaa/sdk | ✅ 안정 | 0.1.0 |
| @coreeeeaaaa/core | ✅ 안정 | 1.0.0 |
| @coreeeeaaaa/cli | ✅ 안정 | 0.1.0 |
| 문서 시스템 | ✅ 완료 | 1.0.0 |
| Rust 엔진 | 🟡 실험적 | 0.1.0 |

---

## 🆘 도움말

- **질문**: GitHub Discussions
- **버그**: GitHub Issues
- **긴급**: `consult_constitution` MCP 도구 사용 (AI만 해당)

---

## 📜 라이센스

Apache-2.0

---

**최종 업데이트**: 2025-12-05
**작성자**: coreeeeaaaa 프로젝트 팀
**버전**: 1.0.0

---

## ⚠️ 다시 한번 강조

이 문서를 읽지 않고 코드를 작성하거나 수정하면:
- 아키텍처를 오해할 수 있음
- 불필요한 통합 작업을 시도할 수 있음
- 프로젝트 원칙을 위반할 수 있음

**반드시 [`memory/philosophy.md`](./memory/philosophy.md)를 읽어야 합니다.**
