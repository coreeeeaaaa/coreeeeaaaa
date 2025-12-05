# @coreeeeaaaa/cli 명세서

> 터미널에서 직접 실행하는 명령줄 도구

---

## 설치

```bash
npm install -g @coreeeeaaaa/cli
```

또는 로컬에서:

```bash
cd packages/cli
npm run build
./dist/index.js --help
```

---

## 명령어

### init

**설명**: CoreSDK 환경을 초기화합니다.

**사용법**:
```bash
coreeeeaaaa init
```

**동작**:
- `artifacts/` 디렉토리 구조 생성
- gates, evidence, pointers, logs, budget, lineage 하위 디렉토리 생성

**출력**:
```
Initializing coreeeeaaaa environment...
Setup complete!
```

---

### log

**설명**: UEM Ledger에 메시지를 기록합니다.

**사용법**:
```bash
coreeeeaaaa log --text "작업 완료"
```

**옵션**:
- `-t, --text <text>` (필수): 기록할 텍스트

**동작**:
- SDK의 `logLineage()` 메서드 호출
- Rust 엔진으로 전송 (선택적)
- artifacts/lineage/CLI_Manual_Log.jsonl에 기록

**출력**:
```
Logging to Ledger...
Log committed via Rust Engine!
```

---

### workflow

**설명**: 고급 워크플로우를 실행합니다.

**사용법**:
```bash
coreeeeaaaa workflow --config workflow.json
```

**옵션**:
- `-c, --config <path>`: 워크플로우 설정 파일 경로
- `-t, --task-file <path>`: 태스크 정의 파일
- `--provider <provider>`: LLM 제공자 (ollama, claude-cli 등)
- `--model <model>`: 사용할 모델
- `--max-iterations <n>`: 최대 반복 횟수

**설정 파일 예시** (`workflow.json`):
```json
{
  "tasks": [
    {
      "name": "analyze",
      "prompt": "Analyze code quality",
      "agent": "analyzer"
    },
    {
      "name": "improve",
      "prompt": "Suggest improvements",
      "agent": "improver"
    }
  ],
  "provider": "ollama",
  "model": "llama3"
}
```

**동작**:
- 여러 에이전트가 순차적으로 작업 수행
- 각 단계 결과를 다음 단계로 전달

---

### autonomous

**설명**: 자율 에이전트 루프를 실행합니다.

**사용법**:
```bash
coreeeeaaaa autonomous --llm ollama --model llama3
```

**옵션**:
- `--llm <provider>`: LLM 제공자
- `--model <model>`: 사용할 모델

**동작**:
- 에이전트가 자율적으로 작업 결정
- 목표 달성까지 반복 실행
- 중단 시 Ctrl+C

**출력 예시**:
```
Autonomous agent started
[Agent] Analyzing current state...
[Agent] Planning next action...
[Agent] Executing task...
^C Autonomous loop stopped
```

---

## 전역 옵션

### --version

```bash
coreeeeaaaa --version
# → 0.1.0
```

### --help

```bash
coreeeeaaaa --help
# 또는
coreeeeaaaa <command> --help
```

---

## 예제

### 완전한 워크플로우

```bash
# 1. 환경 초기화
coreeeeaaaa init

# 2. 로그 기록
coreeeeaaaa log --text "프로젝트 시작"

# 3. 워크플로우 실행
coreeeeaaaa workflow --config my-workflow.json --provider ollama

# 4. 자율 모드
coreeeeaaaa autonomous --llm claude-cli
```

---

## 내부 구조

### CLI ↔ SDK 관계

```typescript
// cli/src/index.ts
import { CoreSDK } from '@coreeeeaaaa/sdk';

const sdk = new CoreSDK();

program
  .command('init')
  .action(async () => {
    await sdk.init();  // SDK 메서드 호출
  });
```

CLI는 SDK를 **사용**하는 thin wrapper입니다.

---

## 환경 변수

```bash
# Storage 백엔드
export COREEEEAAAA_STORAGE_PROVIDER=local-fs

# 로그 레벨
export COREEEEAAAA_LOG_LEVEL=debug

# Rust 엔진 경로
export COREEEEAAAA_ENGINE_BIN=/path/to/engine
```

---

## 문제 해결

### Q: "command not found: coreeeeaaaa"
**A**: 전역 설치 확인:
```bash
npm install -g @coreeeeaaaa/cli
# 또는
npm link  # 개발 모드
```

### Q: "Rust engine call failed"
**A**: 선택적 기능. 경고 무시 가능.

### Q: "artifacts/ 디렉토리가 생성되지 않음"
**A**: `coreeeeaaaa init` 먼저 실행

---

## 개발 가이드

### 새 명령 추가

1. `commands/myCommand.ts` 생성:
```typescript
export async function myCommand(options: any) {
  console.log('Executing my command...');
  // 구현
}
```

2. `index.ts`에 등록:
```typescript
program
  .command('my-command')
  .description('My custom command')
  .option('--param <value>', 'Parameter')
  .action(myCommand);
```

3. 빌드:
```bash
npm run build
```

4. 테스트:
```bash
./dist/index.js my-command --param test
```

---

## CLI vs MCP vs SDK

| 도구 | 사용자 | 사용 방식 |
|------|--------|-----------|
| **CLI** | 개발자 (터미널) | `coreeeeaaaa init` |
| **MCP** | AI (Claude 등) | MCP 프로토콜 |
| **SDK** | 개발자 (코드) | `import { CoreSDK }` |

**중요**: 각자 독립적으로 동작하며, 통합되지 않습니다.

---

**버전**: 0.1.0
**의존성**: @coreeeeaaaa/sdk
**라이센스**: Apache-2.0
