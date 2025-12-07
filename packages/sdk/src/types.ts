export type GateId = 'G0' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7' | 'G8';

export interface CoreConfig {
  projectId?: string;
  rootDir?: string; // Defaults to process.cwd()
  artifactsDir?: string; // Defaults to rootDir/artifacts
  devAiToken?: string;
}

export interface GateInput {
  [key: string]: any;
}

export interface GateResult {
  gateId: GateId;
  ok: boolean;
  evaluatedAt: string;
  inputHash: string;
  meta?: Record<string, any>;
  errors?: string[];
}

export interface EvidencePayload {
  type: 'log' | 'trace' | 'artifact' | 'test_result';
  path: string;
  content?: string | Buffer;
  hash?: string;
  meta?: Record<string, any>;
  kind?: 'log' | 'trace' | 'git';
}

export interface BudgetPayload {
  currency: string;
  amount: number;
  period: string; // YYYY-MM
  breakdown?: Record<string, number>;
}

export interface LogEntry {
  ts?: string;
  ts_compact?: string;
  type: string;
  actor: string;
  context?: string;
  text: string;
  [key: string]: any;
}

export interface GateRecord {
  id: GateId;
  ts: string;
  project: string;
  input: GateInput;
  result: GateResult;
}

export interface LogRecord {
  id: string;
  ts: string;
  ts_compact?: string;
  type: string;
  actor: string;
  context?: string;
  text: string;
  project?: string;
  [key: string]: any;
}

export interface GateRecord {
  id: GateId;
  gateId: GateId;
  timestamp: string;
  project: string;
  input: GateInput;
  result: GateResult;
}

export interface StatusSnapshot {
  id: string;
  timestamp: string;
  ts: string;
  project?: string;
  summary: any;
}

export interface StorageConfig {
  provider?: string;
  projectId?: string;
  region?: string;
  credentials?: any;
  [key: string]: any;
}

export interface StorageDriver {
  writeLog(record: LogRecord): Promise<void>;
  writeGate(record: GateRecord): Promise<void>;
  writeStatus(record: StatusSnapshot): Promise<void>;
  readStatus(snapshotId: string): Promise<StatusSnapshot | null>;
  queryLogs(startDate: string, endDate: string, limit?: number): Promise<LogRecord[]>;
  healthCheck?(): Promise<{ healthy: boolean; details: string }>;
  close?(): Promise<void>;
}

