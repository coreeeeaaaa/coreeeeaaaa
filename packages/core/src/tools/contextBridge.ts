/**
 * contextBridge.ts
 * Bridge to core/sdk/context7.js
 */

import { spawn } from 'child_process';
import path from 'path';

export interface ContextBridgeResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Load context using context7.js
 */
export async function loadContext(task: any = {}): Promise<ContextBridgeResult> {
  const scriptPath = path.join(process.cwd(), 'core/sdk/context7.js');

  return new Promise((resolve) => {
    const child = spawn('node', ['-e', `
      const context7 = require('${scriptPath}');
      context7.loadContext(${JSON.stringify(task)})
        .then(data => console.log(JSON.stringify(data)))
        .catch(err => console.error(JSON.stringify({ error: err.message })));
    `], {
      stdio: ['pipe', 'pipe', 'pipe']
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
      try {
        const result = JSON.parse(stdout);
        resolve({
          success: !result.error,
          data: result,
        });
      } catch {
        resolve({
          success: false,
          error: stderr || 'Failed to load context',
        });
      }
    });

    child.on('error', (error) => {
      resolve({
        success: false,
        error: `Failed to execute context7: ${error.message}`,
      });
    });
  });
}
