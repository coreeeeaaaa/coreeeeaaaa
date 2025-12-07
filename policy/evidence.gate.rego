package evidence.gate

default allow = false

allow {
  count([x | x := input.evidence.logs; x == true]) + count([x | x := input.evidence.traces; x == true]) + count([x | x := input.evidence.git_pr_commits; x == true]) >= 2
}

deny[msg] {
  not allow
  msg := "insufficient evidence: need at least 2 of logs, traces, git_pr_commits"
}