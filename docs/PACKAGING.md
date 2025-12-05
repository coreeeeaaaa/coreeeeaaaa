# PACKAGING & DEPLOYMENT

## 1. 의존성 설치
1. `pnpm` 설치(Workspaces 구성 필요).
2. `pnpm install` 실행
   - 현재 환경에서는 `/Users/a/Documents/coreeeeaaaa/_tmp_*` 생성 때 `EPERM` 오류가 발생하므로, `node_modules`와 캐시 디렉터리에 쓰기 권한이 있는 환경에서 실행해야 합니다.
3. Rust toolchain 설치 (`rustup`, `cargo`).
   - `cargo test` 실행 시 crates.io index를 fetch하려면 `~/.cargo` 디렉터리에 접근 가능한 상태여야 합니다.

## 2. 초기화/빌드
- `pnpm build` 또는 `pnpm run build --filter @coreeeeaaaa/cli`로 TS 빌드.
- `cargo build --release --manifest-path packages/engine-rs/Cargo.toml`로 Rust 엔진 빌드.

## 3. autonomous/CLI 실행
- `node scripts/uem-log.js "message"` 등으로 로그를 들어 `.core/core.uem`을 append.
- `node scripts/uem-dump.js` 또는 `packages/sdk`의 `inspectUem`으로 기록을 조회.
- `coreeeeaaaa` CLI는 현재 `commands/` 폴더에 gate/evidence/autonomous/pointer 구성을 가지고 있으며, `scripts/autonomous-loop.js`를 통해 autonomous workflow를 실행할 수 있습니다.

## 4. 데이터 및 리포트 생성 경로
|항목|생성 위치|설명|
|---|---|---|
|UEM 파일|`.core/core.uem`|Hypervisor가 append하는 ledger. `core/uem/ledger.js` 및 Rust `Ledger`가 관리.
|세부 spec|`.core/spec/*.toml`|Jiwol/GGGM/AHS/SCD/UEM 파라미터가 정의된 단일 소스.
|로그/문서|`docs/`|현재 상태 및 패키징/pipe line 문서.
|SDK artifacts|`packages/sdk`|TypeScript/CLI entrypoint.
|Rust 바이너리|`packages/engine-rs/target/release/core-uem-engine`|Native 엔진, `packages/engine-rs/node/index.js`에서 로딩.

이제 리포를 클론하고 위 절차를 따르면 coreeeeaaaa UEM 엔진과 CLI/SDK를 로컬에서 구동할 수 있습니다. `pnpm install`/`cargo test` 실패는 환경 권한 이슈이므로, CI나 로컬에서 충분한 권한으로 다시 실행해야 합니다.
