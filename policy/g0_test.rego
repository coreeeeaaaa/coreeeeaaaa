package g0

test_allow {
  allow with input as {"metrics": {"ok": true}}
}

test_deny {
  not allow with input as {"metrics": {"ok": false}}
}