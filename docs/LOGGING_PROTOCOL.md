# Firebase Dev AI Logging Protocol

목적: 개발 AI 로그/결정/변경 이력을 구조화·버전관리·보안 제어하여 중복/산발 기록을 방지하고 원격 진단을 자동화.

## 저장소 구조 (Firestore)
- `/dev_logs/{project}/{agent}/{ts}`: 상세 실행로그(90d TTL)
- `/dev_logs_versions/{project}/{record_type}/{hash}`: 해시 기반 업서트, 버전 배열
- `/dev_logs_summaries/{project}/{date}`: 일/주 요약(상세 TTL 후 유지)

## 템플릿 (요약)
```
{
  "record_type": "code_change|doc_update|decision_log",
  "version": "auto_increment",
  "content_hash": "md5",
  "diff_from_previous": "git_diff_format",
  "decision_rationale": "data_based_reason",
  "test_results": {"lint":true,"unit":true,"integration":true,"perf_delta":0.0},
  "auto_publish": true
}
```

## 중복/버전
- 해시로 중복 감지 → 트랜잭션 업서트(versions[], latest_version).
- >1MB 본문은 링크로 대체. TTL 90d 후 요약만 유지.

## 보안
- `request.auth.token.dev_ai == true` 만 read/write. 일반 사용자 차단.
- payload 필수 필드 검증, 크기 제한.

## RCA 절차 (4단계)
1) 로그 조회(Firestore error_logs/dev_logs)
2) 데이터 기반 RCA + 소스맵 역매핑(80% 확신 목표)
3) 원인+수정 코드 보고
4) 부족 시 필요한 전문만 요청 + 로깅 개선 티켓 생성

## 폭증 방지
- 일일 10k 제한, 초과 시 샘플링
- 중복 에러: 1건 상세+카운트
- 보관 90일: 상세 삭제, 요약만 유지
