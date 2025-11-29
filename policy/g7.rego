package g7

default allow = false

allow {
  input.canary.ok == true
  input.slo.p95_ms <= 150
  input.error_rate <= 0.01
}

deny[msg] {
  not allow
  msg := "G7 failed: deployment SLO not met"
}