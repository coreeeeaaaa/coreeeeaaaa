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
