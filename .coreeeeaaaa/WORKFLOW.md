# coreeeeaaaa 표준 워크플로우

## 🔄 모든 프로젝트의 강제 진입점

### 프로젝트 폴더 구조 감지
```bash
# 모든 명령어 실행 시 자동으로 먼저 실행
coreeeeeaaaa --detect-project

# 결과:
✅ 프로젝트 타입: Lean 4
✅ 구조: monorepo (5 packages)
✅ 감지 시간: 0.8초
```

---

## 📋 강제 워크플로우 단계

### 1단계: 프로젝트 헌법 로딩 (1초)
```typescript
// 모든 에이전트 시작 시 자동 실행
function loadConstitution() {
  const constitution = fs.readFileSync('.coreeeeaaaa/CONSTITUTION.md');
  const guidelines = fs.readFileSync('.coreeeeaaaa/AGENT_GUIDELINES.md');

  // 핵심 원칙 추출
  return {
    timeLimit: 3000, // 3초
    loveFirst: true,
    modelEquality: true
  };
}
```

### 2단계: 프로젝트 타입 감지 (1초)
```bash
# 파일 기반 자동 감지
if [[ -f "lakefile.lean" ]]; then
    PROJECT_TYPE="lean"
elif [[ -f "Cargo.toml" ]]; then
    PROJECT_TYPE="rust"
elif [[ -f "package.json" ]]; then
    PROJECT_TYPE="typescript"
else
    PROJECT_TYPE="generic"
fi
```

### 3단계: 모델 자동 선택 (1초)
```typescript
// AI/models.yaml 기반 자동 선택
function selectModel(task, projectType) {
  const complexity = estimateComplexity(task, projectType);
  const contextSize = estimateContextSize();

  if (complexity === "high" || contextSize > 3000) {
    return "glm_cloud";
  } else {
    return "ollama_qwen2_1_5b";
  }
}
```

### 4단계: 컨텍스트 빌드 (2초)
```bash
# 지능적 컨텍스트 조합
coreeeeeaaaa --build-context \
  --workflow=$WORKFLOW \
  --files=$TARGET_FILES \
  --max-tokens=$MAX_CONTEXT
```

### 5단계: 작업 실행 (즉시)
```bash
# 헌법 준수 검증 후 실행
coreeeeeaaaa --enforce-constitution \
  --execute $WORKFLOW \
  --with-love
```

---

## 🚀 표준 명령어 워크플로우

### `coreeeeeaaaa init`
```bash
# 1. 헌법 로딩 (1s)
# 2. 프로젝트 감지 (1s)
# 3. 최적 템플릿 선택 (1s)
# 4. 구조 생성 (0s)
총: 3초 완료
```

### `coreeeeeaaaa build`
```bash
# 1. 헌법 로딩 (1s)
# 2. 프로젝트 타입 감지 (1s)
# 3. 적절한 빌드 명령어 선택 (0s)
# 4. 병렬 빌드 실행 (즉시)
총: 2초 시작
```

### `coreeeeeaaaa session`
```bash
# 1. 헌법 로딩 (1s)
# 2. RAG 쿼리 (1s)
# 3. 컨텍스트 조립 (1s)
# 4. 프롬프트 생성 (1s)
총: 4초 준비
```

---

## 🔍 자동 진입점 설정

### 모든 프로젝트의 package.json
```json
{
  "scripts": {
    "prestart": "coreeeeeaaaa --check-compliance",
    "start": "coreeeeeaaaa init",
    "prebuild": "coreeeeeaaaa --load-constitution",
    "build": "coreeeeeaaaa build"
  }
}
```

### 모든 프로젝트의 Makefile
```makefile
# 모든 명령어 실행 전 헌법 준수 검증
.PHONY: all build test clean
all: check-compliance build test

check-compliance:
	@echo "⚖️ 헌법 준수 검증..."
	@coreeeeeaaaa --check-constitution
	@echo "✅ 헌법 준수 완료"

build: check-compliance
	@coreeeeeaaaa build

test: check-compliance
	@coreeeeeaaaa test
```

---

## 📊 워크플로우 성과 측정

### 자동 보고 카드
```bash
# 모든 작업 완료 시 자동 생성
coreeeeeaaaa --report-workflow

# 결과:
📋 작업: refactor
⏱️ 시작 시간: 0.8초 (헌법 기준: 3초 통과)
❤️ 사랑 지수: 95% (긍정적 응답)
🤖 모델: ollama_qwen2_1_5b (자동 선택)
📊 성공률: 98.3%
```

### 월간 워크플로우 최적화
```bash
coreeeeeaaaa --optimize-workflow

# 자동으로:
# - 병목 지점 발견
# - 헌법 준수율 개선 제안
# - 성공 패턴 학습
```

---

## 🎯 워크플로우 커스터마이징

### 프로젝트별 워크플로우 정의
```yaml
# .coreeeeaaaa/workflow.yaml
project:
  type: "lean"
  constitution_compliance: "strict"

workflows:
  build:
    pre_check: "lake env check"
    command: "lake build"
    post_validate: "lake health"

  session:
    max_context: 4000
    rag_sources: ["specs", "proofs", "examples"]
    model_preference: "glm_cloud"
```

**이 워크플로우는 모든 coreeeeaaaa 프로젝트에 강제로 적용된다.**

**"일관된 품질, 일관된 사랑, 일관된 속도"**