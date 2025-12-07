# LOCAL-FIRST UEM WORKFLOW

coreeeeaaaa의 기본 모드는 `storage.provider = "local-fs"`입니다. `.core/storage.toml`의 `[storage]` 항목을 바꾸면 Cloud(Firebase/Firestore, AWS, Azure 등) 백엔드로 바꿀 수 있지만, 기본적으로는 로컬 `artifacts/` 디렉터리에 로그/게이트/상태를 기록합니다.

## 1. 설치 및 빌드
```bash
pnpm install
pnpm run build --filter @coreeeeaaaa/sdk
cd packages/engine-rs
cargo build --release
cd ../../
```

## 2. 로컬 로그/게이트/상태 실행
```bash
node scripts/uem-log.js "테스트 로그"
npx coreeeeaaaa gate run G4 --input artifacts/gates/G4/input.json --schema schema/dev_gate.schema.json
npx coreeeeaaaa status report
```
- `.core/core.uem`은 UEM ledger(엔진)에서 생성/검증.
- StorageDriver가 `local-fs`이면 `artifacts/logs/YYYY-MM-DD.log`, `artifacts/gates/{gateId}/...`, `artifacts/status/{project}/current.json`을 작성.

## 3. storage.config
`.core/storage.toml`에서 provider를 바꾸면 다른 드라이버를 쓸 수 있습니다.
```toml
[storage]
provider = "local-fs"
```
`COREEEEEAAAA_STORAGE_PROVIDER` 환경변수로도 provider를 override 가능.
```

## 4. 다음 단계
- 원한다면 `storage.provider = "gcp-firestore"`로 바꾸고 `packages/sdk/src/storage/gcp-firestore.ts`를 구현.
- 로컬 드라이버는 config로 root 디렉터리를 조정할 수 있으므로, production 환경에서도 같은 코드를 유지합니다.
