# 버전 관리 (Versioning)

> Semantic Versioning 2.0.0 준수

---

## 버전 체계

### 형식: `MAJOR.MINOR.PATCH`

```
예: 1.2.3
    │ │ └─ PATCH: 버그 수정 (호환성 유지)
    │ └─── MINOR: 새 기능 (하위 호환)
    └───── MAJOR: 파괴적 변경 (호환성 깨짐)
```

---

## 각 패키지별 버전 관리

### @coreeeeaaaa/sdk

**현재 버전**: 0.1.0 (pre-release)

**MAJOR 버전 증가 (1.0.0) 조건**:
- CoreSDK 공개 API 변경
- Gate/Evidence 데이터 형식 변경
- Storage 백엔드 인터페이스 변경

**예시**:
```typescript
// 0.x → 1.0 (MAJOR)
// Before:
await sdk.runGate('quality', input);

// After:
await sdk.runGate({ id: 'quality', input });  // API 변경
```

---

### @coreeeeaaaa/core (MCP Server)

**현재 버전**: 1.0.0 (stable)

**MAJOR 버전 증가 (2.0.0) 조건**:
- MCP 도구 이름 변경
- 도구 파라미터 형식 변경
- 기존 도구 제거

**예시**:
```json
// 1.x → 2.0 (MAJOR)
// Before:
{ "name": "run_task", "arguments": { "task_name": "build" } }

// After:
{ "name": "execute_task", "arguments": { "name": "build" } }
```

---

### @coreeeeaaaa/cli

**현재 버전**: 0.1.0 (pre-release)

**MAJOR 버전 증가 (1.0.0) 조건**:
- 명령어 이름 변경
- 필수 옵션 추가/제거
- 출력 형식 변경 (breaking)

**예시**:
```bash
# 0.x → 1.0 (MAJOR)
# Before:
coreeeeaaaa log --text "hello"

# After:
coreeeeaaaa log --message "hello"  # 옵션 이름 변경
```

---

## 릴리스 프로세스

### 1. 버전 결정

```bash
# 현재 버전 확인
cat packages/sdk/package.json | grep version

# 변경 사항 분류
git log --oneline v0.1.0..HEAD
```

분류 기준:
- `fix:` → PATCH
- `feat:` → MINOR
- `BREAKING CHANGE:` → MAJOR

### 2. 버전 업데이트

```bash
cd packages/sdk
npm version patch  # 또는 minor, major
```

### 3. Changelog 작성

`CHANGELOG.md`:
```markdown
## [0.2.0] - 2025-12-06

### Added
- New storage backend: PostgreSQL
- Evidence validation

### Fixed
- Gate schema validation error

### Changed
- Improved error messages
```

### 4. Git Tag 생성

```bash
git tag -a sdk-v0.2.0 -m "Release SDK v0.2.0"
git push origin sdk-v0.2.0
```

### 5. NPM 배포

```bash
cd packages/sdk
npm run build
npm publish --access public
```

---

## 호환성 매트릭스

| SDK | MCP Core | CLI | Rust Engine |
|-----|----------|-----|-------------|
| 0.1.x | 1.0.x | 0.1.x | 0.1.x |
| 0.2.x | 1.0.x | 0.1.x | 0.1.x |
| 1.0.x | 2.0.x | 1.0.x | 0.2.x |

**원칙**: 패키지 간 독립적이므로, 버전이 서로 다를 수 있음

---

## Deprecation 정책

### 단계적 제거 (3 릴리스 주기)

**예시**: `runGate` → `validateGate`로 변경

**v0.2.0**:
```typescript
// 새 API 추가
async validateGate(id, input) { ... }

// 기존 API 유지, 경고 출력
async runGate(id, input) {
  console.warn('runGate is deprecated, use validateGate');
  return this.validateGate(id, input);
}
```

**v0.3.0**:
- 경고 계속

**v1.0.0**:
```typescript
// 기존 API 제거
// async runGate() { ... }  ← 삭제
```

---

## Pre-release 버전

### Alpha (불안정)
```
0.1.0-alpha.1
0.1.0-alpha.2
```

### Beta (기능 완료, 테스트 중)
```
0.1.0-beta.1
0.1.0-beta.2
```

### Release Candidate
```
0.1.0-rc.1
0.1.0-rc.2
```

---

## Git Commit 메시지 규칙

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**:
- `feat`: 새 기능 (MINOR)
- `fix`: 버그 수정 (PATCH)
- `docs`: 문서만 변경
- `style`: 코드 포맷 (동작 변경 없음)
- `refactor`: 리팩토링
- `test`: 테스트 추가
- `chore`: 빌드/도구 변경

**Scope**:
- `sdk`
- `mcp`
- `cli`
- `engine`
- `docs`

**예시**:
```
feat(sdk): add PostgreSQL storage backend

Implement new storage backend using pg library.
Supports connection pooling and prepared statements.

Closes #42
```

**Breaking Change**:
```
feat(mcp)!: rename run_task to execute_task

BREAKING CHANGE: The run_task tool has been renamed to
execute_task. Update your MCP client configurations.
```

---

## 버전 확인 방법

### Runtime에서 확인

```typescript
// SDK
import { version } from '@coreeeeaaaa/sdk';
console.log(version);  // "0.1.0"

// MCP Server
node packages/core/dist/mcp-server.js --version

// CLI
coreeeeaaaa --version
```

---

## Monorepo 버전 관리

### 독립 버전 (현재 방식)
- 각 패키지가 자체 버전 유지
- SDK는 1.0, MCP는 2.0일 수 있음

### 통합 버전 (미래 옵션)
- 모든 패키지가 동일 버전
- 예: Lerna, Changesets 사용

**현재 선택**: 독립 버전 (패키지 간 독립성 강조)

---

## 자주 묻는 질문

### Q: SDK를 0.2로 올리면 MCP도 올려야 하나?
**A**: 아니요. 각 패키지는 독립적.

### Q: MAJOR 버전 올리는 게 두려운데?
**A**: Pre-release (0.x) 단계에서는 MINOR로 breaking change 가능.
     예: 0.1 → 0.2 (breaking), 0.2 → 0.3 (breaking)

### Q: 버전 충돌을 어떻게 피하나?
**A**: Semantic Versioning 엄격히 준수. 의심스러우면 MAJOR 올림.

---

## 체크리스트

릴리스 전:
- [ ] 모든 테스트 통과
- [ ] CHANGELOG 업데이트
- [ ] 버전 번호 bump
- [ ] Git tag 생성
- [ ] 빌드 성공
- [ ] NPM publish (dry-run)
- [ ] 문서 업데이트

---

**버전 관리는 신뢰의 표현입니다. 사용자를 놀라게 하지 마세요.**
