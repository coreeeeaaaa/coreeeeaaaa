package g3

default allow = false

allow {
  input.blueprint.conflicts == 0
  input.blueprint.snapshot_ts != ""
}

deny[msg] {
  not allow
  msg := "G3 failed: blueprint conflicts detected"
}