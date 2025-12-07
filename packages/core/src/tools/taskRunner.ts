/**
 * taskRunner.ts
 * Executes tasks defined in Taskfile.yml via the `task` command
 */

import { spawn } from 'child_process';

export interface TaskRunnerResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
}

/**
 * Runs a task from Taskfile.yml
 * @param taskName - The name of the task to execute (e.g., "quality", "build")
 * @returns Promise with execution result
 */
export async function runTask(taskName: string): Promise<TaskRunnerResult> {
  if (!taskName || typeof taskName !== 'string') {
    return {
      success: false,
      output: '',
      error: 'Task name is required and must be a string',
      exitCode: 1,
    };
  }

  return new Promise((resolve) => {
    const child = spawn('task', [taskName], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        output: stdout,
        error: stderr || undefined,
        exitCode: code || 0,
      });
    });

    child.on('error', (error) => {
      resolve({
        success: false,
        output: '',
        error: `Failed to execute task: ${error.message}`,
        exitCode: 1,
      });
    });
  });
}
