package g8

default allow = false

allow {
  input.rca.completed == true
  input.rca.actions >= 1
}

deny[msg] {
  not allow
  msg := "G8 failed: RCA not complete"
}