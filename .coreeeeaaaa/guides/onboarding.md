# 온보딩 가이드 (Onboarding Guide)

> **강제 읽기**: 이 프로젝트에 참여하기 전 반드시 완료해야 하는 절차

---

## ✅ Level 0: 필수 문서 읽기 (30분)

**목표**: 프로젝트의 철학과 구조를 이해한다.

### 읽기 순서
1. [ ] [`MASTER.md`](../.MASTER.md) - 프로젝트 개요
2. [ ] [`memory/philosophy.md`](../memory/philosophy.md) - 설계 철학
3. [ ] [`memory/constitution.md`](../memory/constitution.md) - 불변 원칙

### 체크포인트 질문
- 이 프로젝트는 몇 개의 패키지로 구성되어 있나? (답: 3개)
- SDK와 MCP Server를 통합해야 하나? (답: 아니요, 독립적)
- 서버가 AI를 호출할 수 있나? (답: 아니요, 수동적 아키텍처)

**통과하지 못하면**: 다시 읽기

---

## 🛠️ Level 1: 개발 환경 설정 (20분)

### 1. 필수 도구 설치

```bash
# Node.js (>= 18.0.0)
node --version  # 18 이상 확인

# Task Runner
brew install go-task/tap/go-task  # macOS
# 또는
sh -c "$(curl -sSL https://taskfile.dev/install.sh)" -- -d -b ~/.local/bin  # Linux

# Git
git --version
```

### 2. 선택적 도구 (보안 스캔용)

```bash
# Trivy
brew install trivy  # macOS

# Gitleaks
brew install gitleaks  # macOS
```

### 3. Rust 도구체인 (engine-rs 작업 시)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo --version
```

---

## 📦 Level 2: 프로젝트 설정 (10분)

### 1. 저장소 클론

```bash
git clone https://github.com/your-org/coreeeeaaaa.git
cd coreeeeaaaa
```

### 2. 의존성 설치

```bash
task install
# 또는
npm install
cd packages/sdk && npm install
cd ../core && npm install
cd ../cli && npm install
```

### 3. 빌드

```bash
task build
# 또는
npm run build
```

### 4. 검증

```bash
# SDK 테스트
cd packages/sdk && npm test

# MCP 서버 시작 테스트
node packages/core/dist/mcp-server.js
# → "coreeeeaaaa MCP Server started" 메시지 확인 후 Ctrl+C

# CLI 테스트
./packages/cli/dist/index.js --help
```

---

## 📖 Level 3: 아키텍처 이해 (30분)

### 읽기
- [ ] [`memory/architecture.md`](../memory/architecture.md) - 시스템 아키텍처

### 실습: 코드 베이스 탐색

```bash
# SDK 주요 파일
cat packages/sdk/src/index.ts       # CoreSDK 클래스
cat packages/sdk/src/gate.ts        # Gate 검증
cat packages/sdk/src/evidence.ts    # Evidence 수집

# MCP Server 주요 파일
cat packages/core/src/mcp-server.ts           # 서버 엔트리포인트
cat packages/core/src/tools/taskRunner.ts     # run_task 도구

# CLI 주요 파일
cat packages/cli/src/index.ts       # CLI 엔트리포인트
```

### 체크포인트 질문
- SDK의 `runGate` 메서드는 어디에 결과를 저장하나? (답: artifacts/gates/)
- MCP Server는 몇 개의 도구를 제공하나? (답: 4개)
- CLI는 SDK를 의존하나? (답: 예)

---

## 🎯 Level 4: 첫 번째 기여 (30분)

### 시나리오: 새로운 Task 추가하기

**목표**: `Taskfile.yml`에 "hello" 작업을 추가하고 MCP로 실행

#### 1. Task 정의

`Taskfile.yml` 편집:
```yaml
tasks:
  hello:
    desc: 'Print hello message'
    cmds:
      - echo "Hello from coreeeeaaaa!"
```

#### 2. 수동 실행

```bash
task hello
# → "Hello from coreeeeaaaa!" 출력 확인
```

#### 3. MCP로 실행 (선택적)

Claude Desktop 설정 후:
```
사용자: "run_task 도구로 hello 실행해줘"
AI: [run_task 호출]
```

#### 4. Commit

```bash
git checkout -b feat/add-hello-task
git add Taskfile.yml
git commit -m "feat: add hello task for onboarding"
git push origin feat/add-hello-task
```

---

## 📚 Level 5: 고급 주제 (선택적)

### ADR 읽기

Architecture Decision Records:
```bash
ls .coreeeeaaaa/knowledge/adr/
# 각 ADR 파일 읽기
```

### Rust 엔진 빌드

```bash
cd packages/engine-rs
cargo build --release
./target/release/core-uem-engine --help
```

### Storage 백엔드 설정

```bash
export COREEEEAAAA_STORAGE_PROVIDER=local-fs
# 또는 firebase, gcs 등
```

---

## 🤝 Level 6: 기여 준비 완료

### 다음 단계
- [ ] [`guides/contributor.md`](./contributor.md) 읽기
- [ ] GitHub Issues에서 "good first issue" 찾기
- [ ] Discord/Slack 커뮤니티 가입

### 기여 타입
| 타입 | 설명 | 난이도 |
|------|------|--------|
| Documentation | 문서 개선, 오타 수정 | ⭐ |
| Testing | 테스트 케이스 추가 | ⭐⭐ |
| Bug Fix | 버그 수정 | ⭐⭐ |
| Feature | 새 기능 추가 | ⭐⭐⭐ |
| Architecture | 구조 개선 | ⭐⭐⭐⭐ |

---

## ❓ 자주 묻는 질문

### Q: SDK, MCP, CLI 중 어디부터 시작해야 하나?
**A**: 본인의 역할에 따라 다름
- 라이브러리 개발자 → SDK
- AI 도구 개발 → MCP
- CLI 도구 개발 → CLI

### Q: Rust를 모르면 기여할 수 없나?
**A**: 아니요. SDK/MCP/CLI는 모두 TypeScript. Rust는 선택적.

### Q: 문서만 개선하고 싶다
**A**: 환영합니다! `.coreeeeaaaa/` 디렉토리의 Markdown 파일 편집 후 PR.

### Q: 새로운 MCP 도구를 추가하려면?
**A**:
1. `packages/core/src/tools/myTool.ts` 생성
2. `mcp-server.ts`의 `TOOLS` 배열에 추가
3. `CallToolRequestSchema` 핸들러에 케이스 추가
4. 빌드 및 테스트

---

## ✅ 온보딩 완료 체크리스트

- [ ] Node.js >= 18 설치
- [ ] Task 명령 사용 가능
- [ ] 전체 빌드 성공
- [ ] 필수 문서 3개 읽음 (MASTER, philosophy, constitution)
- [ ] 아키텍처 문서 읽음
- [ ] 코드베이스 탐색 완료
- [ ] 첫 번째 Task 추가 성공
- [ ] 체크포인트 질문 모두 답변 가능

**모든 항목 체크 완료 → 기여 준비 완료!**

---

**다음 읽기**: [`contributor.md`](./contributor.md) - 기여 규칙
