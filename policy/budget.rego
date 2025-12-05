package budget.gate

default allow = false

allow {
  input.cost.collected == true
  input.cost.total <= input.cost.budget
}

deny[msg] {
  not input.cost.collected
  msg := "Budget signal missing (fail-closed)"
}

deny[msg] {
  input.cost.total > input.cost.budget
  msg := sprintf("Budget exceeded: %.2f > %.2f", [input.cost.total, input.cost.budget])
}
