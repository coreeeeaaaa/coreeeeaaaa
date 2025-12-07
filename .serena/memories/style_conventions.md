# Style and conventions
- Modules: packages use ESM (`type: module`), core/ and functions/ use CommonJS; import style should match surrounding file.
- Node version: >=18. Avoid non-portable APIs. CLI uses async/await with try/catch and sets `process.exitCode` on errors.
- CLI pattern: Commander commands; JSON parsing via fs/promises; errors reported with concise messages; prefer pure helpers from sdk.
- SDK patterns: small stateless helpers (hashObject, anonymizeContent), deterministic JSON.stringify with 2-space indent; guard optional inputs.
- File I/O: ensure directories before writing (mkdir recursive), use path.join; log files are JSONL under artifacts/.
- Tests: node:test + node:assert; temp files via os.tmpdir; deterministic small helpers; avoid global state.
- Naming: snake_case for JSON keys in ledger/pointer records; camelCase in JS functions; coord/quantum use short fields (t,x,a...).
- Logging: use ISO and compact timestamps; redact secrets via anonymizeContent before persistence.
- Mixed ESM/CommonJS: when requiring CommonJS from ESM, use createRequire; keep consistent pattern already used in autonomous module.
