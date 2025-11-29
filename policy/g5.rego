package g5

default allow = false

allow {
  input.plan.logged == true
  input.plan.kpi != ""
}

deny[msg] {
  not allow
  msg := "G5 failed: work plan not validated"
}