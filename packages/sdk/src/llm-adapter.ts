import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export type LLMProvider = 'ollama' | 'claude-cli' | 'codex' | 'aider' | 'gemini-cli';

export interface LLMAdapterConfig {
  provider: LLMProvider;
  model?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export class LLMAdapter extends EventEmitter {
  private provider: LLMProvider;
  private model: string;
  private cwd: string;
  private env: NodeJS.ProcessEnv;
  private child: ChildProcess | null = null;

  constructor(config: LLMAdapterConfig) {
    super();
    this.provider = config.provider;
    this.model = config.model || 'default';
    this.cwd = config.cwd || process.cwd();
    this.env = config.env || process.env;
  }

  public start(): void {
    const { command, args } = this.getCommand();
    
    this.child = spawn(command, args, {
      cwd: this.cwd,
      env: this.env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    if (this.child.stdout) {
      this.child.stdout.on('data', (data) => {
        this.emit('data', data.toString());
      });
    }

    if (this.child.stderr) {
      this.child.stderr.on('data', (data) => {
        this.emit('error', data.toString());
      });
    }

    this.child.on('close', (code) => {
      this.emit('close', code);
      this.child = null;
    });
  }

  public send(input: string): void {
    if (!this.child || !this.child.stdin) {
      throw new Error('LLM process not running');
    }
    this.child.stdin.write(input);
    this.child.stdin.end(); // Many CLIs expect end of input to process
  }

  private getCommand(): { command: string; args: string[] } {
    switch (this.provider) {
      case 'ollama':
        return { command: 'ollama', args: ['run', this.model] };
      case 'claude-cli':
        // Assuming claude-cli accepts prompt via stdin
        return { command: 'claude', args: [] };
      case 'gemini-cli':
        return { command: 'gemini', args: ['chat'] };
      case 'codex':
         // Hypothetical CLI structure
        return { command: 'codex', args: ['--model', this.model] };
      case 'aider':
        return { command: 'aider', args: ['--model', this.model] };
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  public async prompt(text: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.child) {
        this.start();
      }

      let output = '';
      let errorOutput = '';

      const dataHandler = (chunk: string) => {
        output += chunk;
      };

      const errorHandler = (chunk: string) => {
        errorOutput += chunk;
      };

      const closeHandler = (code: number | null) => {
        cleanup();
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
        }
      };

      const cleanup = () => {
        this.off('data', dataHandler);
        this.off('error', errorHandler);
        this.off('close', closeHandler);
      };

      this.on('data', dataHandler);
      this.on('error', errorHandler);
      this.on('close', closeHandler);

      try {
        this.send(text);
      } catch (e) {
        cleanup();
        reject(e);
      }
    });
  }
}
