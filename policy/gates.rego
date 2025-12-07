package gates

default allow = false

# G0: basic health
allow {
  input.gate_id == "G0"
  input.metrics.ok == true
}

# G1: spec ready
allow {
  input.gate_id == "G1"
  input.spec.ready == true
  input.spec.tests >= 1
}

# G2: clarify done
allow {
  input.gate_id == "G2"
  input.spec.clarified == true
  input.spec.open_questions == 0
}

# G3: blueprint conflict-free
allow {
  input.gate_id == "G3"
  input.blueprint.conflicts == 0
  input.blueprint.snapshot_ts != ""
}

# G4: risk/coverage
allow {
  input.gate_id == "G4"
  input.coverage.lines >= 85
  input.coverage.branches >= 75
  input.lint.ok == true
  input.typecheck.ok == true
  input.security.ok == true
}

# G5: plan logged
allow {
  input.gate_id == "G5"
  input.plan.logged == true
  input.plan.kpi != ""
}

# G6: supply chain (SBOM + signature optional)
allow {
  input.gate_id == "G6"
  input.sbom.generated == true
  input.signature.verified == true
}

# G7: deploy SLO + canary
allow {
  input.gate_id == "G7"
  input.canary.ok == true
  input.slo.p95_ms <= 150
  input.error_rate <= 0.01
}

# G8: RCA done
allow {
  input.gate_id == "G8"
  input.rca.completed == true
  input.rca.actions >= 1
}

deny[msg] {
  not allow
  msg := sprintf("gate %v denied", [input.gate_id])
}
