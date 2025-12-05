import { StorageDriver, LogRecord, GateRecord, StatusSnapshot } from './types.js';
import { StorageConfig } from '../config/storage-config.js';

export class DynamoStorage implements StorageDriver {
  constructor(private cfg: StorageConfig) {}

  private fail(): Error {
    return new Error('aws-dynamodb driver not implemented yet');
  }

  writeLog(_: LogRecord): Promise<void> {
    return Promise.reject(this.fail());
  }
  writeGate(_: GateRecord): Promise<void> {
    return Promise.reject(this.fail());
  }
  writeStatus(_: StatusSnapshot): Promise<void> {
    return Promise.reject(this.fail());
  }
  readStatus(_: string): Promise<StatusSnapshot | null> {
    return Promise.reject(this.fail());
  }
}
