import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

type Provider = 'ollama' | 'claude-cli' | 'gemini-cli';

interface AdapterOptions {
  provider: Provider;
  model?: string;
}

export class LLMAdapter {
  private child: ChildProcessWithoutNullStreams | null = null;
  private stdoutBuffer = '';
  private stderrBuffer = '';

  constructor(private opts: AdapterOptions) {}

  private buildCommand(): { cmd: string; args: string[] } {
    switch (this.opts.provider) {
      case 'ollama':
        return { cmd: 'ollama', args: ['run', this.opts.model || 'llama2'] };
      case 'claude-cli':
        return { cmd: 'claude', args: [] };
      case 'gemini-cli':
        return { cmd: 'gemini', args: [] };
      default:
        throw new Error(`Unknown provider: ${this.opts.provider}`);
    }
  }

  start() {
    if (this.child) return;
    const { cmd, args } = this.buildCommand();
    this.child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    this.child.stdout.on('data', (d) => {
      this.stdoutBuffer += d.toString();
    });
    this.child.stderr.on('data', (d) => {
      this.stderrBuffer += d.toString();
    });
  }

  send(text: string) {
    if (!this.child) this.start();
    if (!this.child) throw new Error('LLM process failed to start');
    this.child.stdin.write(text);
    this.child.stdin.end();
  }

  async prompt(text: string): Promise<string> {
    this.start();
    if (!this.child) throw new Error('LLM process failed to start');

    return new Promise((resolve, reject) => {
      const onClose = (code: number) => {
        if (code === 0) {
          resolve(this.stdoutBuffer.trim());
        } else {
          const msg = this.stderrBuffer.trim();
          reject(new Error(`Process exited with code ${code}: ${msg}`));
        }
      };

      this.child!.on('close', onClose);
      this.send(text);
    });
  }
}

export default LLMAdapter;
