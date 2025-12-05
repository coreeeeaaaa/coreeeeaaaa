export interface LogRecord {
  id: string;
  ts: string;
  project: string;
  actor: string;
  kind: string;
  payload: unknown;
  hashes?: {
    sha256: string;
    sha3: string;
  };
}

export interface GateRecord {
  id: string;
  ts: string;
  project: string;
  input: unknown;
  result: unknown;
}

export interface StatusSnapshot {
  ts: string;
  project: string;
  summary: unknown;
}

export interface StorageDriver {
  writeLog(record: LogRecord): Promise<void>;
  writeGate(record: GateRecord): Promise<void>;
  writeStatus(snapshot: StatusSnapshot): Promise<void>;
  readStatus(project: string): Promise<StatusSnapshot | null>;
}
