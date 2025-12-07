import { promises as fs } from 'node:fs';
import path from 'node:path';
import { StorageDriver, LogRecord, GateRecord, StatusSnapshot } from './types.js';
import { StorageConfig, LocalFsConfig } from '../config/storage-config.js';

const DEFAULT_ROOT = 'artifacts';

export class LocalFsStorage implements StorageDriver {
  private root: string;

  constructor(private cfg: StorageConfig) {
    const override = cfg.storage?.['local-fs'];
    this.root = path.resolve(process.cwd(), override?.root || DEFAULT_ROOT);
  }

  private async ensureDir(...segments: string[]) {
    const dir = path.join(this.root, ...segments);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  async writeLog(rec: LogRecord): Promise<void> {
    const date = rec.ts.slice(0, 10);
    const dir = await this.ensureDir('logs');
    const file = path.join(dir, `${date}.log`);
    await fs.appendFile(file, JSON.stringify(rec) + '\n');
  }

  async writeGate(rec: GateRecord): Promise<void> {
    const dir = await this.ensureDir('gates', rec.id);
    const ts = rec.ts.replace(/[:.]/g, '-');
    const file = path.join(dir, `${ts}.json`);
    await fs.writeFile(file, JSON.stringify(rec, null, 2));
  }

  async writeStatus(snapshot: StatusSnapshot): Promise<void> {
    const dir = await this.ensureDir('status', snapshot.project);
    const file = path.join(dir, 'current.json');
    await fs.writeFile(file, JSON.stringify(snapshot, null, 2));
  }

  async readStatus(project: string): Promise<StatusSnapshot | null> {
    try {
      const file = path.join(this.root, 'status', project, 'current.json');
      const raw = await fs.readFile(file, 'utf8');
      return JSON.parse(raw) as StatusSnapshot;
    } catch (err) {
      return null;
    }
  }
}
