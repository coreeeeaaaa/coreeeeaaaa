# coreeeeaaaa Framework 정본 (CANON)

> **전문가급 개발 프레임워크 표준**
> 버전: 3.0.0 (전면 재정의)
> 작성일: 2025-12-23
> 적용: 모든 AI, 모든 개발자, 모든 프로젝트

---

## 📋 프레임워크 정의

### coreeeeaaaa란?

**coreeeeaaaa**는 **Spec-Driven Development**를 위한 **표준화된 프레임워크**입니다.

```yaml
본질:
  - 라이브러리: 아님
  - 자동화 도구: 아님
  - 프로젝트 관리자: 아님
  - 개발 프레임워크: 맞음

역할:
  - 표준 제공: 개발 절차, 명세 형식, 검증 기준
  - 템플릿 제공: 기획서, SpecKit 명세
  - 가이드 제공: 워크플로우, 모벨 사례

하지 않는 것:
  - 코드 자동 생성: X
  - 프로젝트 상태 관리: X
  - 개발 대행: X
```

---

## 🎯 핵심 원칙 (강제 규약)

### 1. Spec-Driven (명세 중심)

```yaml
규칙:
  - 모든 개발은 SpecKit 명세부터 시작
  - 코드 없이 명세만으로도 이해 가능해야 함
  - 명계가 변경되면 코드도 변경

순서:
  1. PROJECT_PROPOSAL.md (기획서)
  2. SPEC_TEMPLATE.md (SpecKit 명세)
  3. 구현 (코드 작성)
  4. gate (검증)

금지:
  - 명세 없이 코드 작성 (X)
  - 명계와 다른 코드 (X)
```

### 2. Gate-Based (게이트 기반)

```yaml
규칙:
  - 모든 변경사항은 gate 검증 통과 필수
  - gate 실패 시 병합/배포 금지
  - gate 결과는 영구 기록

gate 종류:
  - pre-commit: 로컬 커밋 전
  - pre-push: 원격 푸시 전
  - pre-merge: 병합 전
  - pre-deploy: 배포 전
```

### 3. Project Isolation (프로젝트 격리)

```yaml
규칙:
  - 각 프로젝트는 독립적인 .core-project/ 폴더
  - 프로젝트 간 상태 공유 금지
  - 프레임워크는 프로젝트 상태를 저장하지 않음

구조:
  coreeeeaaaa/          # 프레임워크 (상태 없음)
  ├── packages/
  ├── templates/
  └── docs/

  my-project/           # 프로젝트 (.core-project/에 상태)
  ├── .core-project/
  ├── src/
  └── tests/
```

### 4. Single Source of Truth (단일 진실)

```yaml
규칙:
  - SpecKit 명세가 유일한 진실
  - 코드는 명계의 구현일 뿐
  - 불일치 시 명계 우선

순서:
  명세 변경 → 코드 수정 → gate 검증
```

---

## 📏 필수 준수 사항 (절대적)

### 모든 프로젝트가 반드시 가져야 할 것

```yaml
필수 구조:
  .core-project/
    ├── specs/              # SpecKit 명세 (필수)
    │   └── *.spec.md
    ├── state/              # 현재 상태 (필수)
    │   ├── current-phase.json
    │   └── quality-report.json
    └── checkpoints/        # 체크포인트 (필수)
        └── YYYY-MM-DD/

필수 문서:
  - specs/*.spec.md         # SpecKit 명세
  - README.md               # 프로젝트 소개

필수 절차:
  1. 기획서 작성 (PROJECT_PROPOSAL.md)
  2. SpecKit 변환 (specs/*.spec.md)
  3. 구현 (src/)
  4. 테스트 (tests/)
  5. 검증 (npm test)
```

### 절대 금지 사항

```yaml
절대 하지 말 것:
  - [ ] 명세 없이 코드 작성
  - [ ] gate 검증 없이 배포
  - [ ] .core-project/ 무시
  - [ ] 템플릿 무시하고 자체 형식 사용
  - [ ] 절차 건너뛰기
```

---

## 🔄 표준 워크플로우 (강제)

### Phase 1: Planning (기획)

```yaml
목표: 프로젝트 명확화

산출물:
  - proposals/PROJECT_NAME.md
  - (기획서, 필수 아님 권장)

절차:
  1. templates/PROJECT_PROPOSAL.md 복사
  2. 프로젝트 개요 작성
  3. 목표 및 성공 기준 정의
  4. 핵심 기능 요건 정의
```

### Phase 2: Specification (명세화)

```yaml
목표: 기술 명세 작성

산출물:
  - specs/PROJECT_NAME.spec.md (필수)

절차:
  1. templates/SPEC_TEMPLATE.md 복사
  2. 기획서 내용을 SpecKit 형식으로 변환
  3. FR (기능 요구사항) 작성
  4. NFR (비기능 요구사항) 작성
  5. 아키텍처 설계
  6. API 명세 작성

검증:
  - 명계 completeness 체크
  - stakeholder 리뷰
```

### Phase 3: Implementation (구현)

```yaml
목표: 명계 구현

산출물:
  - src/ (코드)
  - tests/ (테스트)

절차:
  1. 명계에서 기능 단위 분리
  2. 기능 단위로 구현
  3. 단위 테스트 작성
  4. 로컬 gate 검증

규칙:
  - 하나의 기능을 완전히 마치고 다음 기능
  - 테스트 없이 구현 금지
  - gate 통과 없이 다음 단계 금지
```

### Phase 4: Verification (검증)

```yaml
목표: 품질 검증

절차:
  1. 통합 테스트 작성
  2. E2E 테스트 작성
  3. gate 검증 (npx coreeeeaaaa gate)
  4. 버그 수정
  5. 재검증

gate 검증 항목:
  - [ ] 단위 테스트 통과
  - [ ] 통합 테스트 통과
  - [ ] E2E 테스트 통과
  - [ ] 커버리지 >80%
  - [ ] 보안 스캔 통과
  - [ ] 명계와 코드 일치
```

### Phase 5: Deployment (배포)

```yaml
목표: 프로덕션 배포

절차:
  1. 스테이징 배포
  2. 스모크 테스트
  3. 최종 gate 검증
  4. 프로덕션 배포
  5. 헬스체크
  6. 모니터링 시작

배포 전 체크리스트:
  - [ ] 모든 gate 통과
  - [ ] 롤백 계획 수립
  - [ ] 모니터링 설정 완료
  - [ ] 문서 업데이트 완료
```

---

## 📐 표준 구조 (강제)

### coreeeeaaaa (프레임워크)

```
coreeeeaaaa/
├── packages/              # 프레임워크 코드
│   ├── cli/              # CLI 도구
│   ├── core/             # MCP 서버
│   └── sdk/              # SDK 라이브러리
│
├── templates/            # 제공용 템플릿
│   ├── PROJECT_PROPOSAL.md
│   └── SPEC_TEMPLATE.md
│
├── docs/                 # 프레임워크 문서
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── USER_GUIDE.md
│
├── CANON.md              # 이 파일 (정본)
├── STRUCTURE.md          # 구조 정의
└── README.md             # 소개
```

### 프로젝트 (사용자)

```
my-project/
├── .core-project/        # 프로젝트 상태 (필수)
│   ├── specs/            # SpecKit 명세
│   │   └── *.spec.md
│   ├── state/            # 현재 상태
│   │   ├── current-phase.json
│   │   └── quality-report.json
│   └── checkpoints/      # 체크포인트
│       └── YYYY-MM-DD/
│
├── src/                  # 프로젝트 코드
├── tests/                # 프로젝트 테스트
├── docs/                 # 프로젝트 문서
├── README.md             # 프로젝트 소개
└── package.json
```

---

## 🛠️ CLI 표준 (강제)

### init 명령어

```bash
# 사용법
npx coreeeeaaaa init <project-name>

# 동작 (표준)
1. project-name/ 디렉토리 생성
2. .core-project/ 디렉토리 생성
3. templates/를 .core-project/templates/로 복사
4. src/, tests/ 디렉토리 생성
5. package.json 생성
6. README.md 생성

# 금지 동작
- 현재 디렉토리에 파일 생성 (X)
- 기존 파일 덮어쓰기 (X)
```

### gate 명령어

```bash
# 사용법
npx coreeeeaaaa gate

# 동작 (표준)
1. .core-project/specs/에서 *.spec.md 찾기
2. 명계와 코드 일치성 검증
3. 테스트 실행
4. 커버리지 확인
5. 보안 스캔
6. 결과를 .core-project/state/quality-report.json에 저장
7. 종료 코드 반환 (0: 성공, 1: 실패)

# 출력 형식
✅ Gate 검증 통과
- 명세 일치: 100%
- 테스트 통과: 95% (19/20)
- 커버리지: 87%
- 보안 스캔: 통과
```

### log 명령어

```bash
# 사용법
npx coreeeeaaaa log --add --type <type> --text "<text>"

# 동작
1. 현재 시간 기록
2. 타입과 텍스트 저장
3. .core-project/checkpoints/YYYY-MM-DD/에 기록

# 사용법
npx coreeeeaaaa log --tail

# 동작
1. 최근 20개 로그 출력
```

---

## 📖 표준 문서 구조

### 1. CANON.md (이 파일)

```yaml
역할: 프레임워크 정본
대상: 모든 사용자 (필독)
위치: 프레임워크 루트
내용:
  - 프레임워크 정의
  - 핵심 원칙
  - 표준 워크플로우
  - 표준 구조
```

### 2. SPECKIT.md (SpecKit 표준)

```yaml
역할: 명세 작성 가이드
대상: 모든 개발자
위치: .coreeeeaaaa/knowledge/SPECKIT.md
내용:
  - FR 작성법
  - NFR 작성법
  - 아키텍처 작성법
  - API 명세 작성법
```

### 3. STRUCTURE.md

```yaml
역할: 구조 정의서
대상: 모든 사용자
위치: 프레임워크 루트
내용:
  - 디렉토리 구조
  - 파일 소유권
  - 용어 정의
```

---

## 🔍 품질 기준 (강제)

### 코드 품질

```yaml
필수:
  - [ ] ESLint 통과
  - [ ] Prettier 포맷팅
  - [ ] 타입 검사 통과 (TypeScript)
  - [ ] 단위 테스트 >80% 커버리지
  - [ ] 명계와 코드 일치

권장:
  - [ ] 통합 테스트
  - [ ] E2E 테스트
  - [ ] 성능 테스트
```

### 문서 품질

```yaml
필수:
  - [ ] README.md (프로젝트 소개)
  - [ ] specs/*.spec.md (SpecKit 명세)
  - [ ] CHANGELOG.md (변경 이력)

권장:
  - [ ] ARCHITECTURE.md (아키텍처)
  - [ ] API.md (API 문서)
  - [ ] CONTRIBUTING.md (기여 가이드)
```

---

## ⚠️ 규약 위반 시

### 자동 감지

```yaml
gate 실패 시:
  - 커밋 차단
  - PR 생성 불가
  - 배포 차단

자동 수정 불가:
  - 사람이 직접 수정 필요
```

### 수동 감지

```yaml
코드 리뷰 시:
  - SpecKit 없이 구현 → 요청
  - gate 검증 없이 배포 → 거부
  - 템플릿 무시 → 수정 요청
```

---

## 🎓 학습 순서 (권장)

### 1단계: 이해

```yaml
읽을 것:
  - CANON.md (이 파일)
  - STRUCTURE.md
  - README.md

목표:
  - coreeeeaaaa가 뭔지 이해
  - 무엇을 제공하는지 이해
  - 무엇을 하지 않는지 이해
```

### 2단계: 실습

```yaml
할 것:
  - npx coreeeeaaaa init test-project
  - 기획서 작성
  - SpecKit 변환
  - 간단한 기능 구현
  - gate 검증

목표:
  - 워크플로우 체험
  - 도구 사용법 습득
```

### 3단계: 적용

```yaml
할 것:
  - 실제 프로젝트에 적용
  - 팀원 교육
  - 피드백 수집

목표:
  - 실무 적용
  - 프로세스 최적화
```

---

## 📞 지원

### 문제 보고

```bash
# 이슈 생성
gh issue create --repo coreeeeaaaa/coreeeeaaaa \
  --title "[Question] 제목" \
  --body "상세 내용"

# 버그 보고
gh issue create --repo coreeeeaaaa/coreeeeaaaa \
  --title "[Bug] 제목" \
  --body "재현 단계"
```

### 기능 요청

```bash
# PR 생성
gh pr create --repo coreeeeaaaa/coreeeeaaaa \
  --title "[Feature] 제목" \
  --body "기능 상세"
```

---

## 📝 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 3.0.0 | 2025-12-23 | 전면 재정의: 전문가급 표준화 |
| 2.0.0 | 2025-12-23 | 역할/경계 명확화 |
| 1.x.x | 이전 | 초기 버전 (사용 중지) |

---

## 🔗 관련 문서

- **[STRUCTURE.md](STRUCTURE.md)** - 구조 정의서
- **[.coreeeeaaaa/knowledge/SPECKIT.md](.coreeeeaaaa/knowledge/SPECKIT.md)** - SpecKit 표준
- **[docs/AI_TEAM_WORKFLOW.md](docs/AI_TEAM_WORKFLOW.md)** - 워크플로우 가이드
- **[docs/RISK_MANAGEMENT.md](docs/RISK_MANAGEMENT.md)** - 리스크 관리

---

**© 2025 coreeeeaaaa Framework. All rights reserved.**

**이 문서는 coreeeeaaaa Framework의 정본(CANON)입니다.**
