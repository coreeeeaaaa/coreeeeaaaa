package g1

default allow = false

allow {
  input.spec.ready == true
  input.spec.tests >= 1
}

deny[msg] {
  not allow
  msg := "G1 failed: specification not ready"
}