package g7

test_allow_api {
  allow with input as {"canary": {"ok": true}, "slo": {"p95_ms": 100}, "error_rate": 0.005, "project_type": "api"}
}

test_allow_batch {
  allow with input as {"canary": {"ok": true}, "slo": {"p95_ms": 4000}, "error_rate": 0.03, "project_type": "batch"}
}

test_allow_ai_inference {
  allow with input as {"canary": {"ok": true}, "slo": {"p95_ms": 8000}, "error_rate": 0.015, "project_type": "ai_inference"}
}

test_allow_default {
  allow with input as {"canary": {"ok": true}, "slo": {"p95_ms": 100}, "error_rate": 0.005}
}

test_deny_canary {
  not allow with input as {"canary": {"ok": false}, "slo": {"p95_ms": 100}, "error_rate": 0.005}
}

test_deny_slo {
  not allow with input as {"canary": {"ok": true}, "slo": {"p95_ms": 200}, "error_rate": 0.005}
}

test_deny_error {
  not allow with input as {"canary": {"ok": true}, "slo": {"p95_ms": 100}, "error_rate": 0.02}
}