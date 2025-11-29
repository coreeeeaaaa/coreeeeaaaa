package g0

default allow = false

allow {
  input.metrics.ok == true
}

deny[msg] {
  not allow
  msg := "G0 failed: infrastructure not healthy"
}