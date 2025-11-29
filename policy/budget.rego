package budget

default allow = false

allow {
  input.cost.collected == true
  input.cost.total <= input.cost.budget
}

deny[msg] {
  not input.cost.collected
  msg := "no cost signal"
}

deny[msg] {
  input.cost.total > input.cost.budget
  msg := sprintf("cost %v exceeds budget %v", [input.cost.total, input.cost.budget])
}
