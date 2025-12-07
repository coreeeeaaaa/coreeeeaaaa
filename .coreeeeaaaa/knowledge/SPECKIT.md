# SpecKit - 기능 명세 표준

> **SpecKit**: coreeeeaaaa 프로젝트의 기능 명세 작성 표준

---

## 개요

**SpecKit**은 `.coreeeeaaaa/specs/` 디렉토리에 저장되는 **구조화된 Markdown 기능 명세**입니다.

### 목적

1. **AI와 개발자가 모두 읽을 수 있는 명세**
2. **버전 관리 가능** (Git으로 추적)
3. **실행 가능한 명세** (MCP 도구로 읽기/쓰기)

---

## 파일 형식

### 위치
```
.coreeeeaaaa/specs/{feature-id}.md
```

### 명명 규칙
- **kebab-case**: `user-authentication.md`
- **feature-id**: URL-safe, 소문자, 하이픈 구분
- **확장자**: `.md` (Markdown)

---

## 표준 템플릿

```markdown
# {Feature Name}

> Status: {draft|review|approved|implemented|deprecated}

---

## Metadata

- **Feature ID**: {feature-id}
- **Owner**: {team or person}
- **Created**: {YYYY-MM-DD}
- **Updated**: {YYYY-MM-DD}
- **Status**: {draft|review|approved|implemented|deprecated}

---

## Overview

{1-2 문장으로 기능 요약}

---

## Goals

- [ ] 목표 1
- [ ] 목표 2
- [ ] 목표 3

---

## Requirements

### Functional Requirements

1. **FR-001**: {기능 요구사항}
2. **FR-002**: {기능 요구사항}

### Non-Functional Requirements

1. **NFR-001**: {성능, 보안, 확장성 등}
2. **NFR-002**: {성능, 보안, 확장성 등}

---

## Technical Design

### Architecture

{아키텍처 설명 또는 다이어그램}

### Data Model

```typescript
interface User {
  id: string;
  email: string;
  // ...
}
```

### API Endpoints

```
POST /api/users/register
GET  /api/users/:id
```

---

## Implementation Plan

### Phase 1: {단계 이름}
- [ ] Task 1
- [ ] Task 2

### Phase 2: {단계 이름}
- [ ] Task 3
- [ ] Task 4

---

## Testing Strategy

- **Unit Tests**: {설명}
- **Integration Tests**: {설명}
- **E2E Tests**: {설명}

---

## Security Considerations

- {보안 고려사항 1}
- {보안 고려사항 2}

---

## Open Questions

- [ ] Question 1
- [ ] Question 2

---

## References

- [Related ADR](../knowledge/adr/001-decision.md)
- [External Doc](https://example.com)

---

## Changelog

### 2025-12-05
- Initial draft

### 2025-12-06
- Added API endpoints
```

---

## 예시: user-authentication.md

```markdown
# User Authentication

> Status: draft

---

## Metadata

- **Feature ID**: user-authentication
- **Owner**: Backend Team
- **Created**: 2025-12-05
- **Updated**: 2025-12-05
- **Status**: draft

---

## Overview

OAuth 2.0 기반 사용자 인증 시스템. 이메일/비밀번호 및 소셜 로그인(Google, GitHub) 지원.

---

## Goals

- [ ] 사용자가 이메일로 회원가입 가능
- [ ] 소셜 로그인 (Google, GitHub) 지원
- [ ] JWT 기반 세션 관리
- [ ] 2FA (Two-Factor Authentication) 선택적 지원

---

## Requirements

### Functional Requirements

1. **FR-001**: 사용자는 이메일/비밀번호로 회원가입할 수 있다
2. **FR-002**: 비밀번호는 최소 8자, 대소문자, 숫자, 특수문자 포함
3. **FR-003**: 이메일 인증 링크를 발송한다
4. **FR-004**: Google OAuth 2.0으로 로그인 가능

### Non-Functional Requirements

1. **NFR-001**: 비밀번호는 bcrypt (cost 12)로 해시
2. **NFR-002**: JWT 토큰 만료 시간 15분
3. **NFR-003**: Refresh Token 만료 시간 7일
4. **NFR-004**: Rate Limiting: 5 req/min per IP

---

## Technical Design

### Architecture

```
Client → API Gateway → Auth Service → Database
                     → Email Service
```

### Data Model

```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Session {
  userId: string;
  token: string;
  expiresAt: Date;
}
```

### API Endpoints

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/verify-email/:token
POST /api/auth/oauth/google
```

---

## Implementation Plan

### Phase 1: Email/Password Auth
- [ ] User model 구현
- [ ] Registration endpoint
- [ ] Login endpoint
- [ ] JWT 토큰 생성/검증

### Phase 2: Email Verification
- [ ] Email service 통합
- [ ] Verification token 생성
- [ ] Verification endpoint

### Phase 3: Social Login
- [ ] Google OAuth 통합
- [ ] GitHub OAuth 통합

---

## Testing Strategy

- **Unit Tests**: User model, JWT utils, password hashing
- **Integration Tests**: Registration flow, Login flow
- **E2E Tests**: Full authentication flow with frontend

---

## Security Considerations

- 비밀번호 해시에 bcrypt cost 12 사용
- JWT secret은 환경변수로 관리
- HTTPS 필수
- CORS 설정: whitelist 방식
- Rate limiting으로 brute force 방지
- SQL Injection 방지: Prepared Statements

---

## Open Questions

- [ ] 2FA는 Phase 3에 포함할까?
- [ ] 비밀번호 복잡도 정책을 더 강화할까?

---

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## Changelog

### 2025-12-05
- Initial draft
- Added functional requirements
- Defined API endpoints
```

---

## MCP 도구로 사용

### Spec 생성

```typescript
// AI가 MCP로 호출
manage_spec({
  action: "create",
  feature_id: "user-authentication",
  content: "# User Authentication\n\n> Status: draft\n\n..."
})
```

### Spec 읽기

```typescript
manage_spec({
  action: "read",
  feature_id: "user-authentication"
})
// → Markdown 내용 반환
```

### 모든 Spec 목록

```typescript
manage_spec({
  action: "list"
})
// → ["user-authentication", "payment-processing", ...]
```

---

## 상태 전환 흐름

```
draft → review → approved → implemented → (deprecated)
```

1. **draft**: 초안 작성 중
2. **review**: 리뷰 요청
3. **approved**: 승인됨, 구현 시작 가능
4. **implemented**: 구현 완료
5. **deprecated**: 더 이상 사용 안 함

---

## Best Practices

### 1. 명확한 요구사항
- "사용자가 X를 할 수 있다" 형식
- 모호한 표현 지양

### 2. 테스트 가능한 명세
- 각 요구사항이 검증 가능해야 함
- 수치 목표 명시 (예: "응답 시간 < 200ms")

### 3. 버전 관리
- Changelog 섹션 필수 유지
- 주요 변경 사항은 Git commit과 연결

### 4. 참조 추가
- 관련 ADR 링크
- 외부 표준 문서 링크

---

## SpecKit vs 다른 형식

| 형식 | 장점 | 단점 |
|------|------|------|
| **SpecKit (Markdown)** | Git 친화적, 읽기 쉬움, AI 처리 용이 | 구조 검증 약함 |
| **JSON/YAML** | 구조 검증 강력, 파싱 쉬움 | 사람이 읽기 어려움 |
| **Confluence/Notion** | 협업 UI, 풍부한 편집 | 버전 관리 어려움, API 제한적 |

**SpecKit 선택 이유**: Git + AI + 사람 모두 친화적

---

## 도구 체인

```
AI/개발자 작성 → .coreeeeaaaa/specs/{id}.md
                 ↓
              Git 커밋
                 ↓
         MCP 도구로 읽기/쓰기
                 ↓
         CI/CD에서 검증
```

---

## 향후 확장

### Phase 1 (현재)
- ✅ Markdown 기반 기본 템플릿
- ✅ MCP CRUD 도구

### Phase 2 (미래)
- [ ] Frontmatter YAML 파싱
- [ ] JSON Schema 검증
- [ ] 자동 Spec → Issue 변환

### Phase 3 (미래)
- [ ] Spec → 코드 스캐폴딩
- [ ] 구현 코드 → Spec 역생성
- [ ] Spec Coverage 리포트

---

## 요약

**SpecKit = `.coreeeeaaaa/specs/` 디렉토리의 구조화된 Markdown 명세**

- 표준 템플릿 준수
- Git으로 버전 관리
- MCP 도구로 CRUD
- AI와 사람 모두 읽기/쓰기 가능

---

**버전**: 1.0.0
**최종 업데이트**: 2025-12-05
