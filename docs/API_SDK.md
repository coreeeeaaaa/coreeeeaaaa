# Coreeeeaaaa SDK API Reference

The `@coreeeeaaaa/sdk` package provides the programmatic interface for the Coreeeeaaaa automation framework.

## Installation

```bash
npm install @coreeeeaaaa/sdk
```

## Usage

```typescript
import { CoreSDK } from '@coreeeeaaaa/sdk';

const sdk = new CoreSDK({
  projectId: 'my-project',
  rootDir: process.cwd()
});

await sdk.init();
```

## Class: CoreSDK

### `constructor(config: CoreConfig)`
Creates a new SDK instance.

- `config.projectId` (string): Project identifier.
- `config.rootDir` (string): Root directory of the project (default: `process.cwd()`).
- `config.artifactsDir` (string): Directory for artifacts (default: `rootDir/artifacts`).

### `init(): Promise<void>`
Initializes the environment, ensuring all necessary artifact directories exist (`gates`, `evidence`, `logs`, etc.).

### `runGate(gateId: GateId, input: GateInput, schemaPath?: string): Promise<GateResult>`
Runs a gate validation process.

- `gateId`: One of `G0`..`G8`.
- `input`: JSON object containing input data for the gate.
- `schemaPath`: Optional path to a JSON schema file to validate `input` against.
- **Returns**: `GateResult` object containing `ok` (boolean), `inputHash`, `evaluatedAt`, and errors.
- **Side Effects**: Writes result to `artifacts/gates/{gateId}/{timestamp}.json` and logs the event.

### `appendEvidence(evidence: EvidencePayload): Promise<void>`
Collects and logs evidence.

- `evidence.type`: Type of evidence (e.g., 'artifact', 'log').
- `evidence.path`: Path to the evidence file.
- `evidence.content`: (Optional) Direct content string/buffer.
- **Side Effects**: Appends entry to `artifacts/evidence/manifest.jsonl` and logs to UEM.

### `updatePointerCAS(hash: string, snapshotTs: string, ifMatch?: string): Promise<void>`
Updates the project pointer using Optimistic Concurrency Control (CAS).

- `hash`: The new Canon or Blueprint hash.
- `snapshotTs`: Timestamp of the snapshot.
- `ifMatch`: (Optional) The expected previous ETag/Hash. If mismatch, throws error.
- **Side Effects**: Updates `artifacts/pointers/current.json`.

### `reportBudget(cost: BudgetPayload): Promise<void>`
Reports budget usage.

- `cost.amount`: Number.
- `cost.currency`: Currency code (e.g., 'USD').
- **Side Effects**: Appends to `artifacts/budget/{period}.jsonl`.

## Types

```typescript
export type GateId = 'G0' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7' | 'G8';

export interface GateResult {
  gateId: GateId;
  ok: boolean;
  errors?: string[];
  // ...
}
```
