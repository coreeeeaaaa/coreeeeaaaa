import { CoreSDK } from '../src/index.js';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { fileURLToPath } from 'url';

// Mocking module loading is tricky in ESM tests without specific loaders.
// Instead, we rely on integration testing behavior where we check the artifacts.

describe('CoreSDK', () => {
  let tmpDir: string;
  let sdk: CoreSDK;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'core-sdk-test-'));
    sdk = new CoreSDK({
      rootDir: tmpDir,
      artifactsDir: path.join(tmpDir, 'artifacts')
    });
    await sdk.init();
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test('init creates necessary directories', async () => {
    const dirs = ['gates', 'evidence', 'pointers', 'logs', 'budget', 'lineage'];
    for (const d of dirs) {
      const p = path.join(tmpDir, 'artifacts', d);
      const stats = await fs.stat(p);
      expect(stats.isDirectory()).toBe(true);
    }
  });

  test('runGate persists result', async () => {
    const input = { foo: 'bar' };
    const result = await sdk.runGate('G1', input);
    
    expect(result.gateId).toBe('G1');
    expect(result.ok).toBe(true);
    expect(result.inputHash).toBeDefined();

    // Check file existence
    const gateDir = path.join(tmpDir, 'artifacts', 'gates', 'G1');
    const files = await fs.readdir(gateDir);
    expect(files.length).toBe(1);
    
    const content = JSON.parse(await fs.readFile(path.join(gateDir, files[0]), 'utf8'));
    expect(content.gateId).toBe('G1');
  });

  test('appendEvidence writes to manifest and logs', async () => {
    const dummyFile = path.join(tmpDir, 'test.txt');
    await fs.writeFile(dummyFile, 'hello world');

    await sdk.appendEvidence({
        type: 'artifact',
        path: dummyFile
    });

    // Check manifest
    const manifestPath = path.join(tmpDir, 'artifacts', 'evidence', 'manifest.jsonl');
    const manifestContent = await fs.readFile(manifestPath, 'utf8');
    const entry = JSON.parse(manifestContent);
    
    expect(entry.type).toBe('artifact');
    expect(entry.path).toBe(dummyFile);
    expect(entry.hash).toBeDefined(); // Should be hash of "hello world"

    // Check log
    const logsDir = path.join(tmpDir, 'artifacts', 'logs');
    const logFiles = await fs.readdir(logsDir);
    expect(logFiles.length).toBeGreaterThan(0);
  });

  test('updatePointerCAS enforces optimistic locking', async () => {
    // First write
    await sdk.updatePointerCAS('hash1', 'ts1');
    
    const pointerPath = path.join(tmpDir, 'artifacts', 'pointers', 'current.json');
    const content = JSON.parse(await fs.readFile(pointerPath, 'utf8'));
    const etag1 = content.etag;

    // Second write with correct ifMatch
    await sdk.updatePointerCAS('hash2', 'ts2', etag1);
    
    const content2 = JSON.parse(await fs.readFile(pointerPath, 'utf8'));
    expect(content2.current_hash).toBe('hash2');

    // Third write with WRONG ifMatch
    await expect(sdk.updatePointerCAS('hash3', 'ts3', 'wrong-etag'))
        .rejects.toThrow('CAS failed');
  });
});
