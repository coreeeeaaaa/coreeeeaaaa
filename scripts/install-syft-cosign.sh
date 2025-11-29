#!/usr/bin/env bash
set -euo pipefail

if ! command -v syft >/dev/null 2>&1; then
  curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
fi
if ! command -v cosign >/dev/null 2>&1; then
  curl -sSfL https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64 > /usr/local/bin/cosign
  chmod +x /usr/local/bin/cosign
fi
syft version
cosign version
