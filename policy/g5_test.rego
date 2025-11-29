package g5

test_allow {
  allow with input as {"plan": {"logged": true, "kpi": "performance"}}
}

test_deny_logged {
  not allow with input as {"plan": {"logged": false, "kpi": "performance"}}
}

test_deny_kpi {
  not allow with input as {"plan": {"logged": true, "kpi": ""}}
}