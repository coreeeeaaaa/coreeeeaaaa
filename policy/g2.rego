package g2

default allow = false

allow {
  input.spec.clarified == true
  input.spec.open_questions == 0
}

deny[msg] {
  not allow
  msg := "G2 failed: ambiguities not resolved"
}