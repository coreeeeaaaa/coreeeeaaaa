# UEM PIPELINE

## 선택한 로깅 스트림: `scripts/uem-log.js`
1. **이벤트 발생** – `scripts/uem-log.js`가 `core/logger.logEvent`를 호출하여 개발 서버 로그를 Firebase Firestore 컬렉션(`coreeeeaaaa_logs`)에 시도 저장(실제 Firestore가 없으면 경고만 출력).
2. **SDK/Sequence** – 동일 스크립트에서 `core/uem/quantum`의 `createQuantum`을 이용해 `Coord9` + `payload_hash` 기반 `UemQuantum`을 생성.
3. **UEM ingest** – `core/uem/ledger.appendQuantum`이 `.core/core.uem` 파일을 `ensureCoreFile`로 만들고, 고정 크기(3255B) 기록을 append하여 hash chain과 state snapshot을 계산.
4. **Hypervisor** – `packages/engine-rs/src/hypervisor.rs`의 `CoreHypervisor`는 `Ledger`와 `UemTree`를 읽어, `apply_quantum`에서 AHS 검증, 쿼터빌리티 검사, spec-triggered SCD compaction을 수행.
5. **Polyglot views** – `packages/sdk/src/index.ts`의 `sendToRustEngine`가 자동으로 엔진 바이너리 또는 `cargo run`을 spawn하여 `append_quantum`/`query_records`를 호출하고, `.core/spec` 기반 스펙을 따른 보조 가공(예: spec-driven query filters)을 가능하게 함.

## 시퀀스 다이어그램(요약)
```
[core/logger] -- logEvent --> [Firestore (optional)]
     |                                (noop on offline)
     +-- scripts/uem-log.js --> createQuantum() -> appendQuantum() -> .core/core.uem
                                     |                                             |
                                     v                                             v
                               CoreHypervisor.apply_quantum()  ---> ensures AHS/SCD
                                     |                                             |
                                     +--> query/filter -> packages/sdk/index.ts -> JS clients
```

## 검증 상태
- 실제 로그 스트림 실행(`node scripts/uem-log.js`) 중 `firebase-admin` 모듈이 없어 실패(`MODULE_NOT_FOUND`). Firestore 연동은 표준적으로 optional이며, 로그 작성을 불필요하게 만들지 않기 위해 try/catch 처리됨.
- `.core/core.uem`은 이 환경에서 0바이트 상태이므로 아직 quanta가 쓰인 기록은 없습니다. 실제로 로그를 보내려면 Firebase 모듈과 `pnpm install`을 정상적으로 구성한 후 스크립트를 다시 실행해야 합니다.
