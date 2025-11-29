coreeeeaaaa 자동 개발 시스템 및 규약 (Single Canon · FINAL+)

Status: IMMUTABLE_CANON (SSOT)
Canon-ID: coreeeeaaaa-ULT-FINAL+
Rule: 변경은 새 Canon-ID 문서 생성 → 포인터 CAS 갱신만 허용.

0) 핵심 원칙
- Evidence-First, Immutable-Source, Pin→Verify→Promote, Zero-Exposure, Self-Healing

1) 저장/무결성
- 불변 버킷: sha256 이름, sha3 메타, 비민감만.
- Firestore: dev_logs, dev_logs_versions, dev_logs_summaries, dev_gates, dev_status, dev_lineage, dev_reports_public, blueprints/pointers, policies/models(write-once).
- 포인터 CAS 필수, blueprint_hash/snapshot_ts 의무.

2) 권한/보안
- dev_ai 토큰 전용 접근, 역할 분리(ai-writer/reader/pointer/budget), JIT 15분.
- Egress 프록시: DPoP+mTLS+JTI 차단, 허용도메인만.

3) Evidence Gate
- 교차증거 2/3(로그/트레이스/깃), 투명로그 기록, 신뢰도/커버리지 스코어.

4) 비용/정책
- Budget fail-closed(미집계 차단), 60/80/100% 경보.
- OPA dev→staging(24h)→prod, 정책 SLO, 롤백 스위치.
- 월별 샤딩+샘플링, 주간 레드팀(증거 위조/포인터 경합/PII 등).

5) 상태머신(자동 게이트)
G0 가용성 → G1 specify → G2 clarify → G3 청사진 정합 → G4 위험/범위/커버리지 → G5 계획/비용 → G6 구현+SBOM/서명/SLSA → G7 배포(정적→테스트→카나리→SLO) → G8 RCA/개선/규범업데이트.

6) CI 핵심 단계
- lint/typecheck/tests, SBOM gen/sign, SLSA verify, 리스크 메트릭(G4) 로그화, evidence pack, status report, policy dryrun, transparency log, budget gate.

7) 최종 선언
본 Canon을 포인터로 가리킬 때 게이트/보안/관측/비용/정책이 강제 적용된다.
