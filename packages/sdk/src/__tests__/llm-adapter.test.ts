import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

// Mock child_process
const mockSpawn = jest.fn();
jest.unstable_mockModule('child_process', () => ({
  spawn: mockSpawn
}));

// Import from relative path since we are in src/__tests__
const { LLMAdapter } = await import('../llm-adapter.js');

describe('LLMAdapter', () => {
  let mockChildProcess: any;

  beforeEach(() => {
    mockChildProcess = {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      stdin: {
        write: jest.fn(),
        end: jest.fn()
      },
      on: jest.fn(),
      off: jest.fn(),
      kill: jest.fn()
    };
    mockSpawn.mockReturnValue(mockChildProcess);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 1: Check if start() calls spawn with correct arguments
  test('call() correctly calls spawn for ollama', async () => {
    const adapter = new LLMAdapter({ provider: 'ollama', model: 'mistral' });
    
    // We use prompt() to trigger start() implicitly if not started
    // But we can also call start() directly if public.
    // The task asks to test "call()" but the class has "prompt()". I assume "prompt()" is the intended method to test end-to-end.
    
    const promptPromise = adapter.prompt('why is the sky blue?');
    
    expect(mockSpawn).toHaveBeenCalledWith(
      'ollama', 
      ['run', 'mistral'], 
      expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] })
    );

    // Clean up promise to avoid hanging test
    const closeHandler = mockChildProcess.on.mock.calls.find((c: any) => c[0] === 'close');
    if (closeHandler) closeHandler[1](0);
    await promptPromise;
  });

  test('call() correctly calls spawn for claude-cli', async () => {
    const adapter = new LLMAdapter({ provider: 'claude-cli' });
    adapter.start();
    expect(mockSpawn).toHaveBeenCalledWith('claude', [], expect.any(Object));
  });

  // Test Case 2: Simulate stdout and verify output
  test('returns correct parsed string from stdout', async () => {
    const adapter = new LLMAdapter({ provider: 'ollama' });
    const promptPromise = adapter.prompt('test prompt');
    
    // Allow event loop to proceed so listeners are registered
    await new Promise(resolve => setTimeout(resolve, 0));

    // Simulate data chunks
    mockChildProcess.stdout.emit('data', 'chunk 1 ');
    mockChildProcess.stdout.emit('data', 'chunk 2');
    
    // Simulate process close success (0)
    const closeHandler = mockChildProcess.on.mock.calls.find((c: any) => c[0] === 'close');
    if (closeHandler) closeHandler[1](0);

    const result = await promptPromise;
    expect(result).toBe('chunk 1 chunk 2');
  });

  // Test Case 3: Simulate stderr and verify exception
  test('throws exception on process error (stderr + non-zero exit)', async () => {
    const adapter = new LLMAdapter({ provider: 'ollama' });
    const promptPromise = adapter.prompt('fail me');

    await new Promise(resolve => setTimeout(resolve, 0));

    // Simulate error output
    mockChildProcess.stderr.emit('data', 'Critical failure');
    
    // Simulate process close with error code (1)
    const closeHandler = mockChildProcess.on.mock.calls.find((c: any) => c[0] === 'close');
    if (closeHandler) closeHandler[1](1);

    await expect(promptPromise).rejects.toThrow('Process exited with code 1: Critical failure');
  });
});
