package g3

test_allow {
  allow with input as {"blueprint": {"conflicts": 0, "snapshot_ts": "2023-01-01"}}
}

test_deny_conflicts {
  not allow with input as {"blueprint": {"conflicts": 1, "snapshot_ts": "2023-01-01"}}
}

test_deny_snapshot {
  not allow with input as {"blueprint": {"conflicts": 0, "snapshot_ts": ""}}
}