# Logging and trace

- Logs are written as JSONL under `artifacts/logs/YYYY-MM-DD.log`.
- Each entry includes ISO timestamp plus fields you provide.

## CLI usage

Append a log entry:
```bash
npx coreeeeaaaa log --add \
  --type instruction \
  --actor architect \
  --context G1 \
  --text "spec review started" \
  --data input.json
```

Tail recent entries:
```bash
npx coreeeeaaaa log --tail --lines 20
```

Fields recorded:
- `ts` (ISO8601)
- `type` (instruction/action/result/etc.)
- `actor` (user/ai/system)
- `context` (gate/task)
- `text` (free text)
- `data` (optional object from `--data` JSON)

Notes:
- Logs stay local by default (under `artifacts/logs`).
- Combine with `--project/--redact` options in `gate` to anonymize inputs before external calls.
