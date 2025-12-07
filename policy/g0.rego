package g0

default allow = false

# 필수 컴포넌트
required_components := ["firestore", "storage", "opa"]

# 모든 컴포넌트 헬스체크
components_healthy {
  every component in required_components {
    input.metrics[component].status == "healthy"
  }
}

allow {
  components_healthy
}

deny[msg] {
  not components_healthy
  failed := [c | 
    c := required_components[_]
    input.metrics[c].status != "healthy"
  ]
  msg := sprintf("G0 failed: unhealthy components: %v", [failed])
}