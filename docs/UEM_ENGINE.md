# UEM Engine Overview

## Unified Evidence Model (UEM)
UEM aggregates evidence from logs, traces, and Git (PR/commits) to enforce Evidence-First principle. Requires 2/3 evidence sources for gate passage.

## Immutable Conditions
- Objects stored with SHA256-based names.
- Metadata includes SHA3 hashes.
- Only non-sensitive data allowed; PII/secrets trigger alerts.

## Self-Contained Data (SCD)
SCD ensures data is self-verifying with embedded proofs. Used in ledger and quantum modules for autonomous validation.

## Autonomous Healing System (AHS)
AHS monitors and heals system state via quantum corrections and ledger reconciliation. Triggers on evidence mismatches or budget overruns.

## Engine Components
- `engine.js`: Core UEM processing.
- `ledger.js`: Immutable ledger for evidence.
- `quantum.js`: Quantum-inspired healing logic.
- `jiwol.js`: Evidence aggregation.
- `coord.js`: Coordination layer.

## Integration
UEM integrates with OPA policies and Firestore for gate enforcement, ensuring Pin→Verify→Promote flow.