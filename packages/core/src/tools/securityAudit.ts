/**
 * securityAudit.ts
 * Runs security audit tools (trivy, gitleaks) and returns results
 */

import { spawn } from 'child_process';

export interface SecurityAuditResult {
  success: boolean;
  data?: {
    trivy?: {
      available: boolean;
      output?: string;
      vulnerabilities?: number;
    };
    gitleaks?: {
      available: boolean;
      output?: string;
      secretsFound?: number;
    };
  };
  error?: string;
}

/**
 * Checks if a command is available in PATH
 */
async function isCommandAvailable(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('command', ['-v', command], {
      shell: true,
      stdio: 'pipe',
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Runs trivy filesystem scan
 */
async function runTrivy(): Promise<any> {
  const available = await isCommandAvailable('trivy');

  if (!available) {
    return {
      available: false,
      output: 'Trivy not found in PATH',
    };
  }

  return new Promise((resolve) => {
    const child = spawn('trivy', ['fs', '--format', 'json', '--exit-code', '0', '.'], {
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
      try {
        // Try to parse JSON output
        const jsonOutput = JSON.parse(stdout);
        const vulnerabilities = jsonOutput.Results
          ? jsonOutput.Results.reduce(
              (count: number, result: any) =>
                count + (result.Vulnerabilities ? result.Vulnerabilities.length : 0),
              0
            )
          : 0;

        resolve({
          available: true,
          output: stdout,
          vulnerabilities,
          exitCode: code,
        });
      } catch {
        // If JSON parsing fails, return raw output
        resolve({
          available: true,
          output: stdout || stderr,
          vulnerabilities: null,
          exitCode: code,
        });
      }
    });

    child.on('error', (error) => {
      resolve({
        available: false,
        output: `Failed to execute trivy: ${error.message}`,
      });
    });
  });
}

/**
 * Runs gitleaks secret detection
 */
async function runGitleaks(): Promise<any> {
  const available = await isCommandAvailable('gitleaks');

  if (!available) {
    return {
      available: false,
      output: 'Gitleaks not found in PATH',
    };
  }

  return new Promise((resolve) => {
    const child = spawn('gitleaks', ['detect', '--no-git', '--verbose', '--report-format', 'json'], {
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
      try {
        // Try to parse JSON output
        const jsonOutput = stdout ? JSON.parse(stdout) : [];
        const secretsFound = Array.isArray(jsonOutput) ? jsonOutput.length : 0;

        resolve({
          available: true,
          output: stdout || stderr,
          secretsFound,
          exitCode: code,
        });
      } catch {
        // If JSON parsing fails, return raw output
        resolve({
          available: true,
          output: stdout || stderr,
          secretsFound: null,
          exitCode: code,
        });
      }
    });

    child.on('error', (error) => {
      resolve({
        available: false,
        output: `Failed to execute gitleaks: ${error.message}`,
      });
    });
  });
}

/**
 * Runs comprehensive security audit
 * @returns Combined results from trivy and gitleaks
 */
export async function auditSecurity(): Promise<SecurityAuditResult> {
  try {
    const [trivyResult, gitleaksResult] = await Promise.all([
      runTrivy(),
      runGitleaks(),
    ]);

    return {
      success: true,
      data: {
        trivy: trivyResult,
        gitleaks: gitleaksResult,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Security audit failed: ${error.message}`,
    };
  }
}
