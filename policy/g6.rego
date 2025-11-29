package g6

default allow = false

allow {
  input.sbom.generated == true
  input.signature.verified == true
}

deny[msg] {
  not allow
  msg := "G6 failed: supply chain not verified"
}