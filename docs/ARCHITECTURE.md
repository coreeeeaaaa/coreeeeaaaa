# Architecture Overview

## Firestore Collections Structure

### dev_gates
- Path: `/dev_gates/{projectId}/{yyyymm}/{gateId}`
- Purpose: Stores gate evaluation results with monthly sharding.
- Rules: Write-once (create only), accessible by DevAI.
- Fields: `gate_id`, `projectId`, `yyyymm`, `timestamp`, `allow`, `deny`, `metrics`, etc.

### dev_lineage
- Path: `/dev_lineage/{projectId}/{lineageId}`
- Purpose: Immutable lineage records for evidence tracking.
- Rules: Write-once (create only), accessible by DevAI.
- Fields: `projectId`, `lineageId`, `evidence`, `pointers`, etc.

### dev_logs
- Path: `/dev_logs/{projectId}/{logId}`
- Purpose: Development logs.
- Rules: Read/write for DevAI.
- Fields: `projectId`, `logId`, `timestamp`, `message`, etc.

### dev_logs_summaries
- Path: `/dev_logs_summaries/{projectId}/{summaryId}`
- Purpose: Summarized logs.
- Rules: Read/write for DevAI.
- Fields: `projectId`, `summaryId`, `period`, `summary`, etc.

### dev_status
- Path: `/dev_status/{projectId}/current` and `/dev_status/{projectId}/{statusId}`
- Purpose: Current and historical status.
- Rules: Read/write for DevAI, no delete on `/current`.
- Fields: `projectId`, `statusId`, `timestamp`, `state`, etc.

### dev_reports_public
- Path: `/dev_reports_public/{projectId}/{reportId}`
- Purpose: Public reports.
- Rules: Read-only for PO (Product Owner).
- Fields: `projectId`, `reportId`, `timestamp`, `content`, etc.

### blueprints
- Path: `/blueprints/{projectId}/{blueprintId}`
- Purpose: Blueprint documents.
- Rules: Read/write for DevAI.
- Fields: `projectId`, `blueprintId`, `version`, `content`, etc.

### blueprints_latest
- Path: `/blueprints_latest/{projectId}`
- Purpose: Latest blueprint pointers.
- Rules: Read/write for DevAI.
- Fields: `projectId`, `latest_blueprint_id`, `timestamp`, etc.

## Indexes
- Defined in `firestore.indexes.json` for efficient queries on `dev_gates` by `projectId`, `yyyymm`, `gate_id`, and `timestamp`.

## Security
- All collections enforce authentication via `isDevAI()` or `isPO()`.
- Write-once collections prevent modifications after creation.
- Public reports are restricted to PO read access.