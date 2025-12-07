# GCS Immutable Bucket Setup

## Overview
This document describes setting up an immutable GCS bucket for coreeeeaaaa, enforcing Zero-Exposure and Immutable-Source principles.

## Configuration
- **Versioning**: Enabled to track object versions.
- **Retention Policy**: 1-year retention period to prevent deletion.
- **Warnings**: Script outputs warnings against storing PII or secrets.

## Usage
Run the setup script:
```bash
ts-node scripts/setup-immutable-bucket.ts <bucket-name>
```

## Terraform Example (Optional)
```hcl
resource "google_storage_bucket" "immutable" {
  name          = "coreeeeaaaa-immutable"
  location      = "US"
  versioning {
    enabled = true
  }
  retention_policy {
    retention_period = 31536000  # 1 year
  }
}
```

## Security Notes
- Only store immutable artifacts (e.g., logs, blueprints).
- Monitor for PII/secrets via audits.