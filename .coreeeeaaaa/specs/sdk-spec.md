# @coreeeeaaaa/sdk 명세서

> 개발자가 프로젝트에 embed하여 사용하는 라이브러리

---

## 설치

```bash
npm install @coreeeeaaaa/sdk
```

---

## 빠른 시작

```typescript
import { CoreSDK } from '@coreeeeaaaa/sdk';

const sdk = new CoreSDK({
  projectId: 'my-project',
  rootDir: process.cwd(),
});

await sdk.init();
await sdk.runGate('quality-gate', { code: '...' });
```

---

## API 레퍼런스

### CoreSDK

#### Constructor

```typescript
new CoreSDK(config?: CoreConfig)
```

**CoreConfig**:
```typescript
interface CoreConfig {
  projectId?: string;          // 프로젝트 ID
  rootDir?: string;            // 작업 디렉토리 (기본: process.cwd())
  artifactsDir?: string;       // artifacts 경로 (기본: ./artifacts)
}
```

---

#### init()

artifacts 디렉토리 구조를 초기화합니다.

```typescript
await sdk.init(): Promise<void>
```

**생성되는 디렉토리**:
- `artifacts/gates/`
- `artifacts/evidence/`
- `artifacts/pointers/`
- `artifacts/logs/`
- `artifacts/budget/`
- `artifacts/lineage/`

---

#### runGate()

JSON Schema 기반 Gate 검증을 수행합니다.

```typescript
await sdk.runGate(
  gateId: GateId,
  input: GateInput,
  schemaPath?: string
): Promise<GateResult>
```

**파라미터**:
- `gateId`: Gate 식별자 (예: 'quality-gate')
- `input`: 검증할 데이터
- `schemaPath`: JSON Schema 파일 경로 (선택적)

**반환값**:
```typescript
interface GateResult {
  gateId: string;
  ok: boolean;
  evaluatedAt: string;      // ISO timestamp
  inputHash: string;
  errors?: string[];
}
```

**예시**:
```typescript
const result = await sdk.runGate('quality', {
  coverage: 85,
  lintErrors: 0,
}, './schemas/quality.json');

if (!result.ok) {
  console.error('Gate failed:', result.errors);
}
```

---

#### appendEvidence()

증거 데이터를 수집합니다.

```typescript
await sdk.appendEvidence(evidence: EvidencePayload): Promise<void>
```

**EvidencePayload**:
```typescript
interface EvidencePayload {
  type: string;              // 'test_result', 'build_log', 'scan' 등
  path: string;              // 파일 경로
  content?: string | Buffer; // 또는 직접 내용
  hash?: string;             // 해시값 (자동 계산 가능)
}
```

**예시**:
```typescript
await sdk.appendEvidence({
  type: 'test_coverage',
  path: './coverage/lcov.info',
});

await sdk.appendEvidence({
  type: 'build_log',
  path: '/tmp/build.log',
  content: '...',
});
```

**저장 위치**: `artifacts/evidence/manifest.jsonl`

---

#### reportBudget()

비용 사용량을 보고합니다.

```typescript
await sdk.reportBudget(cost: BudgetPayload): Promise<void>
```

**BudgetPayload**:
```typescript
interface BudgetPayload {
  period: string;        // 'YYYY-MM' 형식
  amount: number;
  currency: string;
  category?: string;
}
```

**예시**:
```typescript
await sdk.reportBudget({
  period: '2025-12',
  amount: 150.50,
  currency: 'USD',
  category: 'LLM_API',
});
```

---

#### updatePointerCAS()

Compare-And-Swap 방식으로 포인터를 업데이트합니다.

```typescript
await sdk.updatePointerCAS(
  hash: string,
  snapshotTs: string,
  ifMatch?: string
): Promise<void>
```

**파라미터**:
- `hash`: 새 해시값
- `snapshotTs`: 스냅샷 타임스탬프
- `ifMatch`: 기대하는 현재 ETag (CAS 조건)

**예시**:
```typescript
await sdk.updatePointerCAS(
  'abc123',
  '2025-12-05T10:00:00Z',
  'etag-xyz'  // 이 값과 일치해야 업데이트
);
```

---

#### logLineage()

계보(lineage) 이벤트를 기록합니다.

```typescript
await sdk.logLineage(
  entity: string,
  meta: Record<string, any>
): Promise<void>
```

**예시**:
```typescript
await sdk.logLineage('dataset-v2', {
  source: 'ETL_Pipeline',
  rows: 10000,
  transformations: ['filter', 'normalize'],
});
```

---

## 고급 기능

### Storage 백엔드 설정

환경변수로 Storage provider 선택:

```bash
export COREEEEAAAA_STORAGE_PROVIDER=local-fs
# 또는 firebase, gcs
```

**Local FS** (기본):
```typescript
const sdk = new CoreSDK();
// artifacts/ 디렉토리에 로컬 저장
```

**Firebase**:
```typescript
// .env
COREEEEAAAA_STORAGE_PROVIDER=firebase
FIREBASE_PROJECT_ID=my-project

// 코드
const sdk = new CoreSDK();
await sdk.init();
```

---

### Rust 엔진 연동

SDK는 자동으로 Rust 엔진을 호출합니다 (있는 경우):

1. `packages/engine-rs/target/release/core-uem-engine` 바이너리 확인
2. 없으면 `cargo run` 시도
3. 실패 시 경고만 출력 (치명적 아님)

**수동 빌드**:
```bash
cd packages/engine-rs
cargo build --release
```

---

## 타입 정의

### GateId
```typescript
type GateId = string;
```

### GateInput
```typescript
type GateInput = Record<string, any>;
```

### LogEntry
```typescript
interface LogEntry {
  type: string;
  actor?: string;
  context?: string;
  text: string;
  meta?: Record<string, any>;
  ts?: string;
  ts_compact?: string;
}
```

---

## 모듈 Exports

```typescript
// 메인
import { CoreSDK } from '@coreeeeaaaa/sdk';

// 타입
import type { GateResult, EvidencePayload } from '@coreeeeaaaa/sdk/types';

// 유틸리티
import { hashObject, hashString } from '@coreeeeaaaa/sdk/utils';

// 개별 모듈
import { runGate } from '@coreeeeaaaa/sdk/gate';
import { collectEvidence } from '@coreeeeaaaa/sdk/evidence';
```

---

## 예제

### 완전한 워크플로우

```typescript
import { CoreSDK } from '@coreeeeaaaa/sdk';

async function main() {
  const sdk = new CoreSDK({
    projectId: 'my-app',
  });

  // 1. 초기화
  await sdk.init();
  console.log('SDK initialized');

  // 2. Gate 검증
  const gateResult = await sdk.runGate('quality', {
    coverage: 90,
    lintErrors: 0,
  });

  if (!gateResult.ok) {
    throw new Error('Quality gate failed');
  }

  // 3. Evidence 수집
  await sdk.appendEvidence({
    type: 'test_coverage',
    path: './coverage/lcov.info',
  });

  // 4. Budget 보고
  await sdk.reportBudget({
    period: '2025-12',
    amount: 50,
    currency: 'USD',
  });

  // 5. Pointer 업데이트
  await sdk.updatePointerCAS(
    gateResult.inputHash,
    gateResult.evaluatedAt
  );

  console.log('Workflow completed');
}

main().catch(console.error);
```

---

## 문제 해결

### Q: "artifacts/ 디렉토리가 생성되지 않음"
**A**: `await sdk.init()` 호출 확인

### Q: "Rust 엔진 에러"
**A**: 선택적 기능. 경고 무시 가능. 필요 시 `cargo build --release`

### Q: "Storage에 기록되지 않음"
**A**: 환경변수 `COREEEEAAAA_STORAGE_PROVIDER` 확인

---

**버전**: 0.1.0
**라이센스**: Apache-2.0
