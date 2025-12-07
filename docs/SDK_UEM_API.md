# SDK / CLI UEM API

## 패키지 목록
|패키지|역할|주요 엔진 호출|
|---|---|---|
|`@coreeeeaaaa/sdk`|Polyglot SDK (TypeScript)|`CoreSDK.logLineage`, `appendEvidence`, `runGate`, `appendEvidence` 내부에서 `packages/engine-rs`의 `append_quantum` 호출| 
|`@coreeeeaaaa/cli`|CLI entrypoint|`core/uem/engine.js` 또는 `packages/engine-rs/node/index.js`를 통해 `append_quantum`, `read_all`, `query_records` 호출
|`packages/engine-rs/node`|Rust engine Node binding|`append_quantum`, `open_ledger`, `query_records`, `scd_compact_handle`, `validate_chain_handle`|

## 주요 API
### TypeScript (CoreSDK)
```ts
import { CoreSDK } from '@coreeeeaaaa/sdk';
const sdk = new CoreSDK();

await sdk.appendEvidence({
  type: 'artifact',
  path: 'artifacts/evidence/sample.txt'
});

const quanta = await sdk.inspectUem({ limit: 10 });
console.table(quanta.map(q => ({
  t: q.coord.t,
  project: q.coord.j,
  step: q.coord.k,
  layer: q.coord.p,
  thickness: q.thickness.re.toFixed(2)
})));
```
- `CoreSDK.logLineage`, `runGate`, `appendEvidence` 등은 최종적으로 `append_quantum`을 호출하여 `.core/core.uem`에 기록.
- `inspectUem`/`query_records`를 통해 `Coord9` filter(같은 layer/project/step)로 `UemTree`에서 항목을 조회.

### CLI 예제
```bash
# 개발 로그를 UEM에 기록
node scripts/uem-log.js "mission complete"

# Hypervisor가 만든 기록을 덤프
node scripts/uem-dump.js --limit 5
```
- `coreeeeaaaa` CLI가 현재 `uem` 하위 명령을 제공하지 않으므로, `scripts/*` 도구를 통해 엔진을 직접 호출.
- `packages/engine-rs/node/index.js`가 로컬 바이너리(`target/release/core-uem-engine`)를 모듈화하여 JS에서 불러오는 역할.

## 향후 CLI UEM 명령 예시
1. `coreeeeaaaa uem:append --project 0 --step 1 --text "log"`
2. `coreeeeaaaa uem:query --project 0 --layer 1 --format table`
(현재는 `scripts/` 도구를 사용하고 있으며, 향후 CLI 명령으로 추상화하면 좋습니다.)
