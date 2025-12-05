import path from 'path';
import { mkdir, readFile, writeFile, appendFile, rename, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import Ajv from 'ajv';
import { 
  CoreConfig, 
  GateId, 
  GateInput, 
  GateResult, 
  EvidencePayload, 
  BudgetPayload, 
  LogEntry 
} from './types.js';
import { 
  hashObject, 
  hashString, 
  compactTs, 
  isoNow, 
  anonymizeContent,
  multiHash
} from './utils.js';

import { getStorage } from './storage/index.js';
import type { GateRecord, LogRecord, StatusSnapshot } from './storage/types.js';
import { validate2of3 } from './evidence-validator.js';
import type { EvidenceSource } from './evidence-validator.js';

export * from './types.js';
export * from './utils.js';

export class CoreSDK {
  private config: CoreConfig;
  private rootDir: string;
  private artifactsDir: string;

  constructor(config: CoreConfig = {}) {
    this.config = config;
    this.rootDir = config.rootDir || process.cwd();
    this.artifactsDir = config.artifactsDir || path.join(this.rootDir, 'artifacts');
  }

  /**
   * Initializes the environment (ensures directories exist).
   */
  async init(): Promise<void> {
    const dirs = ['gates', 'evidence', 'pointers', 'logs', 'budget', 'lineage'];
    for (const d of dirs) {
      await mkdir(path.join(this.artifactsDir, d), { recursive: true });
    }
  }

  /**
   * Runs a gate validation process.
   * Records the result in artifacts/gates/{gateId}/{timestamp}.json
   */
  async runGate(gateId: GateId, input: GateInput, schemaPath?: string): Promise<GateResult> {
    const evaluatedAt = isoNow();
    const inputHash = hashObject(input);
    let ok = true;
    let errors: string[] = [];

    // Optional Schema Validation
    if (schemaPath) {
      try {
        const AjvClass = (Ajv as any).default || Ajv;
        const ajv = new AjvClass({ allErrors: true, strict: false });
        const schemaRaw = await readFile(schemaPath, 'utf8');
        const schema = JSON.parse(schemaRaw);
        const validate = ajv.compile(schema);
        const valid = validate(input);
        if (!valid) {
          ok = false;
          errors = validate.errors?.map((e: any) => `${e.instancePath} ${e.message}`) || ['Unknown schema error'];
        }
      } catch (err: any) {
        ok = false;
        errors.push(`Schema validation failed: ${err.message}`);
      }
    }

    const result: GateResult = {
      gateId,
      ok,
      evaluatedAt,
      inputHash,
      errors: errors.length > 0 ? errors : undefined
    };

    // Persist result
    const safeStamp = evaluatedAt.replace(/[:]/g, '-');
    const destDir = path.join(this.artifactsDir, 'gates', gateId);
    await mkdir(destDir, { recursive: true });
    await writeFile(
      path.join(destDir, `${safeStamp}.json`),
      JSON.stringify(result, null, 2)
    );

    // Log event
    await this.log({
      type: 'gate_run',
      actor: 'sdk',
      context: gateId,
      text: `Gate ${gateId} ${ok ? 'passed' : 'failed'}`,
      meta: { inputHash, errors: errors.length }
    });

    return result;
  }

  /**
   * Appends evidence to the log and virtually uploads it (simulated).
   */
  async appendEvidence(evidence: EvidencePayload): Promise<void> {
    const destDir = path.join(this.artifactsDir, 'evidence');
    await mkdir(destDir, { recursive: true });

    let contentHash = evidence.hash;
    if (!contentHash) {
        // If content is provided, hash it. If path, read and hash.
        // For simplicity in this v1, we assume path exists if content is undefined
        if (evidence.content) {
            contentHash = typeof evidence.content === 'string' 
                ? hashString(evidence.content) 
                : hashString(evidence.content.toString());
        } else {
            try {
                const buf = await readFile(evidence.path);
                contentHash = hashString(buf.toString());
            } catch (err) {
                contentHash = 'MISSING_FILE';
            }
        }
    }

    const manifestEntry = {
        ...evidence,
        hash: contentHash,
        timestamp: isoNow()
    };

    // In a real world, we would upload to GCS here.
    // For now, we append to a local manifest.
    const manifestPath = path.join(destDir, 'manifest.jsonl');
    await appendFile(manifestPath, JSON.stringify(manifestEntry) + '\n');

    await this.log({
        type: 'evidence_collected',
        actor: 'sdk',
        context: 'evidence',
        text: `Collected evidence: ${evidence.type} (${path.basename(evidence.path)})`,
        meta: { hash: contentHash }
    });

    const evidenceSources = this.collectEvidenceSources(evidence);
    if (!validate2of3(evidenceSources)) {
      console.warn('Evidence 2-of-3 rule not satisfied; consider adding another source');
    }
  }

  /**
   * Reports budget usage.
   */
  async reportBudget(cost: BudgetPayload): Promise<void> {
    const destDir = path.join(this.artifactsDir, 'budget');
    await mkdir(destDir, { recursive: true });
    
    const filename = `${cost.period}.jsonl`;
    await appendFile(
        path.join(destDir, filename), 
        JSON.stringify({ ...cost, timestamp: isoNow() }) + '\n'
    );
  }

  /**
   * Updates the global pointer with Optimistic Concurrency Control (CAS).
   */
  async updatePointerCAS(hash: string, snapshotTs: string, ifMatch?: string): Promise<void> {
    const pointerDir = path.join(this.artifactsDir, 'pointers');
    await mkdir(pointerDir, { recursive: true });
    const pointerFile = path.join(pointerDir, 'current.json');
    
    let prevEtag: string | null = null;
    let supersedes: string | null = null;

    try {
        const prevRaw = await readFile(pointerFile, 'utf8');
        const prev = JSON.parse(prevRaw);
        prevEtag = prev.etag || hashObject(prev);
        supersedes = prev.current_hash;

        if (ifMatch && prevEtag !== ifMatch) {
            throw new Error(`CAS failed: ETag mismatch. Expected ${ifMatch}, got ${prevEtag}`);
        }
    } catch (err: any) {
        if (err.code !== 'ENOENT') throw err;
    }

    const now = isoNow();
    const record = {
        current_hash: hash,
        supersedes: supersedes || null,
        snapshot_ts: snapshotTs,
        updated_at: now,
        etag: hashObject({ hash, supersedes, snapshotTs })
    };

    const tmpFile = `${pointerFile}.tmp.${Date.now()}`;
    await writeFile(tmpFile, JSON.stringify(record, null, 2));
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await rename(tmpFile, pointerFile);
        break;
      } catch (err: any) {
        if (attempt === maxAttempts) {
          await unlink(tmpFile).catch(() => undefined);
          throw new Error(`Failed to write pointer after ${maxAttempts} attempts: ${err.message}`);
        }
        if (err.code !== 'EEXIST') {
          await unlink(tmpFile).catch(() => undefined);
          throw err;
        }
      }
    }
    
    await this.log({
        type: 'pointer_update',
        actor: 'sdk',
        context: 'pointer',
        text: `Pointer updated to ${hash}`,
        meta: { snapshotTs, supersedes }
    });
  }

  /**
   * Logs a lineage event.
   */
  async logLineage(entity: string, meta: Record<string, any>): Promise<void> {
     const lineageDir = path.join(this.artifactsDir, 'lineage');
     await mkdir(lineageDir, { recursive: true });
     
     // Shard by entity
     const safeEntity = entity.replace(/[^a-zA-Z0-9_-]/g, '_');
     const filePath = path.join(lineageDir, `${safeEntity}.jsonl`);
     
     const entry = {
         entity,
         timestamp: isoNow(),
         meta
     };
     
     await appendFile(filePath, JSON.stringify(entry) + '\n');
  }

  /**
   * Internal logging helper. Sends log to Rust engine (CLI wiring).
   */
  private async log(entry: LogEntry): Promise<void> {
      const tsIso = entry.ts || isoNow();
      const tsCompact = entry.ts_compact || compactTs();

      const fullEntry = {
          ts: tsIso,
          ts_compact: tsCompact,
          ...entry
      };

      try {
          await this.sendToRustEngine(fullEntry);
      } catch (err: any) {
          // Fallback for environments without cargo/binary; keep non-fatal
          console.warn('mocking rust engine call (logger fallback):', err?.message || err);
      }

      await this.writeStorageLogRecord(fullEntry);
  }

  private async writeStorageLogRecord(entry: LogEntry & { ts: string; ts_compact: string }) {
      try {
          const storage = await getStorage();
          const rec: LogRecord = {
              id: entry.context || entry.type || 'log',
              ts: entry.ts,
              project: this.config.projectId || 'default',
              actor: entry.actor,
              kind: entry.type,
              payload: entry,
          };
          await storage.writeLog(rec);
      } catch (err: any) {
          // non-fatal for environments without configured storage
          console.warn('storage log write skipped:', err?.message || err);
      }

      // Always persist to artifactsDir/logs for local-first behavior
      try {
          const logsDir = path.join(this.artifactsDir, 'logs');
          await mkdir(logsDir, { recursive: true });
          const date = entry.ts.slice(0, 10);
          const file = path.join(logsDir, `${date}.log`);
          await appendFile(file, JSON.stringify(entry) + '\n');
      } catch (err: any) {
          console.warn('local log write skipped:', err?.message || err);
      }
  }

  /**
   * Push log entry to Rust UEM engine via binary or cargo run.
   */
  private async sendToRustEngine(record: any): Promise<void> {
      const engineBin = path.join(this.rootDir, 'packages', 'engine-rs', 'target', 'release', 'core-uem-engine');
      const manifestPath = path.join(this.rootDir, 'packages', 'engine-rs', 'Cargo.toml');
      const payload = JSON.stringify(record);

      const useBinary = existsSync(engineBin);
      const cmd = useBinary ? engineBin : 'cargo';
      const args = useBinary
          ? ['append']
          : ['run', '--manifest-path', manifestPath, '--', 'append'];

      return new Promise((resolve) => {
          const child = spawn(cmd, args, {
              cwd: this.rootDir,
              stdio: ['pipe', 'pipe', 'pipe']
          });
          let stderr = '';

          child.on('error', (err) => {
              console.warn('mocking rust engine call (spawn error):', err?.message || err);
              resolve();
          });

          child.stderr.on('data', (d) => {
              stderr += d.toString();
          });

          child.on('close', (code) => {
              if (code !== 0) {
                  const msg = stderr.trim() || `exit code ${code}`;
                  console.warn('mocking rust engine call (non-zero exit):', msg);
              }
              resolve();
          });

          child.stdin.write(payload);
          child.stdin.end();
      });
  }

  private collectEvidenceSources(evidence: EvidencePayload) {
      const sources: EvidenceSource[] = [];
      const metaSources = evidence.meta?.sources;
      if (Array.isArray(metaSources)) {
          for (const src of metaSources) {
              if (src.kind && src.hash) {
                  sources.push({
                      kind: src.kind,
                      hash: src.hash,
                      timestamp: src.timestamp || isoNow(),
                  });
              }
          }
      }
      sources.push({
          kind: evidence.kind || this.inferEvidenceKind(evidence),
          hash: evidence.hash || hashObject(evidence),
          timestamp: evidence.meta?.timestamp || isoNow(),
      });
      return sources;
  }

  private inferEvidenceKind(evidence: EvidencePayload): EvidenceSource['kind'] {
      if (evidence.kind) return evidence.kind;
      if (evidence.path?.includes('git')) return 'git';
      if (evidence.type === 'trace' || evidence.meta?.source === 'trace') return 'trace';
      return 'log';
  }
}

export class AutonomousAgent {
  constructor(private opts: { projectId?: string; rootDir?: string }) {}

  async startLoop(meta: Record<string, any>): Promise<void> {
    // Placeholder loop; real agent logic not implemented
    console.warn('AutonomousAgent.startLoop is a stub; no actions performed', meta);
  }
}
