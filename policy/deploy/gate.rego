package deploy.gate

default allow = false

allow {
  input.gate_id != ""
  input.metrics.ok == true
}

deny[msg] {
  not allow
  msg := "gate denied: missing metrics.ok"
}
