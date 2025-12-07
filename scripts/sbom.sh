#!/usr/bin/env bash
set -euo pipefail

ROOT=${1:-.}
OUT=${OUT:-artifacts/evidence/sbom.json}

mkdir -p "$(dirname "$OUT")"

if ! command -v syft >/dev/null 2>&1; then
  echo "syft not found; installing..." >&2
  DIR="$(cd "$(dirname "$0")" && pwd)"
  "$DIR/install-syft-cosign.sh"
fi

syft "$ROOT" -o json > "$OUT"
echo "sbom written to $OUT"

# optional signing if COSIGN_KEY present
if [ -n "${COSIGN_KEY:-}" ]; then
  cosign sign-blob --key "$COSIGN_KEY" "$OUT" --output-signature "$OUT.sig"
  echo "sbom signed -> $OUT.sig"
fi
