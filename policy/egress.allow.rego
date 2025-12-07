package egress.allow

default allow = false

allow {
  input.dpop.valid == true
  input.mtls.valid == true
  input.audience == "coreeeeaaaa-fixed-audience"
  not input.jti.reused
  input.domain in data.allowed_domains
}

deny[msg] {
  not allow
  msg := "egress denied: invalid DPoP, mTLS, audience, JTI, or domain not allowed"
}