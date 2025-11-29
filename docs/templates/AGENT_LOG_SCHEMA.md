# AI Log Schema (Structured Output)

필수 JSON 필드:
```
{
  "record_type": "code_change|doc_update|decision_log",
  "version": <number>,
  "content_hash": "md5",
  "diff_from_previous": "git_diff_format",
  "decision_rationale": "data_based_reason",
  "test_results": {"lint":true,"unit":true,"integration":true,"perf_delta":0.0},
  "auto_publish": true,
  "timestamp": "ISO8601",
  "session": "session_<epoch>_<rand>",
  "agent_id": "<id>",
  "project_id": "<id>"
}
```

옵션:
- `links`: PR/commit/deploy/log URLs
- `metrics`: { latency_ms, memory_mb, regression_pct }
- `notes`: free text (≤1KB)
