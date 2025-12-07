// 실제 OPA(Open Policy Agent) 연동 모듈
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { Artifact, PolicyEvaluation } from './policy-engine';

// OPA 실행 설정
interface OPAConfig {
  executable?: string;
  port?: number;
  timeout?: number;
  policiesPath?: string;
  logLevel?: 'debug' | 'info' | 'error';
}

// 정책 파일 정보
interface PolicyFile {
  path: string;
  content: string;
  name: string;
  loadedAt?: Date;
}

// 실제 OPA 엔진
export class RealOPAEngine extends EventEmitter {
  private config: Required<OPAConfig>;
  private isRunning = false;
  private policies = new Map<string, PolicyFile>();
  private opaProcess?: any;

  constructor(config: Partial<OPAConfig> = {}) {
    super();

    this.config = {
      executable: config.executable || 'opa',
      port: config.port || 8181,
      timeout: config.timeout || 5000,
      policiesPath: config.policiesPath || './policies',
      logLevel: config.logLevel || 'info'
    };
  }

  // OPA 서버 시작
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('OPA server is already running');
    }

    return new Promise((resolve, reject) => {
      try {
        const args = [
          'run',
          '--server',
          `--addr=:${this.config.port}`,
          '--log-level',
          this.config.logLevel
        ];

        if (this.config.policiesPath) {
          args.push('--bundle', this.config.policiesPath);
        }

        this.opaProcess = spawn(this.config.executable, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: process.env
        });

        let startupOutput = '';

        this.opaProcess.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          startupOutput += output;

          if (output.includes('Server started') || output.includes('server listening')) {
            this.isRunning = true;
            console.log(`🚀 OPA server started on port ${this.config.port}`);
            resolve();
          }
        });

        this.opaProcess.stderr.on('data', (data: Buffer) => {
          console.error(`OPA Error: ${data.toString()}`);
        });

        this.opaProcess.on('error', (error: Error) => {
          console.error('Failed to start OPA server:', error.message);
          reject(error);
        });

        this.opaProcess.on('exit', (code: number) => {
          this.isRunning = false;
          if (code !== 0) {
            console.error(`OPA server exited with code ${code}`);
          }
        });

        // 타임아웃
        setTimeout(() => {
          if (!this.isRunning) {
            reject(new Error('OPA server startup timeout'));
            this.stop();
          }
        }, this.config.timeout);

      } catch (error) {
        reject(error);
      }
    });
  }

  // OPA 서버 종료
  async stop(): Promise<void> {
    if (this.opaProcess && this.isRunning) {
      return new Promise((resolve) => {
        this.opaProcess.on('exit', () => {
          this.isRunning = false;
          resolve();
        });

        this.opaProcess.kill('SIGTERM');

        // 강제 종료 타임아웃
        setTimeout(() => {
          if (this.isRunning) {
            this.opaProcess.kill('SIGKILL');
            this.isRunning = false;
            resolve();
          }
        }, 5000);
      });
    }
  }

  // 정책 로드
  async loadPolicy(name: string, content: string): Promise<void> {
    try {
      // 파일 시스템에 정책 저장
      const fs = require('fs').promises;
      const path = require('path');

      const policyPath = path.join(this.config.policiesPath, `${name}.rego`);
      await fs.mkdir(path.dirname(policyPath), { recursive: true });
      await fs.writeFile(policyPath, content, 'utf8');

      const policyFile: PolicyFile = {
        name,
        path: policyPath,
        content,
        loadedAt: new Date()
      };

      this.policies.set(name, policyFile);

      // OPA에 정책 다시 로드 요청
      await this.reloadPolicies();

      console.log(`✅ Policy loaded: ${name}`);
      this.emit('policy:loaded', { name, policyFile });

    } catch (error) {
      console.error(`Failed to load policy ${name}:`, error);
      throw error;
    }
  }

  // 정책 언로드
  async unloadPolicy(name: string): Promise<void> {
    try {
      const fs = require('fs').promises;
      const policyFile = this.policies.get(name);

      if (policyFile) {
        await fs.unlink(policyFile.path);
        this.policies.delete(name);
        await this.reloadPolicies();

        console.log(`🗑️ Policy unloaded: ${name}`);
        this.emit('policy:unloaded', { name });
      }
    } catch (error) {
      console.error(`Failed to unload policy ${name}:`, error);
      throw error;
    }
  }

  // 정책 평가
  async evaluate(policyPath: string, input: any): Promise<PolicyEvaluation> {
    if (!this.isRunning) {
      throw new Error('OPA server is not running');
    }

    const startTime = Date.now();

    try {
      const response = await fetch(`http://localhost:${this.config.port}/v1/data${policyPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input })
      });

      if (!response.ok) {
        throw new Error(`OPA evaluation failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const evaluationTime = Date.now() - startTime;

      // 결과가 비어있는 경우 처리
      const decision = this.extractDecision(result);
      const allowed = this.isAllowed(result);

      return {
        allowed,
        reason: decision.reason || this.buildReason(result, input),
        metrics: {
          evaluation_time_ms: evaluationTime,
          rules_matched: this.countMatchedRules(result),
          risk_score: this.extractRiskScore(result)
        }
      };

    } catch (error) {
      const evaluationTime = Date.now() - startTime;

      console.error('OPA evaluation error:', error);

      return {
        allowed: false,
        reason: `Evaluation failed: ${(error as Error).message}`,
        metrics: {
          evaluation_time_ms: evaluationTime,
          rules_matched: 0
        }
      };
    }
  }

  // 정책 다시 로드
  private async reloadPolicies(): Promise<void> {
    try {
      const response = await fetch(`http://localhost:${this.config.port}/v1/policies`, {
        method: 'POST'
      });

      if (!response.ok) {
        console.warn('Failed to reload policies in OPA');
      }
    } catch (error) {
      console.warn('Failed to connect to OPA for policy reload:', error);
    }
  }

  // OPA 결과에서 결정 추출
  private extractDecision(result: any): any {
    if (result && typeof result === 'object' && 'result' in result) {
      return result.result;
    }
    return {};
  }

  // 허용 여부 확인
  private isAllowed(result: any): boolean {
    const decision = this.extractDecision(result);

    // 다양한 허용 패턴 확인
    if (typeof decision === 'boolean') {
      return decision;
    }

    if (decision && typeof decision === 'object') {
      // 'allow' 필드 확인
      if ('allow' in decision) {
        return decision.allow === true;
      }

      // 'allowed' 필드 확인
      if ('allowed' in decision) {
        return decision.allowed === true;
      }
    }

    // 기본적으로 거부
    return false;
  }

  // 이유 생성
  private buildReason(result: any, input: any): string {
    const decision = this.extractDecision(result);

    if (decision && typeof decision === 'object') {
      if (decision.reason) {
        return decision.reason;
      }

      if (decision.message) {
        return decision.message;
      }
    }

    return this.isAllowed(result) ? 'Allowed' : 'Denied';
  }

  // 매치된 규칙 수 계산
  private countMatchedRules(result: any): number {
    // OPA 결과 구조에서 규칙 수 추정
    // 단순화된 구현
    if (result && typeof result === 'object') {
      return JSON.stringify(result).split(/\b/).length / 10; // 대략적 추정
    }
    return 1;
  }

  // 위험도 점수 추출
  private extractRiskScore(result: any): number | undefined {
    const decision = this.extractDecision(result);

    if (decision && typeof decision === 'object') {
      if (typeof decision.risk_score === 'number') {
        return decision.risk_score;
      }

      if (decision.risk && typeof decision.risk === 'object' && typeof decision.risk.score === 'number') {
        return decision.risk.score;
      }
    }

    return undefined;
  }

  // 상태 조회
  getStatus(): {
    isRunning: boolean;
    port: number;
    loadedPolicies: string[];
    uptime?: number;
  } {
    return {
      isRunning: this.isRunning,
      port: this.config.port,
      loadedPolicies: Array.from(this.policies.keys()),
      uptime: this.opaProcess ? Date.now() - this.opaProcess.spawnFileSync : undefined
    };
  }

  // 정책 목록 조회
  listPolicies(): PolicyFile[] {
    return Array.from(this.policies.values());
  }

  // OPA 버전 확인
  async getVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      const versionProcess = spawn(this.config.executable, ['version'], {
        stdio: 'pipe'
      });

      let output = '';

      versionProcess.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      versionProcess.on('close', (code: number) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Failed to get OPA version: exit code ${code}`));
        }
      });

      versionProcess.on('error', (error: Error) => {
        reject(error);
      });
    });
  }
}

// OPA 정책 템플릿
export class OPAPolicyTemplates {
  // 보안 정책
  static readonly SECURITY_POLICY = `
package coreeeeaaaa.security

default allow = false

allow {
  input.signature.valid == true
  input.schema in allowed_schemas
  not has_critical_vulnerabilities
  risk_score_acceptable
}

allowed_schemas = {"Artifact.Build", "Artifact.Test", "Artifact.Scan", "Artifact.Deploy"}

has_critical_vulnerabilities {
  count(input.vulnerabilities[severity == "critical"]) > 0
}

risk_score_acceptable {
  (input.risk_score | 0) <= 0.7
}

# 부가 규칙
deny_high_risk {
  (input.risk_score | 0) > 0.9
}

deny_invalid_tool {
  not input.provenance.tool in allowed_tools
}

allowed_tools = {"builderA", "builderB", "secure-builder"}
`;

  // 배포 정책
  static readonly DEPLOY_POLICY = `
package coreeeeaaaa.deploy

default allow = false

allow {
  input.schema == "Artifact.Release"
  input.signature.valid == true
  all_tests_passed
  security_scan_passed
  environment_authorized
}

all_tests_passed {
  (input.tests.pass_rate | 0) >= 0.985
}

security_scan_passed {
  (input.security.scan_result | "failed") == "passed"
}

environment_authorized {
  input.environment in allowed_environments
}

allowed_environments = {"staging", "canary", "production"}
`;

  // 자원 정책
  static readonly RESOURCE_POLICY = `
package coreeeeaaaa.resources

default allow = false

allow {
  within_quota
  sufficient_resources
  no_resource_exhaustion
}

within_quota {
  input.request.cpu <= quota.cpu
  input.request.memory <= quota.memory
  input.request.gpu <= quota.gpu
}

sufficient_resources {
  available_resources.cpu >= input.request.cpu
  available_resources.memory >= input.request.memory
  available_resources.gpu >= input.request.gpu
}

no_resource_exhaustion {
  system_load.cpu < 90
  system_load.memory < 90
}

quota = {
  "cpu": 16,
  "memory": 64,
  "gpu": 4
}
`;
}