import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

// Mock child_process
const mockSpawn = jest.fn();
jest.unstable_mockModule('child_process', () => ({
  spawn: mockSpawn
}));

const { LLMAdapter } = await import('../src/llm-adapter.js');

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
      // Add other properties if needed
      kill: jest.fn()
    };
    mockSpawn.mockReturnValue(mockChildProcess);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('ollama command construction', async () => {
    const adapter = new LLMAdapter({ provider: 'ollama', model: 'llama2' });
    // Trigger internal start logic by calling prompt
    const promptPromise = adapter.prompt('hello');
    
    expect(mockSpawn).toHaveBeenCalledWith(
      'ollama', 
      ['run', 'llama2'], 
      expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] })
    );
    
    // Simulate success
    // We need to yield to event loop to let listeners attach
    await new Promise(resolve => setTimeout(resolve, 0));
    
    mockChildProcess.stdout.emit('data', 'world');
    
    // Simulate exit
    const closeHandler = mockChildProcess.on.mock.calls.find((c: any) => c[0] === 'close');
    if (closeHandler) closeHandler[1](0);

    const result = await promptPromise;
    expect(result).toBe('world');
  });

  test('claude-cli command construction', async () => {
    const adapter = new LLMAdapter({ provider: 'claude-cli' });
    adapter.start();
    expect(mockSpawn).toHaveBeenCalledWith('claude', [], expect.any(Object));
  });

  test('handles process error', async () => {
    const adapter = new LLMAdapter({ provider: 'ollama' });
    const promptPromise = adapter.prompt('test');

    await new Promise(resolve => setTimeout(resolve, 0));
    
    mockChildProcess.stderr.emit('data', 'Error message');
    
    const closeHandler = mockChildProcess.on.mock.calls.find((c: any) => c[0] === 'close');
    if (closeHandler) closeHandler[1](1);

    await expect(promptPromise).rejects.toThrow('Process exited with code 1: Error message');
  });

  test('send writes to stdin', () => {
    const adapter = new LLMAdapter({ provider: 'gemini-cli' });
    adapter.start();
    adapter.send('input text');
    expect(mockChildProcess.stdin.write).toHaveBeenCalledWith('input text');
    expect(mockChildProcess.stdin.end).toHaveBeenCalled();
  });
});