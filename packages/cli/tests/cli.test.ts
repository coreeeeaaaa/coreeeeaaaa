import { jest } from '@jest/globals';

// Define mocks first
const mockInit = jest.fn<() => Promise<void>>();
const mockRunGate = jest.fn<() => Promise<any>>();
const mockAppendEvidence = jest.fn<() => Promise<void>>();
const mockUpdatePointerCAS = jest.fn<() => Promise<void>>();

// Mock the module using unstable_mockModule (for ESM)
jest.unstable_mockModule('@coreeeeaaaa/sdk', () => ({
  CoreSDK: jest.fn().mockImplementation(() => ({
    init: mockInit,
    runGate: mockRunGate,
    appendEvidence: mockAppendEvidence,
    updatePointerCAS: mockUpdatePointerCAS
  }))
}));

// Import the modules under test AFTER mocking
const { initCommand } = await import('../src/commands/init.js');
const { gateCommand } = await import('../src/commands/gate.js');
const { evidenceCommand } = await import('../src/commands/evidence.js');
const { pointerCommand } = await import('../src/commands/pointer.js');

// Mock Console and Process
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalProcessExit = process.exit;

beforeEach(() => {
  mockInit.mockReset();
  mockRunGate.mockReset();
  mockAppendEvidence.mockReset();
  mockUpdatePointerCAS.mockReset();
  
  console.log = jest.fn();
  console.error = jest.fn();
  process.exit = jest.fn() as any;
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  process.exit = originalProcessExit;
});

describe('CLI Commands', () => {
  
  test('initCommand calls sdk.init', async () => {
    mockInit.mockResolvedValue(undefined);
    await initCommand({});
    expect(mockInit).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Setup complete'));
  });

  test('gateCommand calls sdk.runGate', async () => {
    mockRunGate.mockResolvedValue({ ok: true, inputHash: 'abc' });
    await gateCommand('G1', { input: undefined }); 
    expect(mockRunGate).toHaveBeenCalledWith('G1', {}, undefined);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('PASSED'));
  });

  test('gateCommand handles failure', async () => {
    mockRunGate.mockResolvedValue({ ok: false, errors: ['oops'] });
    await gateCommand('G1', {});
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('FAILED'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('evidenceCommand calls appendEvidence', async () => {
    mockAppendEvidence.mockResolvedValue(undefined);
    await evidenceCommand(['file1.txt', 'file2.log'], {});
    expect(mockAppendEvidence).toHaveBeenCalledTimes(2);
    expect(mockAppendEvidence).toHaveBeenCalledWith(expect.objectContaining({ path: 'file1.txt' }));
  });

  test('pointerCommand calls updatePointerCAS', async () => {
    mockUpdatePointerCAS.mockResolvedValue(undefined);
    await pointerCommand('hash123', { ifMatch: 'etag1' });
    expect(mockUpdatePointerCAS).toHaveBeenCalledWith('hash123', expect.any(String), 'etag1');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('successfully'));
  });
});