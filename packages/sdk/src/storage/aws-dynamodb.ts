import { StorageDriver, LogRecord, GateRecord, StatusSnapshot } from './types';
import { StorageConfig } from '../config/storage-config';

export class DynamoStorage implements StorageDriver {
  constructor(private cfg: StorageConfig) {}

  private fail() {
    throw new Error('aws-dynamodb driver not implemented yet');
  }

  writeLog(_: LogRecord): Promise<void> {
    this.fail();
  }
  writeGate(_: GateRecord): Promise<void> {
    this.fail();
  }
  writeStatus(_: StatusSnapshot): Promise<void> {
    this.fail();
  }
  readStatus(_: string): Promise<StatusSnapshot | null> {
    this.fail();
  }
}
