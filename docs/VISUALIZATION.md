# coreeeeaaaa 시스템 시각화

> **V3.0.0 아키텍처 다이어그램**
> 버전: 3.0.0
> 작성일: 2025-12-23

---

## 📊 전체 시스템 아키텍처

```mermaid
graph TB
    subgraph "사용자 계층"
        HUMAN[개발자]
        AI[AI 에이전트]
    end

    subgraph "coreeeeaaaa 계층"
        CLI[CLI 툴]
        MCP[MCP Server]
        SDK[SDK 라이브러리]
    end

    subgraph "관리 계층"
        PROPOSAL[기획서]
        SPEC[SpecKit]
        GATE[Gate 시스템]
        LOG[Logging]
    end

    subgraph "저장소 계층"
        GIT[Git]
        MEMORY[.persistence/]
        STATE[.state_management/]
        KNOWLEDGE[지식 베이스]
    end

    subgraph "실행 계층"
        AGENTS[다중 에이전트]
        WORKFLOW[워크플로우 엔진]
        CHECKPOINT[체크포인트 시스템]
    end

    HUMAN --> CLI
    AI --> MCP
    CLI --> GATE
    MCP --> GATE
    SDK --> GATE

    GATE --> PROPOSAL
    GATE --> SPEC
    GATE --> LOG

    AGENTS --> WORKFLOW
    WORKFLOW --> CHECKPOINT
    CHECKPOINT --> MEMORY
    CHECKPOINT --> STATE

    GATE --> AGENTS
    KNOWLEDGE --> AGENTS
```

---

## 🔄 AI 팀 협업 워크플로우

```mermaid
sequenceDiagram
    participant PO as Product Owner
    participant ARCH as Architect
    participant DEV as Developer
    participant QA as QA Engineer
    participant DEVOPS as DevOps
    participant GATE as Gate System

    PO->>PO: 1. 기획서 작성
    PO->>ARCH: 2. 기획서 전달

    ARCH->>ARCH: 3. SpecKit 변환
    ARCH->>DEV: 4. 명세 전달

    DEV->>DEV: 5. 구현
    DEV->>GATE: 6. gate 검증

    alt Gate 실패
        GATE--xDEV: 실패 사유 반환
        DEV->>DEV: 수정 후 재시도
    end

    GATE->>QA: 7. 통합 테스트 요청
    QA->>QA: 8. 테스트 실행
    QA->>GATE: 9. 테스트 결과

    GATE->>DEVOPS: 10. 배포 승인
    DEVOPS->>DEVOPS: 11. 배포 실행
```

---

## 🤖 다중 에이전트 협업 시스템

```mermaid
graph LR
    subgraph "에이전트 팀"
        BOOSAAN[boosaan<br/>컨텍스트 관리]
        UIJEONGBOO[uijeongboo<br/>인터페이스 관리]
        OOLSAAN[oolsaan<br/>품질 보증]
        ILSAAN[ilsaan<br/>워크플로우 관리]
    end

    subgraph "상태 관리"
        REGISTRY[Agent Registry]
        CONTINUUM[Task Continuum]
        CHECKPOINT[체크포인트]
    end

    BOOSAAN --> REGISTRY
    UIJEONGBOO --> REGISTRY
    OOLSAAN --> REGISTRY
    ILSAAN --> CONTINUUM

    CONTINUUM --> CHECKPOINT
    CHECKPOINT -.->|15분 간격| CONTINUUM

    REGISTRY -.->|실시간| BOOSAAN
    REGISTRY -.->|실시간| UIJEONGBOO
```

---

## 🔐 보안 및 리스크 관리

```mermaid
graph TB
    subgraph "보안 계층"
        AUTH[인증]
        ENCRYPT[암호화]
        AUDIT[감사]
    end

    subgraph "리스크 관리"
        DETECT[감지]
        ANALYZE[분석]
        RESPOND[대응]
    end

    subgraph "복구 시스템"
        BACKUP[백업]
        RESTORE[복구]
        VALIDATE[검증]
    end

    AUTH --> ENCRYPT
    ENCRYPT --> AUDIT

    AUDIT --> DETECT
    DETECT --> ANALYZE
    ANALYZE --> RESPOND

    RESPOND --> BACKUP
    BACKUP --> RESTORE
    RESTORE --> VALIDATE
    VALIDATE -.->|성공| RESPOND
    VALIDATE -.->|실패| RESPOND
```

---

## 📈 프로젝트 관리 라이프사이클

```mermaid
stateDiagram-v2
    [*] --> Planning: 프로젝트 시작
    Planning --> Spec: 기획서 완료
    Spec --> Development: SpecKit 완료
    Development --> Testing: 구현 완료
    Testing --> Deployment: 테스트 통과
    Deployment --> Monitoring: 배포 완료
    Monitoring --> Maintenance: 안정화

    Maintenance --> Planning: 다음 버전
    Maintenance --> [*]: 프로젝트 종료

    note right of Planning
        templates/PROJECT_PROPOSAL.md
    end note

    note right of Spec
        templates/SPEC_TEMPLATE.md
    end note

    note right of Development
        npx coreeeeaaaa develop
    end note

    note right of Testing
        gate 검증
    end note
```

---

## 🗂️ 데이터 흐름

```mermaid
flowchart TD
    A[사용자 입력] --> B{입력 타입?}

    B -->|기획서| C[PROJECT_PROPOSAL.md]
    B -->|명세| D[SPEC_TEMPLATE.md]
    B -->|코드| E[소스 코드]

    C --> F[SpecKit Parser]
    D --> F
    E --> G[Gate System]

    F --> G
    G --> H{검증 결과?}

    H -->|성공| I[저장소]
    H -->|실패| J[에러 로그]

    I --> K[Git]
    I --> L[.persistence/]
    I --> M[.state_management/]

    J --> N[리스크 관리]
    N --> O[자가 치유]
    O --> E
```

---

## 🎯 Spec-Driven Development 파이프라인

```mermaid
graph LR
    A[기획서] --> B[SpecKit 변환]
    B --> C[FR/NFR 정의]
    C --> D[아키텍처 설계]
    D --> E[API 명세]
    E --> F[구현]
    F --> G[테스트]
    G --> H[gate 검증]
    H --> I[배포]

    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#ffe1f5
    style D fill:#e1ffe1
    style E fill:#f5e1ff
    style F fill:#ffe1e1
    style G fill:#e1f5ff
    style H fill:#fff4e1
    style I fill:#e1ffe1
```

---

## 🔄 내부 개선 순환

```mermaid
graph TB
    A[에러 발생] --> B[로그 기록]
    B --> C[패턴 분석]
    C --> D{자동 수정 가능?}

    D -->|Yes| E[자동 수정]
    D -->|No| F[사람 개입]

    E --> G[테스트]
    F --> G

    G --> H{성공?}
    H -->|Yes| I[배포]
    H -->|No| C

    I --> J[지식 베이스 업데이트]
    J --> K[학습]

    K -.->|다음 에러| A
```

---

## 📊 모니터링 대시보드

```mermaid
graph TB
    subgraph "메트릭 수집"
        LOGS[로그]
        METRICS[메트릭]
        EVENTS[이벤트]
    end

    subgraph "분석"
        PATTERN[패턴 인식]
        ANOMALY[이상 감지]
        TREND[추세 분석]
    end

    subgraph "알림"
        ALERT[알림 생성]
        ROUTE[라우팅]
        NOTIFY[알림 발송]
    end

    subgraph "대시보드"
        UI[웹 UI]
        CLI[CLI 출력]
        API[API 엔드포인트]
    end

    LOGS --> PATTERN
    METRICS --> ANOMALY
    EVENTS --> TREND

    PATTERN --> ALERT
    ANOMALY --> ALERT
    TREND --> ALERT

    ALERT --> ROUTE
    ROUTE --> NOTIFY
    ROUTE --> UI
    ROUTE --> CLI
    ROUTE --> API
```

---

## 🛡️ Git 전략

```mermaid
gitGraph
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Dev setup"

    branch feature/auth
    checkout feature/auth
    commit id: "Auth impl"
    commit id: "Auth tests"

    checkout develop
    merge feature/auth
    commit id: "Merge auth"

    branch feature/ui
    checkout feature/ui
    commit id: "UI components"

    checkout develop
    merge feature/ui
    commit id: "Merge UI"

    checkout main
    merge develop tag: "v0.4.0"
```

---

## 📚 파일 구조

```mermaid
graph TD
    A[coreeeeaaaa/] --> B[.coreeeeaaaa/]
    A --> C[packages/]
    A --> D[docs/]
    A --> E[templates/]
    A --> F[.github/]

    B --> B1[MASTER.md]
    B --> B2[memory/]
    B --> B3[specs/]
    B --> B4[state_management/]

    C --> C1[sdk/]
    C --> C2[core/]
    C --> C3[cli/]

    D --> D1[AI_TEAM_WORKFLOW.md]
    D --> D2[RISK_MANAGEMENT.md]
    D --> D3[VISUALIZATION.md]

    E --> E1[PROJECT_PROPOSAL.md]
    E --> E2[SPEC_TEMPLATE.md]

    F --> F1[workflows/]
    F --> F2[ACTIONS/]
```

---

## 🔗 MCP 통합

```mermaid
graph LR
    subgraph "Claude Desktop"
        A[사용자]
        B[Claude AI]
    end

    subgraph "MCP Servers"
        C[Serena]
        D[Conglruo]
        E[coreeeeaaaa]
    end

    subgraph "Local Tools"
        F[Git]
        G[npm]
        H[File System]
    end

    A --> B
    B --> C
    B --> D
    B --> E

    C --> F
    D --> G
    E --> H
```

---

## 📖 사용 방법

### 로컬에서 보기
```bash
# Mermaid CLI 설치
npm install -g @mermaid-js/mermaid-cli

# 다이어그램 렌더링
mmdc -i VISUALIZATION.md -o output.png
```

### 웹에서 보기
1. GitHub에 푸시하면 자동 렌더링
2. VS Code: Mermaid Preview 확장프로그램 설치
3. 온라인: https://mermaid.live/

---

**© 2025 coreeeeaaaa Framework. All rights reserved.**
