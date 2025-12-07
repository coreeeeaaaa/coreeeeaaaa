# UEM VERTICAL SLICE

## 대상으로 삼은 로그 스트림
- `scripts/uem-log.js`: 개발 서버 로그를 `core/logger.logEvent`로 Firebase에 보내고, 동일 스크립트에서 `.core/core.uem`에 직접 `UemQuantum`을 append.
- 예상 `Coord9`: `t=Date.now()`, `x=0`, `j=0`, `k=0`, `p=1`(UEM layer), `m=0`, `c=0` (실제 스트림마다 값은 동적으로 조정).
- Jiwol ID 매핑: 이 `Coord9` 구조를 spec-driven `jiwol_layout()`으로 번역하여 GG base 11,172 자리수 20개로 인코딩.

## 실행 전/후 상태
- 실행 전 `.core/core.uem`: `size=0`, `count=0` (파일 존재하지만 비어 있음).
- 실행 시도: `node scripts/uem-log.js "Test vertical slice"` → `core/logger`에서 `firebase-admin` 모듈을 찾을 수 없어 `MODULE_NOT_FOUND` 발생, UEM append도 실행되지 않음.
- 실행 후 `.core/core.uem`: 변화 없음 (size=0, count=0).

## 쿼리 헬퍼 (예시)
```js
const { readAll } = require('../core/uem/ledger');
const { decodeQuantum } = require('../core/uem/quantum');

const quanta = readAll();
console.log(`quanta=${quanta.length}`);
quanta.slice(-5).forEach((buf, i) => {
  const q = decodeQuantum(buf);
  console.log(i, q.coord.t, q.coord.j, q.coord.k, q.thickness);
});
```
- 위 도구로 project/j/step/k/layer p 필터를 추가하면 `Coord9` 기준 `query_records`와 동일한 부분 집합을 뽑을 수 있습니다.

## 확인된 이슈/TODO
1. `firebase-admin` 미설치로 로그 스크립트가 오류 발생 → `pnpm install firebase-admin` 또는 stub module 설치가 필요.
2. `pnpm install` 자체가 `EPERM` 오류로 실패하여 CLI/SDK 테스트가 불가 → 권한이 허용된 환경에서 `pnpm install` 이후 `pnpm test` 실행.
3. `.core/core.uem`에 실제 쿼덤을 쓰려면 상기 문제 해결 후 `node scripts/uem-log.js` 재실행 및 로그/Hypervisor 쿼리 확인 필요.
