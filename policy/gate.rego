package gate

default allow = false

# Helper: treat missing or null as true (optional check)
optional_true(x) {
  not x
}
optional_true(x) {
  x == true
}

allow {
  input.gate_id != ""
  input.metrics.build_pass == true
  input.metrics.tests_pass == true
  optional_true(input.metrics.opa_pass)
  optional_true(input.metrics.security_pass)
  # No regressions if provided
  not input.metrics.performance_regression
  not input.metrics.coverage_regression
  # No explicit deny
  not input.deny
}
