# coreeeeaaaa - Universal Development Automation Framework

## 개요

**coreeeeaaaa**는 AI 에이전트를 위한 범용 자동화 프레임워크입니다. MCP(Model Context Protocol) 표준을 준수하며, 로컬 개발 환경에서 자동화된 작업을 수행할 수 있는 4가지 핵심 도구를 제공합니다.

### 핵심 원칙

- **표준 준수**: `@modelcontextprotocol/sdk` 기반
- **수동적 아키텍처**: 서버는 AI를 호출하지 않고, 요청에만 응답
- **단일 진실 공급원**: 모든 자동화는 `Taskfile.yml`을 통해 관리
- **로컬 우선**: 외부 의존성 최소화

---

## 설치 및 설정

### 1. 의존성 설치

```bash
cd /Users/a/personaluse/gemini_dev/coreeeeaaaa
npm install
cd packages/core
npm install
npm run build
```

### 2. Claude Desktop 설정

Claude Desktop의 설정 파일에 다음 내용을 추가하세요:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "coreeeeaaaa": {
      "command": "node",
      "args": [
        "/Users/a/personaluse/gemini_dev/coreeeeaaaa/packages/core/dist/mcp-server.js"
      ]
    }
  }
}
```

### 3. Claude Desktop 재시작

설정을 적용하려면 Claude Desktop을 완전히 종료하고 다시 시작하세요.

---

## 사용 가능한 도구

### 1. `run_task`

**설명**: `Taskfile.yml`에 정의된 작업을 실행합니다.

**사용 예시**:
```
"run_task" 도구를 사용해서 "quality" 태스크를 실행해줘
```

**파라미터**:
- `task_name` (필수): 실행할 태스크 이름

**사용 가능한 태스크**:
- `install` - 의존성 설치
- `build` - 전체 프로젝트 빌드
- `lint` - 코드 린팅
- `test` - 테스트 실행
- `security` - 보안 스캔 (trivy, gitleaks)
- `quality` - 통합 품질 검사 (lint + test + security)
- `clean` - 빌드 산출물 정리

---

### 2. `manage_spec`

**설명**: `.coreeeeaaaa/specs/` 디렉토리의 SpecKit 호환 기능 명세를 관리합니다.

**사용 예시**:
```
"manage_spec" 도구로 "user-auth" 스펙을 생성해줘. 내용은 "# User Authentication\n\n사용자 인증 기능..."
```

**파라미터**:
- `action` (필수): `read` | `create` | `update` | `list`
- `feature_id` (조건부): 기능 ID (read/create/update에 필요)
- `content` (조건부): 마크다운 내용 (create/update에 필요)

**사용 예시**:
- 스펙 목록 조회: `action: "list"`
- 스펙 읽기: `action: "read", feature_id: "user-auth"`
- 스펙 생성: `action: "create", feature_id: "new-feature", content: "# New Feature\n..."`
- 스펙 업데이트: `action: "update", feature_id: "user-auth", content: "# Updated Content\n..."`

---

### 3. `consult_constitution`

**설명**: `.coreeeeaaaa/memory/constitution.md`를 조회하여 프로젝트의 원칙과 제약사항을 확인합니다.

**사용 예시**:
```
헌법에서 "보안" 관련 규정을 찾아줘
```

**파라미터**:
- `query` (필수): 검색할 키워드 또는 질문
- `return_full_content` (선택): `true`로 설정하면 전체 헌법 반환

**사용 시나리오**:
- 현재 작업이 프로젝트 원칙에 부합하는지 확인
- 기술적 제약사항 조회
- 금지된 패턴 확인

---

### 4. `audit_security`

**설명**: 로컬 보안 도구(trivy, gitleaks)를 실행하여 취약점과 비밀 정보 유출을 검사합니다.

**사용 예시**:
```
보안 감사를 실행해서 취약점이 있는지 확인해줘
```

**파라미터**: 없음

**결과 포함 사항**:
- **trivy**: 파일시스템 취약점 스캔 결과
- **gitleaks**: 비밀 정보(API 키, 토큰 등) 유출 검사 결과

**참고**: trivy와 gitleaks가 시스템에 설치되어 있어야 합니다.

```bash
# macOS 설치 예시
brew install trivy gitleaks
```

---

## 프로젝트 구조

```
coreeeeaaaa/
├── .coreeeeaaaa/               # 프레임워크 중추 데이터
│   ├── memory/
│   │   └── constitution.md     # 프로젝트 헌법
│   ├── specs/                  # SpecKit 기능 명세
│   └── knowledge/              # ADR, 트러블슈팅 로그
├── packages/
│   ├── core/                   # MCP 서버 구현
│   │   └── src/
│   │       ├── mcp-server.ts   # 서버 엔트리포인트
│   │       └── tools/          # 도구 모듈
│   ├── sdk/                    # SDK 라이브러리
│   └── cli/                    # CLI 도구
├── Taskfile.yml                # 자동화 작업 정의
└── claude_desktop_config.json  # Claude Desktop 설정 예시
```

---

## 워크플로우 예시

### 1. 새 기능 개발 시작

```
1. "manage_spec" 도구로 "new-feature" 스펙을 생성해줘
   내용: "# New Feature\n\n## 목표\n사용자가 X를 할 수 있게 한다"

2. "consult_constitution" 도구로 "표준 준수" 관련 규정을 확인해줘

3. (기능 구현 후)
   "run_task" 도구로 "quality" 태스크를 실행해서 품질 검사를 해줘

4. "audit_security" 도구로 보안 취약점을 검사해줘
```

### 2. 코드 품질 확인

```
"run_task" 도구로 "quality" 태스크를 실행해줘
```

이 명령은 다음을 순차적으로 실행합니다:
1. 빌드
2. 린트 검사
3. 테스트 실행
4. 보안 스캔

### 3. 프로젝트 원칙 확인

```
"consult_constitution" 도구로 "AI 호출" 관련 규정을 찾아줘
```

---

## 문제 해결

### MCP 서버가 시작되지 않을 때

1. **빌드 확인**:
   ```bash
   cd packages/core
   npm run build
   ```

2. **의존성 확인**:
   ```bash
   npm install
   ```

3. **수동 실행 테스트**:
   ```bash
   node packages/core/dist/mcp-server.js
   ```

   성공 시 다음 메시지가 표시됩니다:
   ```
   coreeeeaaaa MCP Server started
   Available tools: run_task, manage_spec, consult_constitution, audit_security
   ```

### 보안 도구가 없다는 메시지가 나올 때

```bash
# macOS
brew install trivy gitleaks

# Linux
# trivy
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
# gitleaks
brew install gitleaks  # 또는 GitHub releases에서 다운로드
```

### Task 명령이 없다는 메시지가 나올 때

```bash
# macOS
brew install go-task/tap/go-task

# Linux
sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin
```

---

## 확장 가이드

### 새 도구 추가하기

1. `packages/core/src/tools/` 에 새 파일 생성
2. 도구 로직 구현
3. `mcp-server.ts`의 `TOOLS` 배열에 도구 정의 추가
4. `CallToolRequestSchema` 핸들러에 케이스 추가
5. 빌드 및 테스트

### 새 Task 추가하기

`Taskfile.yml`에 새 작업 정의:

```yaml
tasks:
  my-task:
    desc: '작업 설명'
    cmds:
      - echo "실행할 명령"
      - npm run custom-script
```

---

## 라이센스

Apache-2.0

---

## 지원

문제가 발생하거나 질문이 있으시면:
1. `.coreeeeaaaa/knowledge/` 디렉토리의 문서 참조
2. GitHub Issues 등록
3. `consult_constitution` 도구로 프로젝트 원칙 확인

---

**버전**: 1.0.0
**최종 업데이트**: 2025-12-05
