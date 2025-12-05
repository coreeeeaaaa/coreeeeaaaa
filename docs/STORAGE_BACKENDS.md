# STORAGE BACKENDS INVENTORY

| File | Symbol/Function | Role | Can move behind StorageDriver? |
| --- | --- | --- | --- |
| `core/logger.js` | `logEvent` | 개발 로그를 Firebase Firestore(`coreeeeaaaa_logs`)에 기록 | ✅ (로그 기록을 StorageDriver로 위임) |
| `scripts/uem-log.js` | `appendQuantum` & `logEvent` | UEM Quanta 생성 후 Firestore 로그와 `.core/core.uem` 기록 | ✅ (`logEvent`와 append 결과를 StorageDriver를 통해만 기록) |
| `scripts/ingest-firebase-logs-to-uem.js` | `appendFirebaseLogs` helper | Firebase 로그를 읽어 UEM ledger에 적재 | ✅ (Firestore 읽기는 향후 storage driver의 read API로 옮길 수 있음) |
| `functions/index.js` | `logAgentWorkGen2` | Firebase Function에서 Firestore 로그 생성 및 지표 업데이트 | ✅ (Cloud function은 driver 확장 시 provider 로직으로 대체; 지금은 placeholder) |
| `functions/src/index.ts` | `logAgentWorkGen2` (v2) | Firebase Gen2 HTTP 트리거를 통해 Firestore에 상태 저장 | ✅ (driver 구현으로 대체 가능) |

> 모든 핵심 비즈니스/CLI 코드에서 `firebase-admin`/`firestore`를 직접 호출하지 말고, 앞으로 정의할 `StorageDriver`를 통해서만 기록/조회하도록 옮겨야 함.
