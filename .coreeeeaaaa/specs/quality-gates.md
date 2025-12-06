# Feature: Quality Gates and Stop Rules

## Purpose
Define a consistent Definition of Done (DoD), stop rule, and enforcement steps for all changes.

## Requirements
- Build: `npm run build --workspaces` must pass.
- Tests: `npm test --workspaces` must pass (non-fatal Rust engine warnings allowed).
- Policy: `npm run opa-check` must pass (stub OK; replace with real opa eval when ready).
- Security (best effort): gitleaks + trivy; if missing, record skip.
- Evidence/Logging: record change/decision in artifacts (logs/lineage) and, if applicable, `.serena/memories` or `.coreeeeaaaa/memory`.
- Regression guard: avoid significant perf/coverage regression; if measured, keep touched-code coverage ~70%+.

## Stop Rule
- If all DoD gates pass and no new requirements/regressions exist, stop further “improvement” work.
- If any gate fails, continue improving until gates pass.

## Enforcement Hooks
- Taskfile `quality`: build → opa → lint → test → security. Fails build if any step fails.
- OPA policy `policy/gate.rego`: allow only when required metrics are true; optional metrics treated as pass if absent.
- Environment switch (future): `DO_NOT_IMPROVE=true` can be used to disallow further refactors beyond DoD.

## Notes
- RAG/Serena use is optional; when used, cite sources and log outputs.
- Keep changes minimal to meet gates; avoid infinite refinement.
