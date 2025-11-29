package g6

test_allow {
  allow with input as {"sbom": {"generated": true}, "signature": {"verified": true}}
}

test_deny_sbom {
  not allow with input as {"sbom": {"generated": false}, "signature": {"verified": true}}
}

test_deny_signature {
  not allow with input as {"sbom": {"generated": true}, "signature": {"verified": false}}
}