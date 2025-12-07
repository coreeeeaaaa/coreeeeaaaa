package g1

test_allow {
  allow with input as {"spec": {"ready": true, "tests": 1}}
}

test_deny_ready {
  not allow with input as {"spec": {"ready": false, "tests": 1}}
}

test_deny_tests {
  not allow with input as {"spec": {"ready": true, "tests": 0}}
}