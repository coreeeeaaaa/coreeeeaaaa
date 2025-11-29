# PROCESS (Work / Release Protocol)

0. Risk/Quality Gates
- Risk/Impact/Tests 평가, 낮으면 테스트 추가.
- CI 필수: lint/static/security/unit/integration, 실패 시 차단.
- 성능 게이트: latency/memory 5% 회귀 시 배포 중단.

1. Before Work
- `git status -sb`, `git fetch`, `git diff origin/main...HEAD`.
- `DEPLOY_TRACK`에서 커밋↔배포 버전 확인.

2. During Work
- 스키마/룰/인덱스: 문서→코드→테스트.
- PII 금지, 구조화 로그/샘플링.

3. Validation
- 재생 스모크 1곡, 로그 수집 확인, 룰 로드 에러 없음.
- `ENGINE_VALIDATION_CHECKLIST` 사용, 실패 시 중단/수정.

4. Deploy
- `firebase deploy --only hosting,functions`(또는 대상 명시).
- `DEPLOY_TRACK`에 일시/커밋/버전 기록.

5. After Deploy
- 런타임 콘솔/로그 확인, 회귀 시 즉시 롤백/전진 수정.

6. Forbidden
- 문서만 보고 완료 선언, 룰 약화, PII 로그, 묵살된 실패.

7. Logging / RCA (요약)
- 참조: `docs/LOGGING_PROTOCOL.md`
- 해시 중복 방지 + 버전 업서트.
- RCA: 원격 로그 조회→소스맵 역매핑→원인·수정 보고. 데이터 부족 시 필요한 전문만 요청 + 로깅 개선 티켓.
- 치명적 오류/성능 회귀: 자동 이슈 등록(로그 링크/RCA 초안 포함).
