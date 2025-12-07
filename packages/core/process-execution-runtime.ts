import { Process, Artifact, Result } from './composition-algebra';
import { EventEmitter } from 'events';

// 프로세스 실행 환경
export interface ExecutionContext {
  id: string;
  processId: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  inputArtifacts: Artifact[];
  outputArtifacts?: Artifact[];
  error?: Error;
  metrics: {
    executionTimeMs?: number;
    memoryUsage?: number;
    resourceUtilization?: number;
  };
}

// 실행 런타임
export class ProcessExecutionRuntime extends EventEmitter {
  private activeExecutions = new Map<string, ExecutionContext>();
  private executionHistory: ExecutionContext[] = [];
  private maxConcurrentExecutions: number;
  private resourcePool: ResourcePool;

  constructor(maxConcurrentExecutions = 10, resourcePool?: ResourcePool) {
    super();
    this.maxConcurrentExecutions = maxConcurrentExecutions;
    this.resourcePool = resourcePool || new DefaultResourcePool();
  }

  // 프로세스 실행
  async execute<T>(
    process: Process<T>,
    inputArtifacts: Artifact[],
    options: {
      timeout?: number;
      priority?: number;
      resourceRequirements?: any[];
    } = {}
  ): Promise<ExecutionContext> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const context: ExecutionContext = {
      id: executionId,
      processId: process.id,
      startTime: new Date(),
      status: 'pending',
      inputArtifacts,
      metrics: {}
    };

    // 리소스 확인
    if (!this.resourcePool.checkAvailability(options.resourceRequirements || [])) {
      throw new Error(`Insufficient resources for process: ${process.id}`);
    }

    // 동시 실행 제한 확인
    if (this.activeExecutions.size >= this.maxConcurrentExecutions) {
      throw new Error(`Maximum concurrent executions (${this.maxConcurrentExecutions}) reached`);
    }

    this.activeExecutions.set(executionId, context);
    this.emit('execution:started', context);

    try {
      context.status = 'running';
      const startTime = process.hrtime.bigint();

      // 리소스 할당
      this.resourcePool.allocate(options.resourceRequirements || []);

      // 타임아웃 설정
      const timeoutMs = options.timeout || 30000;

      const result = await this.executeWithTimeout(
        process.execute(inputArtifacts),
        timeoutMs
      );

      const endTime = process.hrtime.bigint();
      context.metrics.executionTimeMs = Number(endTime - startTime) / 1000000;

      if (result._tag === 'Ok') {
        context.status = 'completed';
        context.outputArtifacts = [result.value];
        context.metrics.resourceUtilization = this.resourcePool.getUtilization();
      } else {
        context.status = 'failed';
        context.error = new Error(result.error.message);
      }

      context.endTime = new Date();
      this.emit('execution:completed', context);

      return context;

    } catch (error) {
      context.status = 'failed';
      context.error = error as Error;
      context.endTime = new Date();
      this.emit('execution:failed', context);

      throw error;
    } finally {
      // 리소스 해제
      this.resourcePool.deallocate(options.resourceRequirements || []);

      // 활성 실행에서 제거
      this.activeExecutions.delete(executionId);
      this.executionHistory.push(context);

      // 히스토리 크기 제한
      if (this.executionHistory.length > 1000) {
        this.executionHistory = this.executionHistory.slice(-500);
      }
    }
  }

  // 타임아웃 있는 실행
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  // 실행 상태 조회
  getExecutionContext(executionId: string): ExecutionContext | undefined {
    return this.activeExecutions.get(executionId);
  }

  // 모든 활성 실행 조회
  getActiveExecutions(): ExecutionContext[] {
    return Array.from(this.activeExecutions.values());
  }

  // 실행 통계
  getExecutionStats(): {
    total: number;
    active: number;
    completed: number;
    failed: number;
    averageExecutionTime: number;
    successRate: number;
  } {
    const total = this.executionHistory.length;
    const active = this.activeExecutions.size;
    const completed = this.executionHistory.filter(e => e.status === 'completed').length;
    const failed = this.executionHistory.filter(e => e.status === 'failed').length;

    const completedExecutions = this.executionHistory.filter(e =>
      e.status === 'completed' && e.metrics.executionTimeMs
    );

    const averageExecutionTime = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.metrics.executionTimeMs || 0), 0) / completedExecutions.length
      : 0;

    const successRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      active,
      completed,
      failed,
      averageExecutionTime,
      successRate
    };
  }

  // 런타임 종료
  async shutdown(): Promise<void> {
    // 활성 실행 모두 취소
    for (const [executionId, context] of this.activeExecutions) {
      context.status = 'cancelled';
      context.endTime = new Date();
      this.executionHistory.push(context);
    }

    this.activeExecutions.clear();
    this.emit('runtime:shutdown');
  }
}

// 리소스 풀 인터페이스
export interface ResourcePool {
  checkAvailability(requirements: any[]): boolean;
  allocate(requirements: any[]): void;
  deallocate(requirements: any[]): void;
  getUtilization(): number;
}

// 기본 리소스 풀 구현
export class DefaultResourcePool implements ResourcePool {
  private allocated = {
    cpu: 0,
    memory: 0,
    gpu: 0,
    network: 0
  };

  private total = {
    cpu: 8,
    memory: 16,
    gpu: 2,
    network: 100
  };

  checkAvailability(requirements: any[]): boolean {
    for (const req of requirements) {
      switch (req._tag) {
        case 'CPU':
          if (this.allocated.cpu + (req.amount || 1) > this.total.cpu) return false;
          break;
        case 'GPU':
          if (this.allocated.gpu + (req.amount || 1) > this.total.gpu) return false;
          break;
        case 'Net':
          if (this.allocated.network + 1 > this.total.network) return false;
          break;
        case 'FS':
          if (this.allocated.memory + (req.amount || 1) > this.total.memory) return false;
          break;
      }
    }
    return true;
  }

  allocate(requirements: any[]): void {
    for (const req of requirements) {
      switch (req._tag) {
        case 'CPU':
          this.allocated.cpu += req.amount || 1;
          break;
        case 'GPU':
          this.allocated.gpu += req.amount || 1;
          break;
        case 'Net':
          this.allocated.network += 1;
          break;
        case 'FS':
          this.allocated.memory += req.amount || 1;
          break;
      }
    }
  }

  deallocate(requirements: any[]): void {
    for (const req of requirements) {
      switch (req._tag) {
        case 'CPU':
          this.allocated.cpu = Math.max(0, this.allocated.cpu - (req.amount || 1));
          break;
        case 'GPU':
          this.allocated.gpu = Math.max(0, this.allocated.gpu - (req.amount || 1));
          break;
        case 'Net':
          this.allocated.network = Math.max(0, this.allocated.network - 1);
          break;
        case 'FS':
          this.allocated.memory = Math.max(0, this.allocated.memory - (req.amount || 1));
          break;
      }
    }
  }

  getUtilization(): number {
    const totalUtilization = (
      (this.allocated.cpu / this.total.cpu) +
      (this.allocated.memory / this.total.memory) +
      (this.allocated.gpu / this.total.gpu) +
      (this.allocated.network / this.total.network)
    ) / 4;

    return Math.min(1, totalUtilization);
  }

  getStatus() {
    return {
      allocated: { ...this.allocated },
      total: { ...this.total },
      utilization: this.getUtilization()
    };
  }
}

// 프로세스 모니터링
export class ProcessMonitor {
  private runtime: ProcessExecutionRuntime;
  private metrics: Map<string, any[]> = new Map();

  constructor(runtime: ProcessExecutionRuntime) {
    this.runtime = runtime;
    this.setupMonitoring();
  }

  private setupMonitoring(): void {
    this.runtime.on('execution:started', (context) => {
      this.recordMetric('executions', {
        timestamp: new Date(),
        type: 'started',
        processId: context.processId,
        executionId: context.id
      });
    });

    this.runtime.on('execution:completed', (context) => {
      this.recordMetric('executions', {
        timestamp: new Date(),
        type: 'completed',
        processId: context.processId,
        executionId: context.id,
        executionTime: context.metrics.executionTimeMs
      });
    });

    this.runtime.on('execution:failed', (context) => {
      this.recordMetric('executions', {
        timestamp: new Date(),
        type: 'failed',
        processId: context.processId,
        executionId: context.id,
        error: context.error?.message
      });
    });
  }

  private recordMetric(type: string, data: any): void {
    if (!this.metrics.has(type)) {
      this.metrics.set(type, []);
    }

    const typeMetrics = this.metrics.get(type)!;
    typeMetrics.push(data);

    // 최근 1000개만 유지
    if (typeMetrics.length > 1000) {
      this.metrics.splice(0, typeMetrics.length - 1000);
    }
  }

  // 메트릭 조회
  getMetrics(type: string, limit = 100): any[] {
    const metrics = this.metrics.get(type) || [];
    return metrics.slice(-limit);
  }

  // 통계 요약
  getSummary(): {
    totalExecutions: number;
    averageExecutionTime: number;
    errorRate: number;
    activeExecutions: number;
  } {
    const executions = this.getMetrics('executions', 1000);
    const completed = executions.filter(e => e.type === 'completed');
    const failed = executions.filter(e => e.type === 'failed');

    const averageExecutionTime = completed.length > 0
      ? completed.reduce((sum, e) => sum + (e.executionTime || 0), 0) / completed.length
      : 0;

    return {
      totalExecutions: executions.length,
      averageExecutionTime,
      errorRate: executions.length > 0 ? (failed.length / executions.length) * 100 : 0,
      activeExecutions: this.runtime.getActiveExecutions().length
    };
  }
}