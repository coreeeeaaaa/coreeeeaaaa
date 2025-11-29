package g7

test_allow {
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