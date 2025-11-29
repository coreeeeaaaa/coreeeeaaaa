# Coreeeeaaaa CLI Reference

The `@coreeeeaaaa/cli` package (`coreeeeaaaa`) is the command-line interface for the framework.

## Installation

```bash
npm install -g @coreeeeaaaa/cli
# or use via npx
npx coreeeeaaaa <command>
```

## Commands

### `coreeeeaaaa init`
Initializes the Coreeeeaaaa environment in the current directory.
- Creates `.coreeeeaaaa/config.json` if missing.
- Ensures artifact directories exist.

### `coreeeeaaaa gate run <GateId>`
Runs a specific gate validation.

**Arguments:**
- `<GateId>`: The ID of the gate to run (e.g., `G4`).

**Options:**
- `-i, --input <path>`: Path to the input JSON file.
- `-s, --schema <path>`: Path to a JSON schema file for validation.

**Example:**
```bash
coreeeeaaaa gate run G4 --input inputs/coverage.json --schema schemas/g4.json
```

### `coreeeeaaaa evidence <files...>`
Collects files as evidence.

**Arguments:**
- `<files...>`: List of file paths to collect.

**Example:**
```bash
coreeeeaaaa evidence coverage/report.html build/sbom.json
```

### `coreeeeaaaa pointer <hash>`
Updates the project pointer (Canon/Blueprint hash).

**Arguments:**
- `<hash>`: The new hash value.

**Options:**
- `--if-match <etag>`: Optimistic locking. Only update if current ETag matches this value.

**Example:**
```bash
coreeeeaaaa pointer sha256:abc123... --if-match sha256:xyz987...
```

### `coreeeeaaaa budget check`
(Note: This is currently implemented via `scripts/budget-check.js` in the template, but CLI wrapper is planned).

Checks if the current usage is within the budget.
