package gate

default allow = false

# Minimal example: deny if missing gate_id or metrics.ok == false
allow {
  input.gate_id != ""
  not input.deny
  input.metrics.ok == true
}
