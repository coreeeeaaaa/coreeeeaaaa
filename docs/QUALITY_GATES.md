# Quality Gates & Stop Criteria

This project uses a “stop when done, improve when failing” rule set. Use these gates for every change (manual or agent-driven).

## Definition of Done (DoD)
- Build: `npm run build --workspaces` must pass.
- Tests: `npm test --workspaces` must pass. Warnings about missing Rust engine are acceptable; failures are not.
- Policy: `npm run opa-check` (run if available; if stubbed, note the status).
- Security (best effort): gitleaks + trivy; if tools are missing, note the skip.
- Logging/Evidence: record what changed and why in artifacts (logs/lineage) and, if relevant, `.serena/memories` / `.coreeeeaaaa/memory`.
- Coverage/Perf (lightweight guard): avoid significant regression; if measuring, keep coverage on touched code ~70%+ and avoid material perf slowdowns.

## Stop Rule
- If all DoD gates pass and no regressions or new requirements exist, stop further “improvement” work. No churn/refactoring for its own sake.
- If any gate fails or a regression/new requirement appears, keep improving until gates pass.

## Workflow (suggested)
1) Run: build → test → opa-check → security (best effort).
2) If all green: log the result and stop (unless new scope is requested).
3) If any red: fix only what is needed to pass gates; re-run.

## Notes
- Full RAG/Serena usage is optional; when used, cite sources and record outputs.
- Keep changes minimal to meet the gates; avoid infinite refinement loops. 
