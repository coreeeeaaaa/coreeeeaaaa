# Project Constitution - coreeeeaaaa

## 불변의 원칙 (Immutable Principles)

### 1. 표준 준수 (Standard Compliance)
- **MCP SDK 표준**: 모든 MCP 서버 구현은 `@modelcontextprotocol/sdk`를 사용해야 함
- **타입 안전성**: TypeScript strict mode 필수, `any` 타입 사용 금지
- **의존성 투명성**: 모든 외부 의존성은 package.json에 명시

### 2. 수동적 아키텍처 (Passive Architecture)
- **AI 호출 금지**: 서버는 LLM을 직접 호출하지 않음
- **요청-응답 패턴**: 오직 클라이언트(AI)의 요청에만 반응
- **상태 비저장**: 서버는 세션 상태를 유지하지 않음

### 3. 단일 진실 공급원 (Single Source of Truth)
- **Taskfile.yml**: 모든 로컬 자동화 명령의 SSOT
- **MCP Tools**: Taskfile 작업을 호출하는 얇은 래퍼 역할만 수행
- **중복 금지**: 동일한 로직을 여러 곳에 구현하지 않음

### 4. 보안 우선 (Security First)
- **비밀 정보 격리**: .env, credentials.json 등은 절대 커밋 금지
- **최소 권한 원칙**: 필요한 최소한의 권한만 요청
- **감사 추적**: 모든 중요 작업은 로그 기록

### 5. 증거 기반 개발 (Evidence-Based Development)
- **작동 증거 필수**: 모든 구현은 테스트 또는 실행 로그로 검증
- **문서화**: 아키텍처 결정은 ADR(Architecture Decision Records)로 기록
- **트러블슈팅 로그**: 실패 사례와 해결 방법을 knowledge/에 축적

## 제약 조건 (Constraints)

### 기술적 제약
- Node.js >= 18.0.0
- TypeScript 5.3+
- ESM 모듈 시스템 사용

### 운영 제약
- 로컬 우선: 외부 API 의존성 최소화
- 오프라인 동작: 네트워크 없이도 핵심 기능 동작
- 빠른 피드백: 모든 명령은 5초 이내 응답

## 금지 사항 (Prohibited Actions)

1. **비표준 프로토콜 구현**: MCP SDK를 우회하는 커스텀 프로토콜 금지
2. **암묵적 의존성**: import 없이 전역 객체 사용 금지
3. **하드코딩**: 설정값은 반드시 환경변수 또는 설정 파일에서 로드
4. **동기 블로킹**: 장시간 실행 작업은 반드시 비동기 처리

## 변경 절차 (Amendment Process)

본 헌법의 수정은 다음 조건을 충족해야 함:
1. 명확한 기술적 근거 제시
2. 영향 범위 분석 문서 작성
3. ADR로 결정 사항 기록
4. 본 파일의 버전 관리 (git commit)

---

**최종 수정**: 2025-12-05
**버전**: 1.0.0
