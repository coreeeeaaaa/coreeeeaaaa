#!/usr/bin/env bash
set -euo pipefail

if command -v opa >/dev/null 2>&1; then
  exit 0
fi

curl -sL -o /tmp/opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
chmod +x /tmp/opa
sudo mv /tmp/opa /usr/local/bin/opa
opa version
