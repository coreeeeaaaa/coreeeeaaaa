### 📋 **[지시서] `coreeeeaaaa` 리팩토링 및 표준화**

**목표:** `coreeeeaaaa`를 **AI(LLM)가 활용하는 순수 개발 자동화 MCP 서버/CLI 도구**로 재정의한다.

#### 1. 구조 정리 (Cleanup)
- `LLMAdapter`, `AIClient`, `InternalPlatform` 등 **AI 호출/통신 관련 코드는 즉시 전량 폐기**해.
- 프로젝트의 핵심은 `packages/` (기능 모듈)와 `cli/` (명령어 인터페이스)로 단순화해.
- 독자적인 프로토콜 코드는 다 지우고, **공식 MCP SDK (`@modelcontextprotocol/sdk`)**를 설치해서 다시 구현해.

#### 2. 기능 구현 (Core Features) - AI가 가져다 쓸 도구들
이 프로젝트가 제공해야 할 **MCP 도구(Tools)** 목록은 다음과 같아. 이를 표준 MCP 포맷으로 구현해.

*   **`task_runner`**: 루트의 `Taskfile.yml`에 정의된 작업(`lint`, `test`, `build` 등)을 실행하고 결과를 반환.
*   **`quality_gate`**: 로컬 품질 검사(Lint + Test + Security Scan)를 한 번에 수행하고 통과 여부를 반환.
*   **`spec_validator`**: (SpecKit 연동용) 프로젝트의 설계 문서(`spec.md`)와 현재 코드의 정합성을 검사.
*   **`git_ops`**: 로컬 Git 상태 확인, 변경점(diff) 추출, 브랜치 관리 기능.

#### 3. 로컬 인프라 통합 (Local Infrastructure)
이 도구가 로컬에서 완벽히 돌 수 있게 다음 파일들을 정비해.
*   **`Taskfile.yml`**: 
    *   `quality`: (Ruff/Biome fix -> Test -> Trivy Scan) 파이프라인 정의.
    *   `dev`: 로컬 개발 서버 실행.
*   **`.pre-commit-config.yaml`**: 
    *   기존 설정에 더해 `gitleaks`(비밀키 유출 방지)와 `check-yaml`(문법 검사) 훅 추가.

#### 4. 배포 및 실행 (Deployment)
- `package.json`의 `bin` 설정을 통해 `npx coreeeeaaaa` 또는 로컬 전역 설치(`npm link`)로 즉시 실행 가능하게 해.
- **MCP 설정 파일 예시(`claude_desktop_config.json`용)**를 `README.md`에 명시해.
    ```json
    {
      "mcpServers": {
        "coreeeeaaaa": {
          "command": "node",
          "args": ["path/to/coreeeeaaaa/dist/index.js"]
        }
      }
    }
    ```
  이렇게 설정하면 Claude나 Cursor가 너를 바로 인식할 수 있게.

**결론:** 
네가 할 일은 **"똑똑한 척하는 AI 비서"가 되는 게 아니라, "AI 비서가 꺼내 쓸 최고급 공구 세트"가 되는 거야.**
위 내용대로 싹 갈아엎고, **MCP 서버로서 정상 구동되는지 테스트한 결과**만 가져와.