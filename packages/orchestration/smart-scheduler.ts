import { EventEmitter } from 'events';
import { Task, TeamMember, Workflow, Checkpoint } from './team-orchestrator';

// 스케줄링 결정 타입
export type SchedulingDecision =
  | { type: 'proceed', tasks: string[], priority: number }
  | { type: 'wait', reason: string, waitTime: number }
  | { type: 'pause', workflowId: string, reason: string }
  | { type: 'terminate', workflowId: string, reason: 'critical_failure' };

// 순환 의존성 감지 결과
export interface CircularDependency {
  workflowId: string;
  cycle: string[];
  severity: 'warning' | 'error' | 'critical';
  resolution: 'auto_break' | 'manual_review' | 'terminate';
}

// 성능 예측 모델
export interface PerformancePrediction {
  taskId: string;
  estimatedDuration: number;
  confidenceLevel: number;
  resourceRequirements: {
    cpu: number;
    memory: number;
    network: number;
  };
  riskFactors: string[];
}

// 워크플로우 상태 분석
export interface WorkflowAnalysis {
  workflowId: string;
  health: 'healthy' | 'warning' | 'critical';
  bottlenecks: string[];
  performance: {
    throughput: number;
    latency: number;
    errorRate: number;
  };
  recommendations: string[];
}

// 스케줄링 규칙
export interface SchedulingRule {
  id: string;
  name: string;
  condition: (context: SchedulingContext) => boolean;
  action: (context: SchedulingContext) => SchedulingDecision;
  priority: number;
  enabled: boolean;
}

// 스케줄링 컨텍스트
export interface SchedulingContext {
  currentWorkflows: Workflow[];
  availableMembers: TeamMember[];
  systemLoad: {
    cpu: number;
    memory: number;
    network: number;
  };
  recentFailures: Array<{
    taskId: string;
    error: string;
    timestamp: Date;
  }>;
  performanceHistory: Map<string, PerformancePrediction[]>;
}

// 지능형 스케줄러
export class SmartScheduler extends EventEmitter {
  private rules: SchedulingRule[] = [];
  private performanceHistory: Map<string, PerformancePrediction[]> = new Map();
  private circuitBreakers: Map<string, {
    failureCount: number;
    lastFailure: Date;
    state: 'closed' | 'open' | 'half_open';
    cooldownUntil?: Date;
  }> = new Map();
  private thresholds = {
    maxFailureRate: 0.3,      // 30% 실패율
    maxLatency: 10000,        // 10초
    minThroughput: 0.1,       // 분당 0.1 작업
    circuitBreakerThreshold: 5, // 5회 실패시 차단
    circuitBreakerCooldown: 60000 // 1분 쿨다운
  };

  constructor() {
    super();
    this.initializeDefaultRules();
  }

  // 기본 규칙 초기화
  private initializeDefaultRules(): void {
    // 1. 의존성 기반 스케줄링 규칙
    this.addRule({
      id: 'dependency_based_scheduling',
      name: '의존성 기반 스케줄링',
      priority: 1,
      enabled: true,
      condition: (context) => context.currentWorkflows.some(wf => wf.status === 'active'),
      action: (context) => this.scheduleBasedOnDependencies(context)
    });

    // 2. 성능 기반 조정 규칙
    this.addRule({
      id: 'performance_based_adjustment',
      name: '성능 기반 동적 조정',
      priority: 2,
      enabled: true,
      condition: (context) => this.detectPerformanceIssues(context),
      action: (context) => this.adjustForPerformance(context)
    });

    // 3. 장애 회복 규칙
    this.addRule({
      id: 'failure_recovery',
      name: '장애 자동 회복',
      priority: 3,
      enabled: true,
      condition: (context) => this.hasRecentFailures(context),
      action: (context) => this.handleFailures(context)
    });

    // 4. 순환 의존성 감지 규칙
    this.addRule({
      id: 'circular_dependency_detection',
      name: '순환 의존성 감지 및 처리',
      priority: 4,
      enabled: true,
      condition: (context) => this.hasCircularDependencies(context),
      action: (context) => this.resolveCircularDependencies(context)
    });

    // 5. 리소스 최적화 규칙
    this.addRule({
      id: 'resource_optimization',
      name: '리소스 사용량 최적화',
      priority: 5,
      enabled: true,
      condition: (context) => this.needsResourceOptimization(context),
      action: (context) => this.optimizeResources(context)
    });
  }

  // 규칙 추가
  addRule(rule: SchedulingRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  // 메인 스케줄링 결정
  async makeSchedulingDecision(context: SchedulingContext): Promise<SchedulingDecision[]> {
    const decisions: SchedulingDecision[] = [];

    console.log('🧠 Smart scheduling analysis started...');

    // 순환 의존성 미리 확인
    const circularDeps = this.detectCircularDependencies(context);
    if (circularDeps.length > 0) {
      console.log(`⚠️ Circular dependencies detected: ${circularDeps.length}`);
      await this.handleCircularDependencies(circularDeps);
    }

    // 활성 규칙 순서대로 실행
    for (const rule of this.rules.filter(r => r.enabled)) {
      if (rule.condition(context)) {
        try {
          const decision = rule.action(context);
          decisions.push(decision);

          console.log(`📋 Rule "${rule.name}" triggered:`, {
            type: decision.type,
            priority: this.rules.indexOf(rule)
          });
        } catch (error) {
          console.error(`❌ Rule "${rule.name}" failed:`, error);
        }
      }
    }

    // 성능 예측 업데이트
    await this.updatePerformancePredictions(context);

    return decisions;
  }

  // 의존성 기반 스케줄링
  private scheduleBasedOnDependencies(context: SchedulingContext): SchedulingDecision {
    const readyTasks: string[] = [];

    for (const workflow of context.currentWorkflows) {
      if (workflow.status !== 'active') continue;

      for (const task of workflow.tasks) {
        if (task.status === 'pending') {
          const dependenciesMet = task.dependencies.every(depId =>
            this.isTaskCompleted(depId, context)
          );

          if (dependenciesMet) {
            readyTasks.push(task.id);
          }
        }
      }
    }

    return {
      type: 'proceed',
      tasks: readyTasks,
      priority: this.calculateTaskPriority(readyTasks, context)
    };
  }

  // 성능 기반 동적 조정
  private adjustForPerformance(context: SchedulingContext): SchedulingDecision {
    const analysis = this.analyzeWorkflowPerformance(context);

    if (analysis.health === 'critical') {
      // 심각한 성능 문제 - 워크플로우 일시 중지
      const criticalWorkflow = analysis.bottlenecks[0];
      return {
        type: 'pause',
        workflowId: criticalWorkflow,
        reason: `Critical performance issues detected: ${analysis.recommendations.join(', ')}`
      };
    }

    // 병목 현항 완화를 위한 우선순위 조정
    return {
      type: 'proceed',
      tasks: this.getOptimalTaskOrder(context),
      priority: 2
    };
  }

  // 장애 처리
  private handleFailures(context: SchedulingContext): SchedulingDecision {
    const recentFailures = context.recentFailures.filter(f =>
      Date.now() - f.timestamp.getTime() < 300000 // 5분 이내
    );

    if (recentFailures.length >= this.thresholds.circuitBreakerThreshold) {
      // 서킷 브레이커 활성화
      const mostFailedTask = this.getMostFailedTask(recentFailures);

      return {
        type: 'pause',
        workflowId: this.getWorkflowIdFromTask(mostFailedTask, context),
        reason: `Too many failures for task ${mostFailedTask}. Circuit breaker activated.`
      };
    }

    // 재시도 전략 적용
    return {
      type: 'proceed',
      tasks: this.getRetryCandidates(context),
      priority: 1
    };
  }

  // 순환 의존성 해결
  private resolveCircularDependencies(context: SchedulingContext): SchedulingDecision {
    const circularDeps = this.detectCircularDependencies(context);

    if (circularDeps.some(dep => dep.severity === 'critical')) {
      // 치명적인 순환 의존성 - 워크플로우 종료
      const criticalDep = circularDeps.find(dep => dep.severity === 'critical')!;

      return {
        type: 'terminate',
        workflowId: criticalDep.workflowId,
        reason: 'Critical circular dependency detected - cannot resolve automatically'
      };
    }

    // 자동 해결 가능한 순환 의존성
    return {
      type: 'wait',
      reason: 'Resolving circular dependencies automatically...',
      waitTime: 5000
    };
  }

  // 리소스 최적화
  private optimizeResources(context: SchedulingContext): SchedulingDecision {
    const systemLoad = context.systemLoad;

    if (systemLoad.cpu > 80 || systemLoad.memory > 80) {
      // 높은 리소스 사용량 - 우선순위 낮은 작업 지연
      return {
        type: 'wait',
        reason: 'High system resource usage - waiting for resources to free up',
        waitTime: 10000
      };
    }

    // 여유 리소스 - 추가 작업 스케줄링
    return {
      type: 'proceed',
      tasks: this.getAdditionalTasks(context),
      priority: 3
    };
  }

  // 순환 의존성 감지
  private detectCircularDependencies(context: SchedulingContext): CircularDependency[] {
    const dependencies = new Map<string, string[]>();
    const circularDeps: CircularDependency[] = [];

    // 의존성 맵 구축
    for (const workflow of context.currentWorkflows) {
      for (const task of workflow.tasks) {
        dependencies.set(task.id, task.dependencies);
      }
    }

    // DFS를 통한 순환 의존성 감지
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectCycle = (taskId: string, path: string[]): string[] | null => {
      if (recursionStack.has(taskId)) {
        const cycleStart = path.indexOf(taskId);
        return path.slice(cycleStart).concat(taskId);
      }

      if (visited.has(taskId)) return null;

      visited.add(taskId);
      recursionStack.add(taskId);
      path.push(taskId);

      const deps = dependencies.get(taskId) || [];
      for (const depId of deps) {
        const cycle = detectCycle(depId, [...path]);
        if (cycle) return cycle;
      }

      recursionStack.delete(taskId);
      return null;
    };

    for (const taskId of dependencies.keys()) {
      if (!visited.has(taskId)) {
        const cycle = detectCycle(taskId, []);
        if (cycle) {
          circularDeps.push({
            workflowId: this.getWorkflowIdFromTask(cycle[0], context),
            cycle,
            severity: cycle.length > 3 ? 'critical' : 'warning',
            resolution: cycle.length > 3 ? 'terminate' : 'auto_break'
          });
        }
      }
    }

    return circularDeps;
  }

  // 성능 예측 업데이트
  private async updatePerformancePredictions(context: SchedulingContext): Promise<void> {
    for (const workflow of context.currentWorkflows) {
      for (const task of workflow.tasks) {
        const prediction = await this.predictTaskPerformance(task, context);

        const history = this.performanceHistory.get(task.id) || [];
        history.push(prediction);

        // 최근 10개 예측만 유지
        if (history.length > 10) {
          history.shift();
        }

        this.performanceHistory.set(task.id, history);
      }
    }
  }

  // 작업 성능 예측
  private async predictTaskPerformance(task: Task, context: SchedulingContext): Promise<PerformancePrediction> {
    const history = this.performanceHistory.get(task.id) || [];
    const similarTasks = this.getSimilarTasks(task, context);

    let estimatedDuration = 3000; // 기본 3초
    let confidenceLevel = 0.5;

    // 과거 데이터 기반 예측
    if (history.length > 0) {
      const avgDuration = history.reduce((sum, p) => sum + p.estimatedDuration, 0) / history.length;
      estimatedDuration = avgDuration * 0.7 + estimatedDuration * 0.3;
      confidenceLevel = Math.min(0.9, 0.5 + history.length * 0.1);
    }

    // 유사한 작업 기반 예측
    if (similarTasks.length > 0) {
      const avgSimilarDuration = similarTasks.reduce((sum, t) => {
        const h = this.performanceHistory.get(t.id) || [];
        return sum + (h.length > 0 ? h[h.length - 1].estimatedDuration : 3000);
      }, 0) / similarTasks.length;

      estimatedDuration = estimatedDuration * 0.6 + avgSimilarDuration * 0.4;
      confidenceLevel = Math.min(0.95, confidenceLevel + 0.1);
    }

    // 현재 시스템 부하 반영
    const loadFactor = Math.max(1, (context.systemLoad.cpu + context.systemLoad.memory) / 100);
    estimatedDuration *= loadFactor;

    return {
      taskId: task.id,
      estimatedDuration,
      confidenceLevel,
      resourceRequirements: {
        cpu: Math.random() * 0.5 + 0.1,
        memory: Math.random() * 0.3 + 0.1,
        network: Math.random() * 0.2 + 0.05
      },
      riskFactors: this.identifyRiskFactors(task, context)
    };
  }

  // 위험 요소 식별
  private identifyRiskFactors(task: Task, context: SchedulingContext): string[] {
    const riskFactors: string[] = [];

    // 의존성이 많은 작업
    if (task.dependencies.length > 3) {
      riskFactors.push('high_dependency_complexity');
    }

    // 실패 이력이 있는 작업
    const recentFailures = context.recentFailures.filter(f => f.taskId === task.id);
    if (recentFailures.length > 0) {
      riskFactors.push('previous_failures');
    }

    // 리소스 집약적 작업
    const prediction = this.performanceHistory.get(task.id);
    if (prediction && prediction.length > 0) {
      const latest = prediction[prediction.length - 1];
      if (latest.resourceRequirements.cpu > 0.7) {
        riskFactors.push('cpu_intensive');
      }
      if (latest.resourceRequirements.memory > 0.7) {
        riskFactors.push('memory_intensive');
      }
    }

    return riskFactors;
  }

  // 헬퍼 메서드들
  private isTaskCompleted(taskId: string, context: SchedulingContext): boolean {
    for (const workflow of context.currentWorkflows) {
      const task = workflow.tasks.find(t => t.id === taskId);
      if (task && task.status === 'completed') return true;
    }
    return false;
  }

  private calculateTaskPriority(taskIds: string[], context: SchedulingContext): number {
    // 예상 처리 시간, 의존성 복잡도, 실패 확률 등을 고려한 우선순위 계산
    return Math.random() * 10; // 단순화된 계산
  }

  private getOptimalTaskOrder(context: SchedulingContext): string[] {
    return context.currentWorkflows
      .flatMap(wf => wf.tasks.filter(t => t.status === 'pending'))
      .sort((a, b) => {
        // 우선순위, 예상 처리 시간 등 고려
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .map(t => t.id);
  }

  private analyzeWorkflowPerformance(context: SchedulingContext): WorkflowAnalysis {
    const activeWorkflows = context.currentWorkflows.filter(wf => wf.status === 'active');

    return {
      workflowId: activeWorkflows[0]?.id || '',
      health: 'healthy',
      bottlenecks: [],
      performance: {
        throughput: 0.5,
        latency: 2000,
        errorRate: 0.1
      },
      recommendations: []
    };
  }

  private detectPerformanceIssues(context: SchedulingContext): boolean {
    const analysis = this.analyzeWorkflowPerformance(context);
    return analysis.health !== 'healthy';
  }

  private hasRecentFailures(context: SchedulingContext): boolean {
    const recentFailures = context.recentFailures.filter(f =>
      Date.now() - f.timestamp.getTime() < 300000
    );
    return recentFailures.length > 0;
  }

  private hasCircularDependencies(context: SchedulingContext): boolean {
    return this.detectCircularDependencies(context).length > 0;
  }

  private needsResourceOptimization(context: SchedulingContext): boolean {
    return context.systemLoad.cpu > 70 || context.systemLoad.memory > 70;
  }

  private getMostFailedTask(failures: Array<{ taskId: string; error: string; timestamp: Date }>): string {
    const failureCounts = new Map<string, number>();
    failures.forEach(f => {
      failureCounts.set(f.taskId, (failureCounts.get(f.taskId) || 0) + 1);
    });

    return Array.from(failureCounts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  private getWorkflowIdFromTask(taskId: string, context: SchedulingContext): string {
    for (const workflow of context.currentWorkflows) {
      if (workflow.tasks.some(t => t.id === taskId)) {
        return workflow.id;
      }
    }
    return '';
  }

  private getRetryCandidates(context: SchedulingContext): string[] {
    return context.recentFailures
      .filter(f => Date.now() - f.timestamp.getTime() > 30000) // 30초 후 재시도
      .map(f => f.taskId);
  }

  private getAdditionalTasks(context: SchedulingContext): string[] {
    return context.currentWorkflows
      .flatMap(wf => wf.tasks)
      .filter(t => t.status === 'pending' && t.priority !== 'low')
      .slice(0, 3) // 최대 3개 추가 작업
      .map(t => t.id);
  }

  private getSimilarTasks(task: Task, context: SchedulingContext): Task[] {
    return context.currentWorkflows
      .flatMap(wf => wf.tasks)
      .filter(t =>
        t.id !== task.id &&
        t.type === task.type &&
        t.priority === task.priority
      );
  }

  private async handleCircularDependencies(circularDeps: CircularDependency[]): Promise<void> {
    for (const dep of circularDeps) {
      if (dep.resolution === 'auto_break') {
        // 가장 낮은 우선순위 의존성 제거
        console.log(`🔄 Auto-resolving circular dependency in ${dep.workflowId}`);
        this.emit('circular_dependency_resolved', { dependency: dep });
      } else if (dep.resolution === 'terminate') {
        console.error(`🚨 Critical circular dependency detected - terminating workflow ${dep.workflowId}`);
        this.emit('critical_circular_dependency', { dependency: dep });
      }
    }
  }

  // 서킷 브레이커 상태 관리
  updateCircuitBreaker(taskId: string, success: boolean): void {
    const breaker = this.circuitBreakers.get(taskId) || {
      failureCount: 0,
      lastFailure: new Date(),
      state: 'closed' as const
    };

    if (success) {
      breaker.failureCount = 0;
      breaker.state = 'closed';
    } else {
      breaker.failureCount++;
      breaker.lastFailure = new Date();

      if (breaker.failureCount >= this.thresholds.circuitBreakerThreshold) {
        breaker.state = 'open';
        breaker.cooldownUntil = new Date(Date.now() + this.thresholds.circuitBreakerCooldown);
      }
    }

    this.circuitBreakers.set(taskId, breaker);
  }

  isCircuitBreakerOpen(taskId: string): boolean {
    const breaker = this.circuitBreakers.get(taskId);
    if (!breaker) return false;

    if (breaker.state === 'open' && breaker.cooldownUntil) {
      if (Date.now() > breaker.cooldownUntil.getTime()) {
        breaker.state = 'half_open';
        this.circuitBreakers.set(taskId, breaker);
        return false;
      }
      return true;
    }

    return breaker.state === 'open';
  }

  // 상태 조회
  getSchedulerStatus(): {
    totalRules: number;
    activeRules: number;
    circuitBreakersOpen: number;
    averageConfidence: number;
  } {
    const activeRules = this.rules.filter(r => r.enabled).length;
    const circuitBreakersOpen = Array.from(this.circuitBreakers.values())
      .filter(b => b.state === 'open').length;

    const allPredictions = Array.from(this.performanceHistory.values()).flat();
    const averageConfidence = allPredictions.length > 0
      ? allPredictions.reduce((sum, p) => sum + p.confidenceLevel, 0) / allPredictions.length
      : 0;

    return {
      totalRules: this.rules.length,
      activeRules,
      circuitBreakersOpen,
      averageConfidence
    };
  }
}