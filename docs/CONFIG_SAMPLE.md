# coreeeeaaaa local config (example)

```json
{
  "project": {
    "name": "my-private-project",
    "anonymize": true
  },
  "privacy": {
    "redact_patterns": ["my-private-project", "api\\.example\\.com", "[A-Z0-9_]{12,}"],
    "never_upload": [".env", "secrets/", "src/proprietary/"]
  },
  "gates": {
    "enabled": ["G0", "G1", "G4", "G6", "G7", "G8"],
    "local_only": true,
    "evidence_storage": "local"
  }
}
```

Usage: place as `.coreeeeaaaa/config.json` in a private repo; keep it out of git. The CLI `gate` command can apply anonymization with `--project` and `--redact` patterns before any external call.
