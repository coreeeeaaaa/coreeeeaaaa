# Example Feature

> Status: draft

---

## Metadata

- **Feature ID**: example-feature
- **Owner**: coreeeeaaaa Team
- **Created**: 2025-12-05
- **Updated**: 2025-12-05
- **Status**: draft

---

## Overview

이 파일은 SpecKit 표준 형식의 예시입니다. 실제 기능 명세 작성 시 이 템플릿을 참고하세요.

---

## Goals

- [ ] 목표 1: SpecKit 형식 이해
- [ ] 목표 2: 명세 작성 방법 학습
- [ ] 목표 3: MCP 도구로 조작 가능 확인

---

## Requirements

### Functional Requirements

1. **FR-001**: 사용자가 기능 X를 수행할 수 있다
2. **FR-002**: 시스템이 Y 조건에서 Z 동작을 한다

### Non-Functional Requirements

1. **NFR-001**: 응답 시간 < 200ms (p95)
2. **NFR-002**: 99.9% uptime SLA

---

## Technical Design

### Architecture

```
Client → API → Service → Database
```

### Data Model

```typescript
interface ExampleEntity {
  id: string;
  name: string;
  createdAt: Date;
}
```

### API Endpoints

```
GET  /api/example
POST /api/example
```

---

## Implementation Plan

### Phase 1: Basic Implementation
- [ ] Task 1: Setup database schema
- [ ] Task 2: Implement API endpoints
- [ ] Task 3: Add validation

### Phase 2: Advanced Features
- [ ] Task 4: Add caching
- [ ] Task 5: Optimize queries

---

## Testing Strategy

- **Unit Tests**: Service layer logic
- **Integration Tests**: API endpoint flows
- **E2E Tests**: Full user journey

---

## Security Considerations

- Input validation
- Authentication required
- Rate limiting: 100 req/min

---

## Open Questions

- [ ] Should we support pagination?
- [ ] What's the max page size?

---

## References

- [SpecKit Documentation](../knowledge/SPECKIT.md)

---

## Changelog

### 2025-12-05
- Initial example created
