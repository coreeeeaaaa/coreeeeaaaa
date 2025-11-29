package g0

test_allow {
  allow with input as {"metrics": {"firestore": {"status": "healthy"}, "storage": {"status": "healthy"}, "opa": {"status": "healthy"}}}
}

test_deny_firestore {
  not allow with input as {"metrics": {"firestore": {"status": "unhealthy"}, "storage": {"status": "healthy"}, "opa": {"status": "healthy"}}}
}

test_deny_storage {
  not allow with input as {"metrics": {"firestore": {"status": "healthy"}, "storage": {"status": "unhealthy"}, "opa": {"status": "healthy"}}}
}

test_deny_opa {
  not allow with input as {"metrics": {"firestore": {"status": "healthy"}, "storage": {"status": "healthy"}, "opa": {"status": "unhealthy"}}}
}