package g6

test_allow {
  allow with input as {
    "sbom": {"components": [{"name": "pkg1"}]},
    "signature": {"digest": "sha256:abc123...", "algorithm": "sha256"}
  }
}

test_deny_empty_digest {
  not allow with input as {
    "sbom": {"components": [{"name": "pkg1"}]},
    "signature": {"digest": "", "algorithm": "sha256"}
  }
}

test_deny_no_components {
  not allow with input as {
    "sbom": {"components": []},
    "signature": {"digest": "sha256:abc123", "algorithm": "sha256"}
  }
}