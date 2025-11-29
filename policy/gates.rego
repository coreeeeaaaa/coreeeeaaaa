package gates

default allow = false

allow {
  input.gate_id == "G0"
  input.metrics.ok == true
}

allow {
  input.gate_id == "G1"
  input.spec.ready == true
  input.spec.tests >= 1
}

allow {
  input.gate_id == "G4"
  input.coverage.lines >= 85
  input.coverage.branches >= 75
  input.lint.ok == true
  input.typecheck.ok == true
}

allow {
  input.gate_id == "G6"
  input.sbom.generated == true
  input.signature.verified == true
}

allow {
  input.gate_id == "G7"
  input.canary.ok == true
  input.slo.p95_ms <= 150
  input.error_rate <= 0.01
}

allow {
  input.gate_id == "G8"
  input.rca.completed == true
  input.rca.actions >= 1
}

deny[msg] {
  not allow
  msg := sprintf("gate %v denied", [input.gate_id])
}
