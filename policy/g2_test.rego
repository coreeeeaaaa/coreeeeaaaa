package g2

test_allow {
  allow with input as {"spec": {"clarified": true, "open_questions": 0}}
}

test_deny_clarified {
  not allow with input as {"spec": {"clarified": false, "open_questions": 0}}
}

test_deny_questions {
  not allow with input as {"spec": {"clarified": true, "open_questions": 1}}
}