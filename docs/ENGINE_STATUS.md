# ENGINE STATUS

## 모듈 구조
- `packages/engine-rs/src/spec.rs`: `.core/spec/*.toml`로부터 Jiwol/GGGM/AHS/SCD/UEM 파라미터를 파싱하여 공유 스펙 객체(`SPEC`)를 만듦.
- `packages/engine-rs/src/jiwol_id.rs`: 스펙의 `jiwo_layout()`을 사용해 `Coord9` ↔ `JiwolId`를 bijection으로 인코딩/디코딩.
- `packages/engine-rs/src/gggm.rs`: GGGM 합성값(`GggmValue`)과 `GggmOps` 트레잇(merge/parallel/project/measure_tau)을 구현, τ_margin을 증가시키며 AHS를 만족하게 설계.
- `packages/engine-rs/src/ledger.rs`, `uem_tree.rs`: `.core/core.uem` 레저를 append-only로 다루고 해시 체인/상태 스냅샷을 검증하며, UEM-tree index를 구축.
- `packages/engine-rs/src/scd.rs`, `ahs.rs`: SCD 압축 정책 및 AHS 거리 기준을 강제.
- `packages/engine-rs/src/hypervisor.rs`: `CoreHypervisor`가 ledger+tree를 묶고, AHS/SCD 조건을 만족시키며 spec-driven append/query 수단을 제공.
- `packages/engine-rs/src/lib.rs`: N-API 바인딩을 통해 JS/TS 폴리글럿이 사용할 수 있는 `append_quantum`, `open_ledger`, `scd_compact_handle`, `query_records` 등을 노출.

## 주요 타입
- `UemQuantum`: `id`, `Coord9`, `payload_hash`, `semantic_vec`, `prev_hash`, `state_snapshot`, `thickness`(Complex32)를 포함한 고정 크기(3255B) 구조.
- `Coord9`: T/X/A/W/J/K/P/M/C 좌표; spec-driven `JiwolId` 인코딩/디코딩 지원.
- `JiwolId`: 20개의 `u16`로 GG-base 11172 시스템 그리드를 표현.
- `CoreHypervisor`: `Ledger` + `UemTree`를 감싸며 `apply_quantum`, `query`, `compact_if_needed`을 제공.

## spec 파일
- `.core/spec/jiwol.toml`, `gggm.toml`, `ahs.toml`, `scd.toml`, `uem.toml`을 `spec.rs`가 로드하고, 엔진 전체가 이 객체를 공유하여 파라미터를 결정합니다.
- 기본값: Jiwol은 `[6,4,4,1,1,1,1,1,1]`, GGGM은 merge/parallel/project/tau 명세, AHS α=0.8, SCD trigger=200MB, UEM record hash=blake3 등.

## 테스트 인바리언트
|파일|검증하는 인바리언트|실행 상태|비고|
|---|---|---|---|
|`packages/engine-rs/tests/engine_tests.rs`|레저 체인 무결성(Genesis prev_hash, hash chain), AHS 위반 감지, query 필터, SCD 요약·compaction|미실행 (cargo/registry 접근 실패)|Crate fetch 권한 필요; `cargo test` 시도 중 crates.io index 접근 권한 거부(FETCH_HEAD).|
|`packages/engine-rs/tests/jiwol_roundtrip.rs`|`Coord9 ↔ JiwolId` 상호 변환 보정|미실행 (cargo 실패)|동일 이유.
|`packages/engine-rs/tests/gggm_ops.rs`|GGGM merge/parallel 연산의 비멱등성과 비가환성, 여백 증가|미실행 (cargo 실패)|동일.
|`packages/engine-rs/tests/hypervisor.rs`|Hypervisor append/query/snapshot 흐름, SCD 트리거 입증|미실행 (cargo 실패)|동일.

> 참고: `cargo test --all --all-features`는 crates.io index fetch 시 `EPERM: cannot open .../.git/FETCH_HEAD` 오류로 실패했습니다. 로컬 Rust toolchain 또는 `~/.cargo` 디렉토리 접근 권한을 확보한 후 재실행해야 합니다.
