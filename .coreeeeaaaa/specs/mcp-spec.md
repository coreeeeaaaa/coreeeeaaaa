# @coreeeeaaaa/core (MCP Server) 명세서

> AI 에이전트가 로컬 개발 자동화에 사용하는 MCP 서버

---

## 설치 (AI용)

### Claude Desktop 설정

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "coreeeeaaaa": {
      "command": "node",
      "args": [
        "/absolute/path/to/coreeeeaaaa/packages/core/dist/mcp-server.js"
      ]
    }
  }
}
```

### 설정 후
1. Claude Desktop 완전 종료
2. 재시작
3. 새 대화 시작

---

## 사용 가능한 도구

### 1. run_task

**설명**: Taskfile.yml에 정의된 작업을 실행합니다.

**파라미터**:
```json
{
  "task_name": "string"  // 필수
}
```

**반환값**:
```json
{
  "success": true,
  "output": "...",
  "exitCode": 0
}
```

**사용 예시**:
```
사용자: "quality 태스크를 실행해서 코드 품질 검사해줘"
AI: [run_task 호출]
{
  "task_name": "quality"
}
```

**사용 가능한 태스크**:
- `install` - 의존성 설치
- `build` - 프로젝트 빌드
- `lint` - 린트 검사
- `test` - 테스트 실행
- `security` - 보안 스캔
- `quality` - 통합 품질 검사
- `clean` - 빌드 산출물 정리

---

### 2. manage_spec

**설명**: .coreeeeaaaa/specs/ 디렉토리의 SpecKit 명세를 관리합니다.

**파라미터**:
```json
{
  "action": "read" | "create" | "update" | "list",  // 필수
  "feature_id": "string",  // read/create/update에 필요
  "content": "string"      // create/update에 필요
}
```

**반환값**:
```json
{
  "success": true,
  "data": {
    "featureId": "user-auth",
    "content": "# User Authentication\n...",
    "path": ".coreeeeaaaa/specs/user-auth.md"
  }
}
```

**사용 예시**:

**Spec 목록 조회**:
```
사용자: "현재 정의된 스펙 목록을 보여줘"
AI: [manage_spec 호출]
{
  "action": "list"
}
```

**Spec 생성**:
```
사용자: "user-auth 기능에 대한 스펙을 만들어줘. 내용은 '# 사용자 인증\n\nOAuth 2.0 기반...'"
AI: [manage_spec 호출]
{
  "action": "create",
  "feature_id": "user-auth",
  "content": "# 사용자 인증\n\nOAuth 2.0 기반..."
}
```

**Spec 읽기**:
```
사용자: "user-auth 스펙을 읽어줘"
AI: [manage_spec 호출]
{
  "action": "read",
  "feature_id": "user-auth"
}
```

---

### 3. consult_constitution

**설명**: 프로젝트 헌법(.coreeeeaaaa/memory/constitution.md)을 조회합니다.

**파라미터**:
```json
{
  "query": "string",              // 필수
  "return_full_content": false    // 선택적
}
```

**반환값**:
```json
{
  "success": true,
  "data": {
    "relevantSections": [
      "## 표준 준수\n- MCP SDK 표준: ..."
    ]
  }
}
```

**사용 예시**:
```
사용자: "이 프로젝트에서 AI 호출이 허용되는지 헌법을 확인해줘"
AI: [consult_constitution 호출]
{
  "query": "AI 호출"
}
```

```
사용자: "헌법 전체 내용을 보여줘"
AI: [consult_constitution 호출]
{
  "query": "전체",
  "return_full_content": true
}
```

---

### 4. audit_security

**설명**: trivy와 gitleaks를 실행하여 보안 취약점을 검사합니다.

**파라미터**: 없음

**반환값**:
```json
{
  "success": true,
  "data": {
    "trivy": {
      "available": true,
      "vulnerabilities": 3,
      "output": "..."
    },
    "gitleaks": {
      "available": true,
      "secretsFound": 0,
      "output": "..."
    }
  }
}
```

**사용 예시**:
```
사용자: "보안 감사를 실행해서 취약점이 있는지 확인해줘"
AI: [audit_security 호출]
```

**도구가 없는 경우**:
```json
{
  "success": true,
  "data": {
    "trivy": {
      "available": false,
      "output": "Trivy not found in PATH"
    },
    "gitleaks": {
      "available": false,
      "output": "Gitleaks not found in PATH"
    }
  }
}
```

---

## 워크플로우 예시

### 시나리오 1: 새 기능 개발

```
사용자: "새 user-auth 기능을 개발하려고 해. 스펙을 만들고 헌법을 확인한 다음 품질 검사를 해줘"

AI 응답:

1. [manage_spec 호출] - 스펙 생성
   "user-auth 스펙을 생성했습니다."

2. [consult_constitution 호출] - 헌법 확인
   "헌법에 따르면, 표준 준수와 타입 안전성이 필수입니다."

3. [run_task 호출] - quality 태스크
   "품질 검사를 실행한 결과, 린트 에러 2개가 발견되었습니다."
```

### 시나리오 2: 보안 감사

```
사용자: "이 프로젝트의 보안 상태를 확인해줘"

AI 응답:

1. [audit_security 호출]
   "trivy: 취약점 5개 발견 (HIGH 2개, MEDIUM 3개)
   gitleaks: 비밀 정보 유출 없음"

2. [run_task 호출] - security 태스크
   "상세 보안 스캔을 실행했습니다."
```

---

## 에러 처리

### 도구가 없는 경우

**태스크 실행 실패**:
```json
{
  "success": false,
  "error": "Task 'invalid-task' not found",
  "exitCode": 1
}
```

**보안 도구 없음**:
```json
{
  "success": true,  // 치명적 아님
  "data": {
    "trivy": { "available": false },
    "gitleaks": { "available": false }
  }
}
```

---

## 프로토콜 세부사항

### Transport

- **방식**: stdio (JSON-RPC 2.0)
- **SDK**: `@modelcontextprotocol/sdk` v1.24.3+

### Request 형식

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "run_task",
    "arguments": {
      "task_name": "build"
    }
  }
}
```

### Response 형식

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\": true, ...}"
      }
    ]
  }
}
```

---

## 로깅

서버 로그는 **stderr**로 출력됩니다 (stdout은 MCP 프로토콜용):

```
coreeeeaaaa MCP Server started
Available tools: run_task, manage_spec, consult_constitution, audit_security
```

---

## 문제 해결

### Q: "MCP 서버가 Claude Desktop에 나타나지 않음"
**A**:
1. 설정 파일 경로 확인
2. JSON 문법 오류 확인 (`jq . config.json`)
3. Claude Desktop 완전 재시작

### Q: "run_task가 실행되지 않음"
**A**:
1. Taskfile.yml 존재 확인
2. `task` 명령 설치 확인 (`task --version`)

### Q: "audit_security가 항상 'not found' 반환"
**A**:
- trivy/gitleaks 설치:
  ```bash
  brew install trivy gitleaks  # macOS
  ```

---

## 확장 가이드

### 새 도구 추가하기

1. `packages/core/src/tools/myTool.ts` 생성:
```typescript
export async function myTool(param: string): Promise<any> {
  // 구현
}
```

2. `mcp-server.ts`에 등록:
```typescript
const TOOLS: Tool[] = [
  // ...기존 도구들
  {
    name: 'my_tool',
    description: '...',
    inputSchema: { ... }
  }
];
```

3. 핸들러 추가:
```typescript
case 'my_tool':
  const result = await myTool(args.param);
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
```

4. 빌드 및 테스트:
```bash
npm run build
node dist/mcp-server.js
```

---

**버전**: 1.0.0
**프로토콜**: MCP (Model Context Protocol)
**라이센스**: Apache-2.0
