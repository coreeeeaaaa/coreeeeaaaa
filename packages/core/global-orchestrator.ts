// 전역 오케스트레이션 코어 - 불변식 강제, 제어면/실행면 분리
import { EventEmitter } from 'events';
import { Process, Artifact, ArtifactId, createArtifact } from './composition-algebra';
import { OPAGolicyEngine, GateEngine, ContentAddressableStorage } from './policy-engine';
import { EventDrivenScheduler, SimpleResourcePool, TaskItem } from './event-driven-scheduler';

// 실행 상태
export type ExecutionState = 'pending' | 'admitted' | 'running' | 'waiting' | 'completed' | 'failed' | 'compensating' | 'compensated' | 'quarantined';

// 실행 컨텍스트
export interface ExecutionContext {
  runId: string;
  pipeline: PipelineDefinition;
  stage: string;
  state: ExecutionState;
  inputs: ArtifactId[];
  outputs: ArtifactId[];
  startTime: number;
  endTime?: number;
  retryCount: number;
  logicalClock: number;
  metadata: {
    tenant: string;
    environment: string;
    securityLevel: string;
  };
}

// 파이프라인 정의
export interface PipelineDefinition {
  apiVersion: string;
  kind: string;
  metadata: {
    tenant: string;
    name: string;
    version: string;
  };
  invariants: string[];
  control: {
    scheduler: {
      mode: 'event_driven';
      fairness: string;
      backpressure: {
        max_parallel_fanout: number;
        queue_watermarks: { high: number; low: number };
      };
    };
    policy: {
      allow_effects: string[];
      quota: Record<string, number>;
    };
    orchestrator: {
      permissions: string[];
      halt_rules: Array<{ when: string }>;
      pause_if?: string[];
      resume_if?: string[];
      rollback_if?: string[];
      quarantine_if?: string[];
    };
  };
  pipeline: {
    stages: Array<{
      id: string;
      run: string;
      effects?: string[];
      ensures?: string;
      retry?: any;
      gate?: string;
      loop?: any;
      seq?: string[];
      parallelism?: any;
      compensate?: string;
      route?: any;
    }>;
  };
}

// 제어면 오케스트레이터
export class GlobalOrchestrator extends EventEmitter {
  private policyEngine: OPAGolicyEngine;
  private gateEngine: GateEngine;
  private cas: ContentAddressableStorage;
  private scheduler: EventDrivenScheduler;
  private executionContexts: Map<string, ExecutionContext> = new Map();
  private decisionLog: Array<{
    timestamp: Date;
    runId: string;
    decision: string;
    evidence: any;
    policy: string;
  }> = [];
  private logicalClock: number = 0;

  // 불변식 검증기
  private invariants = {
    no_ungated_artifact: true,
    finite_retry: true,
    bounded_fanin_fanout: true
  };

  constructor() {
    super();
    this.policyEngine = new OPAGolicyEngine();
    this.gateEngine = new GateEngine(this.policyEngine);
    this.cas = new ContentAddressableStorage();

    const resourcePool = new SimpleResourcePool({
      cpu: 16,
      memory: 64,
      gpu: 4,
      network: 10,
      storage: 100
    });

    this.scheduler = new EventDrivenScheduler(resourcePool);
    this.setupEventListeners();
  }

  // 파이프라인 실행 시작
  async executePipeline(pipeline: PipelineDefinition, initialInputs: Artifact[]): Promise<string> {
    this.logicalClock++;
    const runId = `run_${this.logicalClock}_${Date.now()}`;

    console.log(`🚀 Starting pipeline execution: ${runId}`);

    // 초기 검증
    await this.validatePipeline(pipeline);

    // 정책 로드
    await this.loadPolicies(pipeline);

    // 초기 컨텍스트 생성
    const context: ExecutionContext = {
      runId,
      pipeline,
      stage: 'initialized',
      state: 'pending',
      inputs: initialInputs.map(artifact => artifact.id),
      outputs: [],
      startTime: this.logicalClock,
      retryCount: 0,
      logicalClock: this.logicalClock,
      metadata: {
        tenant: pipeline.metadata.tenant,
        environment: 'production',
        securityLevel: 'high'
      }
    };

    this.executionContexts.set(runId, context);

    // 초기 아티팩트 CAS에 저장
    for (const artifact of initialInputs) {
      await this.cas.store(artifact);
    }

    // 파이프라인 관리 이벤트
    this.scheduler.injectEvent({
      type: 'artifact_available',
      payload: { runId, stage: 'start' }
    });

    this.emit('pipeline:started', { runId, pipeline });

    return runId;
  }

  // 파이프라인 검증
  private async validatePipeline(pipeline: PipelineDefinition): Promise<void> {
    // 불변식 검증
    for (const invariant of pipeline.invariants) {
      if (!(invariant in this.invariants)) {
        throw new Error(`Unsupported invariant: ${invariant}`);
      }
    }

    // 스테이지 순환 의존성 검증
    this.validateStageDependencies(pipeline);

    // 효과 검증
    this.validateEffects(pipeline);

    console.log('✅ Pipeline validation completed');
  }

  private validateStageDependencies(pipeline: PipelineDefinition): void {
    const stages = pipeline.pipeline.stages;
    const dependencies = new Map<string, string[]>();

    stages.forEach(stage => {
      const deps: string[] = [];
      if (stage.seq) {
        deps.push(...stage.seq);
      }
      dependencies.set(stage.id, deps);
    });

    // 순환 의존성 감지 (단순화)
    for (const [stageId, deps] of dependencies) {
      for (const dep of deps) {
        if (this.hasCircularDependency(stageId, dep, dependencies)) {
          throw new Error(`Circular dependency detected: ${stageId} -> ${dep}`);
        }
      }
    }
  }

  private hasCircularDependency(
    current: string,
    target: string,
    dependencies: Map<string, string[]>,
    visited: Set<string> = new Set()
  ): boolean {
    if (visited.has(current)) return false;
    visited.add(current);

    const deps = dependencies.get(current) || [];
    return deps.includes(target) || deps.some(dep =>
      this.hasCircularDependency(dep, target, dependencies, new Set(visited))
    );
  }

  private validateEffects(pipeline: PipelineDefinition): void {
    const allowedEffects = pipeline.control.policy.allow_effects;

    for (const stage of pipeline.pipeline.stages) {
      if (stage.effects) {
        for (const effect of stage.effects) {
          if (!allowedEffects.includes(effect)) {
            throw new Error(`Effect not allowed: ${effect} in stage ${stage.id}`);
          }
        }
      }
    }
  }

  // 정책 로드
  private async loadPolicies(pipeline: PipelineDefinition): Promise<void> {
    // 기본 정책 로드
    const policies = [
      { id: 'security.gate', content: require('./policy-templates').SECURITY_SCAN },
      { id: 'deploy.gate', content: require('./policy-templates').DEPLOY_GATE }
    ];

    for (const policy of policies) {
      await this.policyEngine.loadPolicy(policy.id, policy.content);
    }

    console.log(`✅ Loaded ${policies.length} policies`);
  }

  // 이벤트 리스너 설정
  private setupEventListeners(): void {
    this.scheduler.on('task:started', (data) => {
      this.handleTaskStarted(data);
    });

    this.scheduler.on('task:completed', (data) => {
      this.handleTaskCompleted(data);
    });

    this.scheduler.on('task:failed', (data) => {
      this.handleTaskFailed(data);
    });
  }

  private async handleTaskStarted(data: any): Promise<void> {
    const { runId, taskId } = data;
    const context = this.executionContexts.get(runId);

    if (context) {
      context.state = 'running';
      console.log(`Task started: ${taskId} for run: ${runId}`);

      this.logDecision(runId, 'task_started', {
        taskId,
        timestamp: this.logicalClock
      }, 'execution_policy');
    }
  }

  private async handleTaskCompleted(data: any): Promise<void> {
    const { runId, taskId, artifacts } = data;
    const context = this.executionContexts.get(runId);

    if (!context) return;

    console.log(`Task completed: ${taskId} for run: ${runId}`);

    // 산출물 저장 및 검증
    for (const artifact of artifacts) {
      await this.cas.store(artifact);
      await this.validateArtifact(artifact, context);
    }

    // 다음 스테이지 결정
    const nextStage = this.determineNextStage(context, artifacts);
    if (nextStage) {
      await this.executeStage(runId, nextStage, artifacts);
    } else {
      // 파이프라인 완료
      context.state = 'completed';
      context.endTime = this.logicalClock;
      this.emit('pipeline:completed', { runId, context });
    }
  }

  private async handleTaskFailed(data: any): Promise<void> {
    const { runId, taskId, error } = data;
    const context = this.executionContexts.get(runId);

    if (!context) return;

    context.retryCount++;
    console.log(`Task failed: ${taskId}, retry: ${context.retryCount}`);

    // 정책 기반 결정
    const decision = await this.makeFailureDecision(context, taskId, error);
    await this.executeDecision(runId, decision);
  }

  // 산출물 검증
  private async validateArtifact(artifact: Artifact, context: ExecutionContext): Promise<void> {
    // 불변식 검증
    const invariantsCheck = await this.gateEngine.checkInvariant([artifact], 'no_ungated_artifact');
    if (!invariantsCheck.valid) {
      throw new Error(`Invariant violation: ${invariantsCheck.violations.join(', ')}`);
    }

    // 게이트 평가
    const gateResult = await this.gateEngine.evaluateGate(
      artifact,
      'security.gate',
      { strict: true, quarantineOnFail: true }
    );

    if (!gateResult.allowed) {
      if (gateResult.decision === 'quarantine') {
        context.state = 'quarantined';
        this.emit('artifact:quarantined', { artifact, reason: gateResult.evaluation.reason });
        throw new Error(`Artifact quarantined: ${gateResult.evaluation.reason}`);
      }
      throw new Error(`Gate evaluation failed: ${gateResult.evaluation.reason}`);
    }

    console.log(`✅ Artifact validated: ${artifact.id}`);
  }

  // 다음 스테이지 결정
  private determineNextStage(context: ExecutionContext, artifacts: Artifact[]): string | null {
    const stages = context.pipeline.pipeline.stages;
    const currentStageIndex = stages.findIndex(s => s.id === context.stage);

    if (currentStageIndex === -1) return stages[0]?.id || null;
    if (currentStageIndex >= stages.length - 1) return null;

    return stages[currentStageIndex + 1].id;
  }

  // 스테이지 실행
  private async executeStage(runId: string, stageId: string, inputs: Artifact[]): Promise<void> {
    const context = this.executionContexts.get(runId);
    if (!context) throw new Error(`Context not found: ${runId}`);

    const stage = context.pipeline.pipeline.stages.find(s => s.id === stageId);
    if (!stage) throw new Error(`Stage not found: ${stageId}`);

    context.stage = stageId;
    context.state = 'admitted';

    // 게이트 검증
    if (stage.gate) {
      const gateResult = await this.gateEngine.evaluateGate(
        inputs[0],
        stage.gate,
        { strict: true }
      );

      if (!gateResult.allowed) {
        this.logDecision(runId, 'gate_rejected', {
          stage: stageId,
          reason: gateResult.evaluation.reason
        }, stage.gate);

        context.state = 'failed';
        throw new Error(`Gate rejected stage ${stageId}: ${gateResult.evaluation.reason}`);
      }
    }

    // 작업 스케줄링
    const process = await this.createProcess(stage);
    const inputIds = inputs.map(a => a.id);

    const taskId = this.scheduler.submitTask(
      process,
      inputIds,
      this.getStagePriority(stage)
    );

    this.logDecision(runId, 'stage_scheduled', {
      stage: stageId,
      taskId,
      inputs: inputIds
    }, 'scheduling_policy');

    console.log(`📋 Stage scheduled: ${stageId} with task: ${taskId}`);
  }

  // 프로세스 생성
  private async createProcess(stage: any): Promise<Process> {
    // 간단한 프로세스 생성 (실제로는 stage.run에 따라 동적 생성)
    return new class extends Process {
      readonly id = `process_${stage.id}`;
      readonly schema = stage.ensures || 'default';

      get contract() {
        return {
          requires: () => true,
          ensures: () => true,
          cost: 100,
          affinity: [],
          quota: {}
        };
      }

      async execute(input: Artifact[]): Promise<any> {
        // 시뮬레이션된 실행
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

        const outputArtifact = createArtifact(
          `output_${Date.now()}`,
          this.schema,
          { result: `processed_by_${stage.id}` },
          {
            provenance: {
              tool: stage.id,
              version: '1.0',
              inputs: input.map(a => a.id),
              timestamp: new Date()
            }
          }
        );

        return { _tag: 'Ok', value: outputArtifact };
      }
    }();
  }

  private getStagePriority(stage: any): number {
    // 스테이지별 우선순위 (높을수록 높은 우선순위)
    const priorities: Record<string, number> = {
      'build': 10,
      'scan': 9,
      'test': 8,
      'assemble': 7,
      'deploy': 6
    };

    return priorities[stage.id] || 5;
  }

  // 실패 처리 결정
  private async makeFailureDecision(
    context: ExecutionContext,
    taskId: string,
    error: any
  ): Promise<string> {
    // 정책 기반 실패 처리
    const haltRules = context.pipeline.control.orchestrator.halt_rules;

    for (const rule of haltRules) {
      if (this.evaluateCondition(rule.when, context, error)) {
        return 'halt';
      }
    }

    if (context.retryCount >= 3) {
      return 'rollback';
    }

    return 'retry';
  }

  // 결정 실행
  private async executeDecision(runId: string, decision: string): Promise<void> {
    const context = this.executionContexts.get(runId);
    if (!context) return;

    this.logDecision(runId, 'failure_decision', {
      decision,
      retryCount: context.retryCount
    }, 'failure_policy');

    switch (decision) {
      case 'retry':
        context.state = 'pending';
        // 재시도 로직은 스케줄러에서 처리
        break;

      case 'rollback':
        context.state = 'compensating';
        await this.executeCompensation(runId);
        break;

      case 'halt':
        context.state = 'failed';
        this.emit('pipeline:halted', { runId, reason: 'Policy violation' });
        break;
    }
  }

  // 보상 트랜잭션 실행
  private async executeCompensation(runId: string): Promise<void> {
    const context = this.executionContexts.get(runId);
    if (!context) return;

    console.log(`🔄 Executing compensation for run: ${runId}`);

    // 보상 로직 (단순화)
    context.state = 'compensated';
    this.emit('pipeline:compensated', { runId });
  }

  // 조건 평가
  private evaluateCondition(condition: string, context: ExecutionContext, error?: any): boolean {
    // 간단한 조건 평가 (실제로는 OPA 정책 사용)
    if (condition.includes('retry_count') && context.retryCount >= 3) {
      return true;
    }

    if (condition.includes('security') && error?.message?.includes('security')) {
      return true;
    }

    return false;
  }

  // 결정 로깅
  private logDecision(
    runId: string,
    decision: string,
    evidence: any,
    policy: string
  ): void {
    this.logicalClock++;

    const logEntry = {
      timestamp: new Date(),
      runId,
      decision,
      evidence,
      policy
    };

    this.decisionLog.push(logEntry);
    console.log(`📝 Decision logged: ${decision} for run: ${runId}`);

    // 로그 크기 제한
    if (this.decisionLog.length > 10000) {
      this.decisionLog = this.decisionLog.slice(-5000);
    }
  }

  // 불변식 검증
  async verifyInvariants(runId?: string): Promise<{
    valid: boolean;
    violations: Array<{ invariant: string; details: string }>;
  }> {
    const violations: Array<{ invariant: string; details: string }> = [];

    const contexts = runId
      ? [this.executionContexts.get(runId)].filter(Boolean) as ExecutionContext[]
      : Array.from(this.executionContexts.values());

    for (const context of contexts) {
      // no_ungated_artifact 검증
      if (context.outputs.length > 0) {
        // 실제로는 CAS에서 아티팩트를 가져와 검증
        // 여기서는 단순화
      }

      // finite_retry 검증
      if (context.retryCount > 5) {
        violations.push({
          invariant: 'finite_retry',
          details: `Run ${runId} exceeded retry limit: ${context.retryCount}`
        });
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  // 상태 조회
  getExecutionStatus(runId?: string) {
    if (runId) {
      return this.executionContexts.get(runId);
    }

    return {
      totalRuns: this.executionContexts.size,
      running: Array.from(this.executionContexts.values()).filter(c => c.state === 'running').length,
      completed: Array.from(this.executionContexts.values()).filter(c => c.state === 'completed').length,
      failed: Array.from(this.executionContexts.values()).filter(c => c.state === 'failed').length,
      scheduler: this.scheduler.getSchedulerStatus(),
      cas: this.cas.getStats()
    };
  }

  // 감사 로그
  getAuditLog(filter?: {
    runId?: string;
    decision?: string;
    since?: Date;
  }) {
    let filtered = this.decisionLog;

    if (filter?.runId) {
      filtered = filtered.filter(log => log.runId === filter.runId);
    }

    if (filter?.decision) {
      filtered = filtered.filter(log => log.decision === filter.decision);
    }

    if (filter?.since) {
      filtered = filtered.filter(log => log.timestamp >= filter.since);
    }

    return filtered;
  }

  // 시스템 종료
  async shutdown(): Promise<void> {
    this.scheduler.pause();

    // 실행 중인 모든 작업 정리
    for (const [runId, context] of this.executionContexts) {
      if (context.state === 'running') {
        context.state = 'failed';
        context.endTime = this.logicalClock;
      }
    }

    console.log('🛑 Global orchestrator shutdown completed');
  }
}

// 파이프라인 정의 예시
export const samplePipeline: PipelineDefinition = {
  apiVersion: 'v1',
  kind: 'Pipeline',
  metadata: {
    tenant: 'acme',
    name: 'secure-build-deploy',
    version: '1.0'
  },
  invariants: ['no_ungated_artifact', 'finite_retry', 'bounded_fanin_fanout'],
  control: {
    scheduler: {
      mode: 'event_driven',
      fairness: 'MLFQ+EDF',
      backpressure: {
        max_parallel_fanout: 16,
        queue_watermarks: { high: 0.8, low: 0.3 }
      }
    },
    policy: {
      allow_effects: ['FS', 'GPU', 'Net'],
      quota: { gpu: 4, 'api.qps.x': 100 }
    },
    orchestrator: {
      permissions: ['approve_stage', 'pause', 'kill', 'rollback', 'quarantine'],
      halt_rules: [
        { when: 'retry_count >= 3' },
        { when: 'security.violation' }
      ],
      pause_if: ['queue_depth > 0.9'],
      resume_if: ['queue_depth < 0.5'],
      rollback_if: ['stage.id == "deploy" && failure'],
      quarantine_if: ['artifact.sensitivity == "high" && security.violation']
    }
  },
  pipeline: {
    stages: [
      {
        id: 'build',
        run: 'task.build',
        effects: ['FS', 'CPU'],
        ensures: 'schema:Artifact.Build',
        retry: { mode: 'exp_jitter', max: 5, cb_threshold: 0.2 }
      },
      {
        id: 'scan',
        run: 'task.sec_scan',
        parallelism: { from: 'fanout(components)', max: 8 },
        gate: 'opa:policies/sec.rego#allow'
      },
      {
        id: 'test',
        run: 'task.test',
        loop: {
          until: 'metrics.pass >= 0.985 || iter >= 4',
          stagnation_guard: { window: 2, delta: 0.003 }
        }
      },
      {
        id: 'assemble',
        run: 'task.assemble',
        seq: ['build', 'scan', 'test']
      },
      {
        id: 'deploy',
        run: 'task.deploy',
        compensate: 'task.rollback',
        gate: 'schema:Artifact.Release && signature.valid == true',
        route: {
          'when: risk.env == "canary"': 'to:deploy_canary',
          'when: risk.env == "prod"': 'to:deploy_prod'
        }
      }
    ]
  }
};