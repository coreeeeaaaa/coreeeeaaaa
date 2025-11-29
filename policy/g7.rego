package g7

default allow = false

# 기본 임계값
default_p95 := 150
default_error_rate := 0.01

# 프로젝트 타입별 임계값
thresholds := {
  "api": {"p95": 150, "error_rate": 0.01},
  "batch": {"p95": 5000, "error_rate": 0.05},
  "ai_inference": {"p95": 10000, "error_rate": 0.02}
}

# 실제 임계값 계산
actual_p95 := t {
  t := thresholds[input.project_type].p95
} else := default_p95

actual_error_rate := e {
  e := thresholds[input.project_type].error_rate
} else := default_error_rate

allow {
  input.canary.ok == true
  input.slo.p95_ms <= actual_p95
  input.error_rate <= actual_error_rate
}

deny[msg] {
  input.slo.p95_ms > actual_p95
  msg := sprintf("G7 failed: p95 %vms exceeds %vms", [input.slo.p95_ms, actual_p95])
}