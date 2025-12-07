import { EventEmitter } from 'events';
import { ParallelTeamOrchestrator, TeamMember, Task, Workflow, Checkpoint } from './team-orchestrator';
import { SmartScheduler, SchedulingDecision, SchedulingContext } from './smart-scheduler';

// 생명체 시스템 상태
export type LifecycleState =
  | 'initializing'     // 초기화 중
  | 'growing'         // 성장 단계
  | 'maturing'        // 성숙 단계
  | 'adapting'        // 환경 적응 중
  | 'healing'         // 장애 회복 중
  | 'thriving'        // 최적 상태
  | 'degrading'       // 성능 저하
  | 'hibernating'     // 절전 모드
  | 'terminating';    // 종료 중

// 생명체 메트릭스
export interface LifecycleMetrics {
  state: LifecycleState;
  health: number;              // 0-100
  growth: number;              // 0-100
  adaptation: number;          // 0-100
  resilience: number;          // 0-100
  efficiency: number;          // 0-100
  vitality: number;            // 0-100 (종합 점수)
  age: number;                 // 실행 시간 (ms)
  experience: number;          // 처리한 작업 수
  wisdom: number;              // 학습된 패턴 수
}

// 환경 요소
export interface EnvironmentFactors {
  load: number;                // 시스템 부하 (0-100)
  stress: number;              // 스트레스 수준 (0-100)
  resources: {                 // 가용 리소스
    cpu: number;              // (0-100)
    memory: number;           // (0-100)
    network: number;          // (0-100)
  };
  threats: string[];           // 외부 위협 요소
  opportunities: string[];     // 기회 요소
}

// 생명체 행동 패턴
export interface BehaviorPattern {
  id: string;
  name: string;
  triggers: string[];          // 활성화 조건
  actions: () => void;         // 실행할 동작
  energy: number;              // 에너지 소모량
  priority: number;            // 우선순위
}

// 진화 전략
export interface EvolutionStrategy {
  mutate(chance: number): void;   // 돌연변이
  crossover(partner: LifecycleOrchestrator): void; // 교배
  select(): boolean;              // 선택 여부
  fitness(): number;              // 적응도
}

// 생명체 오케스트레이터
export class LifecycleOrchestrator extends EventEmitter {
  private baseOrchestrator: ParallelTeamOrchestrator;
  private smartScheduler: SmartScheduler;
  private state: LifecycleState = 'initializing';
  private metrics: LifecycleMetrics;
  private environment: EnvironmentFactors;
  private behaviors: BehaviorPattern[] = [];
  private isAlive = false;
  private lifecycleTimer?: NodeJS.Timeout;
  private experience: Map<string, any> = new Map();
  private patterns: Map<string, number> = new Map(); // 학습된 패턴

  constructor() {
    super();

    this.baseOrchestrator = new ParallelTeamOrchestrator();
    this.smartScheduler = new SmartScheduler();

    this.metrics = {
      state: this.state,
      health: 50,
      growth: 0,
      adaptation: 0,
      resilience: 0,
      efficiency: 0,
      vitality: 50,
      age: 0,
      experience: 0,
      wisdom: 0
    };

    this.environment = {
      load: 0,
      stress: 0,
      resources: { cpu: 50, memory: 50, network: 50 },
      threats: [],
      opportunities: []
    };

    this.setupLifecycleIntegration();
    this.initializeBehaviors();
  }

  // 생명체 시스템 시작 (탄생)
  async birth(config: {
    teamMembers: Omit<TeamMember, 'id' | 'status'>[];
    initialWorkflows: Array<{ name: string; tasks: Omit<Task, 'id' | 'status' | 'created' | 'updated'>[] }>;
  }): Promise<void> {
    console.log('🌱 Lifecycle orchestrator is being born...');

    this.state = 'initializing';
    this.updateMetrics();

    // 팀 멤버 생성
    for (const memberConfig of config.teamMembers) {
      this.baseOrchestrator.registerMember(memberConfig);
    }

    // 초기 워크플로우 생성
    for (const workflowConfig of config.initialWorkflows) {
      this.baseOrchestrator.createWorkflow(workflowConfig.name, workflowConfig.tasks);
    }

    // 생명 주기 시작
    this.startLifecycle();

    // 지능형 처리 시작
    await this.baseOrchestrator.startProcessing();

    this.state = 'growing';
    this.isAlive = true;
    this.updateMetrics();

    console.log('🎉 Lifecycle orchestrator born successfully!');
    this.emit('born', { state: this.state, metrics: this.metrics });
  }

  // 생명 주기 메인 루프
  private startLifecycle(): void {
    this.lifecycleTimer = setInterval(() => {
      this.live();
    }, 1000); // 1초 간격으로 생명 활동
  }

  // 생명 활동
  private live(): void {
    if (!this.isAlive) return;

    this.metrics.age += 1000; // 1초 경과
    this.perceiveEnvironment();
    this.updateInternalState();
    this.makeDecisions();
    this.executeBehaviors();
    this.adaptAndEvolve();
    this.updateMetrics();

    this.emit('heartbeat', {
      state: this.state,
      metrics: this.metrics,
      environment: this.environment
    });
  }

  // 환경 인지
  private perceiveEnvironment(): void {
    const systemStatus = this.baseOrchestrator.getStatus();
    const schedulerStatus = this.smartScheduler.getSchedulerStatus();

    // 시스템 부하 계산
    this.environment.load = Math.min(100, (
      (systemStatus.teamStatus.busy / systemStatus.teamStatus.total) * 50 +
      (systemStatus.taskStatus.processing / Math.max(1, systemStatus.taskStatus.total)) * 30 +
      (systemStatus.workflowStatus.active / Math.max(1, systemStatus.workflowStatus.total)) * 20
    ));

    // 스트레스 수준 계산
    this.environment.stress = Math.min(100, (
      (systemStatus.metrics.errorRate * 2) +
      (this.environment.load * 0.5) +
      ((100 - schedulerStatus.averageConfidence) * 0.3)
    ));

    // 리소스 사용량 (시뮬레이션)
    this.environment.resources = {
      cpu: Math.min(100, this.environment.load + Math.random() * 20),
      memory: Math.min(100, 50 + this.environment.load * 0.3 + Math.random() * 10),
      network: Math.min(100, 30 + this.environment.load * 0.2 + Math.random() * 15)
    };

    // 위협과 기회 식별
    this.identifyThreatsAndOpportunities(systemStatus, schedulerStatus);
  }

  // 내부 상태 업데이트
  private updateInternalState(): void {
    const prevHealth = this.metrics.health;

    // 상태 전이 규칙
    if (this.environment.stress > 80) {
      if (this.state !== 'healing' && this.state !== 'hibernating') {
        this.state = 'healing';
        console.log('🏥 System is under high stress - entering healing mode');
      }
    } else if (this.metrics.health > 80 && this.environment.load < 30) {
      if (this.state !== 'thriving') {
        this.state = 'thriving';
        console.log('✨ System is in optimal condition - thriving!');
      }
    } else if (this.environment.load > 70) {
      if (this.state !== 'adapting') {
        this.state = 'adapting';
        console.log('🔄 System is adapting to high load');
      }
    } else if (this.state === 'healing' && this.environment.stress < 50) {
      this.state = 'maturing';
      console.log('🌿 System recovered and is maturing');
    }

    // 상태 변경 이벤트
    if (prevHealth !== this.metrics.health) {
      this.emit('state_changed', {
        fromState: this.state,
        health: this.metrics.health,
        environment: this.environment
      });
    }
  }

  // 의사결정
  private makeDecisions(): void {
    const context: SchedulingContext = {
      currentWorkflows: this.getCurrentWorkflows(),
      availableMembers: this.getAvailableTeamMembers(),
      systemLoad: this.environment.resources,
      recentFailures: this.getRecentFailures(),
      performanceHistory: new Map()
    };

    // 스마트 스케줄러에게 결정 위임
    this.smartScheduler.makeSchedulingDecision(context)
      .then(decisions => {
        for (const decision of decisions) {
          this.executeSchedulingDecision(decision);
        }
      })
      .catch(error => {
        console.error('🤖 Smart scheduler decision failed:', error);
        this.fallbackDecision();
      });
  }

  // 스케줄링 결정 실행
  private executeSchedulingDecision(decision: SchedulingDecision): void {
    switch (decision.type) {
      case 'proceed':
        console.log(`🚀 Proceeding with ${decision.tasks.length} tasks (priority: ${decision.priority})`);
        // 작업 진행 로직은 기본 오케스트레이터가 처리
        break;

      case 'wait':
        console.log(`⏳ Waiting: ${decision.reason} (${decision.waitTime}ms)`);
        this.emit('waiting', { reason: decision.reason, waitTime: decision.waitTime });
        break;

      case 'pause':
        console.log(`⏸️ Pausing workflow: ${decision.workflowId} - ${decision.reason}`);
        this.baseOrchestrator.pause();
        this.emit('workflow_paused', { workflowId: decision.workflowId, reason: decision.reason });
        break;

      case 'terminate':
        console.log(`🛑 Terminating workflow: ${decision.workflowId} - ${decision.reason}`);
        this.baseOrchestrator.terminate(decision.reason);
        this.state = 'terminating';
        this.emit('workflow_terminated', { workflowId: decision.workflowId, reason: decision.reason });
        break;
    }
  }

  // 행동 패턴 실행
  private executeBehaviors(): void {
    const activeBehaviors = this.behaviors.filter(behavior => {
      return behavior.triggers.some(trigger => this.isTriggerActive(trigger)) &&
             this.metrics.vitality >= behavior.energy;
    });

    // 우선순위 순으로 실행
    activeBehaviors.sort((a, b) => b.priority - a.priority);

    for (const behavior of activeBehaviors) {
      if (this.metrics.vitality >= behavior.energy) {
        console.log(`🎭 Executing behavior: ${behavior.name}`);
        behavior.actions();
        this.metrics.vitality -= behavior.energy;
        this.experience.set(behavior.id, (this.experience.get(behavior.id) || 0) + 1);
      }
    }
  }

  // 적응 및 진화
  private adaptAndEvolve(): void {
    // 경험에서 패턴 학습
    this.learnFromExperience();

    // 환경에 적응
    if (this.state === 'adapting') {
      this.adaptToEnvironment();
    }

    // 진화 조건 확인
    if (this.shouldEvolve()) {
      this.evolve();
    }
  }

  // 경험 학습
  private learnFromExperience(): void {
    for (const [behaviorId, count] of this.experience.entries()) {
      if (count > 10) { // 10번 이상 실행된 행동은 패턴으로 학습
        const patternStrength = Math.min(1.0, count / 50);
        this.patterns.set(behaviorId, patternStrength);
        this.metrics.wisdom = Math.min(100, this.metrics.wisdom + patternStrength * 0.1);
      }
    }
  }

  // 환경 적응
  private adaptToEnvironment(): void {
    this.metrics.adaptation = Math.min(100, this.metrics.adaptation + 1);

    // 높은 부하에 대한 적응
    if (this.environment.load > 70) {
      this.metrics.resilience = Math.min(100, this.metrics.resilience + 0.5);
    }

    // 스트레스에 대한 적응
    if (this.environment.stress > 50) {
      this.metrics.health = Math.max(20, this.metrics.health - 0.2);
    } else {
      this.metrics.health = Math.min(100, this.metrics.health + 0.1);
    }
  }

  // 진화 조건 확인
  private shouldEvolve(): boolean {
    return this.metrics.age > 60000 && // 1분 이상 생존
           this.metrics.wisdom > 50 &&  // 지수 수준 높고
           this.metrics.experience > 100; // 충분한 경험
  }

  // 진화
  private evolve(): void {
    console.log('🧬 System is evolving!');

    this.metrics.growth = Math.min(100, this.metrics.growth + 10);
    this.metrics.wisdom = Math.min(100, this.metrics.wisdom + 5);

    // 새로운 행동 패턴 생성
    this.createNewBehavior();

    this.emit('evolved', {
      metrics: this.metrics,
      patterns: this.patterns.size,
      behaviors: this.behaviors.length
    });
  }

  // 새로운 행동 패턴 생성
  private createNewBehavior(): void {
    const newBehavior: BehaviorPattern = {
      id: `evolved_${Date.now()}`,
      name: `Evolved Behavior ${this.behaviors.length + 1}`,
      triggers: ['high_efficiency', 'low_stress'],
      actions: () => {
        this.metrics.efficiency = Math.min(100, this.metrics.efficiency + 2);
        console.log('✨ Evolved behavior executed - efficiency improved!');
      },
      energy: 5,
      priority: 7
    };

    this.behaviors.push(newBehavior);
    console.log(`🆕 New behavior created: ${newBehavior.name}`);
  }

  // 메트릭스 업데이트
  private updateMetrics(): void {
    // 종합 생명력 계산
    this.metrics.vitality = (
      this.metrics.health * 0.3 +
      this.metrics.growth * 0.2 +
      this.metrics.adaptation * 0.2 +
      this.metrics.resilience * 0.15 +
      this.metrics.efficiency * 0.15
    );

    // 효율성 계산
    const systemStatus = this.baseOrchestrator.getStatus();
    if (systemStatus.metrics.totalTasks > 0) {
      this.metrics.efficiency = systemStatus.metrics.successRate;
      this.metrics.experience = systemStatus.metrics.totalTasks;
    }

    this.metrics.state = this.state;
  }

  // 초기 행동 패턴 설정
  private initializeBehaviors(): void {
    this.behaviors = [
      {
        id: 'conservation',
        name: 'Energy Conservation',
        triggers: ['low_resources', 'high_stress'],
        actions: () => {
          this.baseOrchestrator.pause();
          console.log('🔋 Conserving energy - pausing non-critical operations');
        },
        energy: 2,
        priority: 8
      },
      {
        id: 'growth_spurt',
        name: 'Growth Spurt',
        triggers: ['optimal_conditions', 'low_stress'],
        actions: () => {
          this.metrics.growth = Math.min(100, this.metrics.growth + 5);
          console.log('🌱 Growth spurt - taking advantage of optimal conditions');
        },
        energy: 10,
        priority: 6
      },
      {
        id: 'healing',
        name: 'Self Healing',
        triggers: ['high_error_rate', 'damaged_state'],
        actions: () => {
          this.metrics.health = Math.min(100, this.metrics.health + 3);
          this.metrics.resilience = Math.min(100, this.metrics.resilience + 2);
          console.log('💚 Self healing activated');
        },
        energy: 8,
        priority: 9
      },
      {
        id: 'learning',
        name: 'Learning Mode',
        triggers: ['novel_situation', 'uncertainty'],
        actions: () => {
          this.metrics.wisdom = Math.min(100, this.metrics.wisdom + 1);
          console.log('🧠 Learning from new patterns');
        },
        energy: 5,
        priority: 4
      }
    ];
  }

  // 기본 오케스트레이터와 통합
  private setupLifecycleIntegration(): void {
    // 기본 오케스트레이터 이벤트 리스닝
    this.baseOrchestrator.on('task:completed', (data) => {
      this.emit('lifecycle_task_completed', data);
      this.metrics.experience++;
    });

    this.baseOrchestrator.on('task:failed', (data) => {
      this.emit('lifecycle_task_failed', data);
      this.smartScheduler.updateCircuitBreaker(data.task.id, false);
    });

    this.baseOrchestrator.on('workflow:completed', (data) => {
      this.emit('lifecycle_workflow_completed', data);
      if (this.state === 'maturing') {
        this.state = 'thriving';
      }
    });

    this.baseOrchestrator.on('workflow:failed', (data) => {
      this.emit('lifecycle_workflow_failed', data);
      if (this.state !== 'healing') {
        this.state = 'healing';
      }
    });

    // 스마트 스케줄러 이벤트 리스닝
    this.smartScheduler.on('circular_dependency_resolved', (data) => {
      console.log('🔗 Circular dependency resolved - adapting system');
      this.metrics.adaptation = Math.min(100, this.metrics.adaptation + 5);
    });
  }

  // 위협과 기회 식별
  private identifyThreatsAndOpportunities(systemStatus: any, schedulerStatus: any): void {
    this.environment.threats = [];
    this.environment.opportunities = [];

    if (systemStatus.metrics.errorRate > 20) {
      this.environment.threats.push('high_error_rate');
    }

    if (this.environment.resources.cpu > 80) {
      this.environment.threats.push('cpu_exhaustion');
    }

    if (schedulerStatus.circuitBreakersOpen > 0) {
      this.environment.threats.push('circuit_breakers_active');
    }

    if (this.environment.load < 20 && this.metrics.health > 80) {
      this.environment.opportunities.push('growth_opportunity');
    }

    if (schedulerStatus.averageConfidence > 0.8) {
      this.environment.opportunities.push('high_prediction_confidence');
    }
  }

  // 헬퍼 메서드들
  private isTriggerActive(trigger: string): boolean {
    switch (trigger) {
      case 'low_resources':
        return this.environment.resources.cpu < 20 || this.environment.resources.memory < 20;
      case 'high_stress':
        return this.environment.stress > 70;
      case 'optimal_conditions':
        return this.environment.load < 30 && this.metrics.health > 80;
      case 'high_error_rate':
        return this.environment.threats.includes('high_error_rate');
      case 'damaged_state':
        return this.metrics.health < 40;
      case 'novel_situation':
        return this.environment.threats.length > 2;
      case 'uncertainty':
        return this.environment.stress > 50 && this.environment.load > 50;
      case 'high_efficiency':
        return this.metrics.efficiency > 80;
      case 'low_stress':
        return this.environment.stress < 30;
      default:
        return false;
    }
  }

  private getCurrentWorkflows(): Workflow[] {
    // 실제 구현에서는 기본 오케스트레이터에서 워크플로우 상태를 가져와야 함
    return [];
  }

  private getAvailableTeamMembers(): TeamMember[] {
    // 실제 구현에서는 기본 오케스트레이터에서 팀 멤버 상태를 가져와야 함
    return [];
  }

  private getRecentFailures(): Array<{ taskId: string; error: string; timestamp: Date }> {
    // 실제 구현에서는 실패 기록을 추적해야 함
    return [];
  }

  private fallbackDecision(): void {
    console.log('🔄 Using fallback decision strategy');
    // 간단한 폴백 전략 구현
  }

  // 공개 API
  public getState(): LifecycleState & { metrics: LifecycleMetrics; environment: EnvironmentFactors } {
    return {
      ...this.state,
      metrics: this.metrics,
      environment: this.environment
    };
  }

  public getExperience(): Map<string, any> {
    return new Map(this.experience);
  }

  public getPatterns(): Map<string, number> {
    return new Map(this.patterns);
  }

  public async performHealthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (this.metrics.health < 30) {
      issues.push('Critical health level');
      recommendations.push('Enter healing mode immediately');
    }

    if (this.environment.stress > 80) {
      issues.push('Extreme stress levels');
      recommendations.push('Reduce workload and activate conservation mode');
    }

    if (this.environment.resources.cpu > 90) {
      issues.push('CPU exhaustion risk');
      recommendations.push('Scale up resources or pause non-critical tasks');
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }

  // 절전 모드
  public hibernate(): void {
    if (this.state !== 'hibernating') {
      this.state = 'hibernating';
      this.baseOrchestrator.pause();
      console.log('🛌 Entering hibernation mode');
      this.emit('hibernating', { metrics: this.metrics });
    }
  }

  // 깨어나기
  public awaken(): void {
    if (this.state === 'hibernating') {
      this.state = 'maturing';
      this.baseOrchestrator.resume();
      console.log('😊 Awakening from hibernation');
      this.emit('awakening', { metrics: this.metrics });
    }
  }

  // 종료 (죽음)
  public async die(reason: string): Promise<void> {
    console.log(`💀 Lifecycle orchestrator is dying: ${reason}`);

    this.isAlive = false;
    this.state = 'terminating';

    if (this.lifecycleTimer) {
      clearInterval(this.lifecycleTimer);
    }

    await this.baseOrchestrator.terminate(reason);

    this.emit('died', { reason, metrics: this.metrics, age: this.metrics.age });

    console.log(`🕊️ Rested in peace after ${this.metrics.age}ms of existence`);
  }
}