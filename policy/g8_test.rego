package g8

test_allow {
  allow with input as {"rca": {"completed": true, "actions": 1}}
}

test_deny_completed {
  not allow with input as {"rca": {"completed": false, "actions": 1}}
}

test_deny_actions {
  not allow with input as {"rca": {"completed": true, "actions": 0}}
}