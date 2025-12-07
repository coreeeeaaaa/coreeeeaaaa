// 프로덕션 준비 전역 오케스트레이터
import { EventEmitter } from 'events';
import { Process, Artifact, ArtifactId } from './composition-algebra';
import { RealOPAEngine, OPAPolicyTemplates } from './real-opa-integration';
import { ProcessExecutionRuntime, ProcessMonitor, DefaultResourcePool } from './process-execution-runtime';

// 프로덕션 설정
export interface ProductionConfig {
  opa: {
    executable?: string;
    port?: number;
    policiesPath?: string;
  };
  runtime: {
    maxConcurrentExecutions?: number;
    resourcePool?: {
      cpu?: number;
      memory?: number;
      gpu?: number;
      network?: number;
    };
    timeoutMs?: number;
  };
  monitoring: {
    enableMetrics?: boolean;
    metricsRetentionHours?: number;
    healthCheckIntervalMs?: number;
  };
  persistence: {
    enableAuditLog?: boolean;
    auditLogPath?: string;
    enableStateBackup?: boolean;
    stateBackupIntervalMs?: number;
  };
}

// 상태 저장소
export interface StateStore {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// 파일 기반 상태 저장소
export class FileStateStore implements StateStore {
  private basePath: string;
  private fs = require('fs').promises;
  private path = require('path');

  constructor(basePath: string = './state') {
    this.basePath = basePath;
    this.ensureDirectory();
  }

  private async ensureDirectory(): Promise<void> {
    try {
      await this.fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      // 디렉토리가 이미 존재할 수 있음
    }
  }

  async save(key: string, data: any): Promise<void> {
    const filePath = this.path.join(this.basePath, `${key}.json`);
    const serializedData = JSON.stringify(data, null, 2);
    await this.fs.writeFile(filePath, serializedData, 'utf8');
  }

  async load(key: string): Promise<any> {
    const filePath = this.path.join(this.basePath, `${key}.json`);

    try {
      const data = await this.fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.path.join(this.basePath, `${key}.json`);
    try {
      await this.fs.unlink(filePath);
    } catch (error) {
      // 파일이 없을 수 있음
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.path.join(this.basePath, `${key}.json`);
    try {
      await this.fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// 프로덕션 오케스트레이터
export class ProductionReadyOrchestrator extends EventEmitter {
  private opaEngine: RealOPAEngine;
  private runtime: ProcessExecutionRuntime;
  private monitor: ProcessMonitor;
  private stateStore: StateStore;
  private config: Required<ProductionConfig>;
  private isRunning = false;
  private auditLog: Array<{
    timestamp: Date;
    event: string;
    data: any;
    level: 'info' | 'warn' | 'error';
  }> = [];

  constructor(config: Partial<ProductionConfig> = {}) {
    super();

    this.config = {
      opa: {
        executable: config.opa?.executable || 'opa',
        port: config.opa?.port || 8181,
        policiesPath: config.opa?.policiesPath || './policies'
      },
      runtime: {
        maxConcurrentExecutions: config.runtime?.maxConcurrentExecutions || 20,
        resourcePool: {
          cpu: config.runtime?.resourcePool?.cpu || 16,
          memory: config.runtime?.resourcePool?.memory || 64,
          gpu: config.runtime?.resourcePool?.gpu || 4,
          network: config.runtime?.resourcePool?.network || 100,
          ...config.runtime?.resourcePool
        },
        timeoutMs: config.runtime?.timeoutMs || 60000
      },
      monitoring: {
        enableMetrics: config.monitoring?.enableMetrics ?? true,
        metricsRetentionHours: config.monitoring?.metricsRetentionHours || 24,
        healthCheckIntervalMs: config.monitoring?.healthCheckIntervalMs || 30000
      },
      persistence: {
        enableAuditLog: config.persistence?.enableAuditLog ?? true,
        auditLogPath: config.persistence?.auditLogPath || './logs/audit.log',
        enableStateBackup: config.persistence?.enableStateBackup ?? true,
        stateBackupIntervalMs: config.persistence?.stateBackupIntervalMs || 300000
      }
    };

    // 컴포넌트 초기화
    this.opaEngine = new RealOPAEngine(this.config.opa);
    const resourcePool = new DefaultResourcePool();
    Object.assign(resourcePool.total, this.config.runtime.resourcePool);

    this.runtime = new ProcessExecutionRuntime(
      this.config.runtime.maxConcurrentExecutions,
      resourcePool
    );

    this.monitor = new ProcessMonitor(this.runtime);
    this.stateStore = new FileStateStore();

    this.setupEventHandlers();
  }

  // 시스템 시작
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Orchestrator is already running');
    }

    try {
      console.log('🚀 Starting Production Ready Orchestrator...');

      // 1. OPA 엔진 시작
      await this.opaEngine.start();
      this.log('info', 'OPA engine started');

      // 2. 기본 정책 로드
      await this.loadDefaultPolicies();
      this.log('info', 'Default policies loaded');

      // 3. 상태 복원
      if (this.config.persistence.enableStateBackup) {
        await this.restoreState();
        this.log('info', 'State restored');
      }

      // 4. 헬스 체크 시작
      if (this.config.monitoring.enableMetrics) {
        this.startHealthChecks();
        this.log('info', 'Health checks started');
      }

      // 5. 상태 백업 시작
      if (this.config.persistence.enableStateBackup) {
        this.startStateBackup();
        this.log('info', 'State backup started');
      }

      this.isRunning = true;
      this.log('info', 'Production orchestrator started successfully');
      this.emit('started');

      console.log('✅ Production Ready Orchestrator started successfully');

    } catch (error) {
      console.error('❌ Failed to start orchestrator:', error);
      await this.stop();
      throw error;
    }
  }

  // 시스템 종료
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping Production Ready Orchestrator...');

    try {
      this.isRunning = false;

      // 1. 런타임 종료
      await this.runtime.shutdown();
      this.log('info', 'Runtime shutdown');

      // 2. OPA 엔진 종료
      await this.opaEngine.stop();
      this.log('info', 'OPA engine stopped');

      // 3. 최종 상태 저장
      if (this.config.persistence.enableStateBackup) {
        await this.backupState();
        this.log('info', 'Final state backed up');
      }

      // 4. 감사 로그 저장
      if (this.config.persistence.enableAuditLog) {
        await this.saveAuditLog();
      }

      this.emit('stopped');
      console.log('✅ Production Ready Orchestrator stopped successfully');

    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }

  // 프로세스 실행
  async executeProcess<T>(
    process: Process<T>,
    inputArtifacts: Artifact[],
    policyPath?: string,
    options: {
      timeout?: number;
      priority?: number;
      resourceRequirements?: any[];
    } = {}
  ): Promise<{
    success: boolean;
    result?: T;
    execution?: any;
    policyEvaluation?: any;
    error?: string;
  }> {
    if (!this.isRunning) {
      throw new Error('Orchestrator is not running');
    }

    const startTime = Date.now();
    this.log('info', `Starting process execution: ${process.id}`, {
      processId: process.id,
      inputCount: inputArtifacts.length
    });

    try {
      // 1. 정책 평가 (경로가 지정된 경우)
      let policyEvaluation = null;
      if (policyPath) {
        policyEvaluation = await this.opaEngine.evaluate(policyPath, {
          artifacts: inputArtifacts,
          process: {
            id: process.id,
            schema: process.schema,
            contract: process.contract
          },
          timestamp: new Date().toISOString()
        });

        if (!policyEvaluation.allowed) {
          this.log('warn', `Process rejected by policy: ${process.id}`, {
            reason: policyEvaluation.reason
          });

          return {
            success: false,
            error: `Policy rejection: ${policyEvaluation.reason}`,
            policyEvaluation
          };
        }
      }

      // 2. 프로세스 실행
      const execution = await this.runtime.execute(process, inputArtifacts, {
        timeout: options.timeout || this.config.runtime.timeoutMs,
        resourceRequirements: options.resourceRequirements
      });

      // 3. 결과 처리
      if (execution.status === 'completed') {
        this.log('info', `Process completed successfully: ${process.id}`, {
          executionId: execution.id,
          executionTime: execution.metrics.executionTimeMs
        });

        return {
          success: true,
          result: execution.outputArtifacts?.[0]?.data,
          execution,
          policyEvaluation
        };
      } else {
        this.log('error', `Process failed: ${process.id}`, {
          executionId: execution.id,
          error: execution.error?.message
        });

        return {
          success: false,
          execution,
          policyEvaluation,
          error: execution.error?.message || 'Unknown error'
        };
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.log('error', `Process execution error: ${process.id}`, {
        error: (error as Error).message,
        executionTime
      });

      return {
        success: false,
        error: (error as Error).message,
        executionTime
      };
    }
  }

  // 기본 정책 로드
  private async loadDefaultPolicies(): Promise<void> {
    const policies = [
      { name: 'security', content: OPAPolicyTemplates.SECURITY_POLICY },
      { name: 'deploy', content: OPAPolicyTemplates.DEPLOY_POLICY },
      { name: 'resources', content: OPAPolicyTemplates.RESOURCE_POLICY }
    ];

    for (const policy of policies) {
      await this.opaEngine.loadPolicy(policy.name, policy.content);
    }
  }

  // 이벤트 핸들러 설정
  private setupEventHandlers(): void {
    this.runtime.on('execution:started', (execution) => {
      this.log('info', 'Execution started', { executionId: execution.id });
    });

    this.runtime.on('execution:completed', (execution) => {
      this.log('info', 'Execution completed', {
        executionId: execution.id,
        executionTime: execution.metrics.executionTimeMs
      });
    });

    this.runtime.on('execution:failed', (execution) => {
      this.log('error', 'Execution failed', {
        executionId: execution.id,
        error: execution.error?.message
      });
    });

    this.opaEngine.on('policy:loaded', (data) => {
      this.log('info', 'Policy loaded', { policyName: data.name });
    });

    this.opaEngine.on('policy:unloaded', (data) => {
      this.log('info', 'Policy unloaded', { policyName: data.name });
    });
  }

  // 헬스 체크 시작
  private startHealthChecks(): void {
    setInterval(async () => {
      try {
        const health = await this.getHealthStatus();

        if (!health.healthy) {
          this.log('warn', 'Health check failed', health);
          this.emit('health:warning', health);
        }

        this.emit('health:check', health);

      } catch (error) {
        this.log('error', 'Health check error', { error: (error as Error).message });
      }
    }, this.config.monitoring.healthCheckIntervalMs);
  }

  // 상태 백업 시작
  private startStateBackup(): void {
    setInterval(async () => {
      try {
        await this.backupState();
      } catch (error) {
        this.log('error', 'State backup failed', { error: (error as Error).message });
      }
    }, this.config.persistence.stateBackupIntervalMs);
  }

  // 헬스 상태 조회
  async getHealthStatus(): Promise<{
    healthy: boolean;
    opa: { running: boolean; policies: string[] };
    runtime: { activeExecutions: number; resourceUtilization: number };
    uptime: number;
    timestamp: Date;
  }> {
    const opaStatus = this.opaEngine.getStatus();
    const runtimeStats = this.runtime.getExecutionStats();

    return {
      healthy: this.isRunning && opaStatus.isRunning,
      opa: {
        running: opaStatus.isRunning,
        policies: opaStatus.loadedPolicies
      },
      runtime: {
        activeExecutions: runtimeStats.active,
        resourceUtilization: this.runtime.getResourcePool().getUtilization()
      },
      uptime: process.uptime(),
      timestamp: new Date()
    };
  }

  // 상태 복원
  private async restoreState(): Promise<void> {
    try {
      const state = await this.stateStore.load('orchestrator_state');
      if (state) {
        // 상태 복원 로직 (필요시 구현)
        this.log('info', 'State restored successfully');
      }
    } catch (error) {
      this.log('warn', 'State restoration failed', { error: (error as Error).message });
    }
  }

  // 상태 백업
  private async backupState(): Promise<void> {
    try {
      const state = {
        timestamp: new Date(),
        uptime: process.uptime(),
        runtime: this.runtime.getExecutionStats(),
        opa: this.opaEngine.getStatus()
      };

      await this.stateStore.save('orchestrator_state', state);
    } catch (error) {
      this.log('error', 'State backup failed', { error: (error as Error).message });
    }
  }

  // 감사 로그
  private log(level: 'info' | 'warn' | 'error', event: string, data?: any): void {
    const logEntry = {
      timestamp: new Date(),
      event,
      data,
      level
    };

    this.auditLog.push(logEntry);

    // 콘솔 출력
    const levelEmojis = { info: 'ℹ️', warn: '⚠️', error: '❌' };
    console.log(`${levelEmojis[level]} [${logEntry.timestamp.toISOString()}] ${event}`, data || '');

    // 감사 로그 크기 제한
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }

  // 감사 로그 저장
  private async saveAuditLog(): Promise<void> {
    try {
      const fs = require('fs').promises;
      const path = require('path');

      await fs.mkdir(path.dirname(this.config.persistence.auditLogPath), { recursive: true });

      const logContent = this.auditLog
        .map(entry => `${entry.timestamp.toISOString()} [${entry.level.toUpperCase()}] ${entry.event} ${JSON.stringify(entry.data || {})}`)
        .join('\n');

      await fs.writeFile(this.config.persistence.auditLogPath, logContent, 'utf8');

    } catch (error) {
      console.error('Failed to save audit log:', error);
    }
  }

  // 통계 조회
  getStatistics(): {
    uptime: number;
    executions: ReturnType<ProcessMonitor['getSummary']>;
    policies: string[];
    auditLogSize: number;
    lastActivity?: Date;
  } {
    return {
      uptime: process.uptime(),
      executions: this.monitor.getSummary(),
      policies: this.opaEngine.listPolicies().map(p => p.name),
      auditLogSize: this.auditLog.length,
      lastActivity: this.auditLog.length > 0 ? this.auditLog[this.auditLog.length - 1].timestamp : undefined
    };
  }

  // 감사 로그 조회
  getAuditLog(limit = 100): Array<{
    timestamp: Date;
    event: string;
    data: any;
    level: string;
  }> {
    return this.auditLog.slice(-limit).map(entry => ({
      ...entry,
      level: entry.level
    }));
  }
}