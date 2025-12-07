// 이벤트 기반 스케줄러 - MLFQ+EDF 하이브리드, 벽시계 금지
import { EventEmitter } from 'events';
import { Process, Artifact, ArtifactId } from './composition-algebra';

// 이벤트 정의
export interface SchedulingEvent {
  id: string;
  type: 'artifact_available' | 'resource_available' | 'deadline_exceeded' | 'failure' | 'completion';
  timestamp: number; // Logical timestamp
  payload: any;
}

// 작업 항목
export interface TaskItem {
  id: string;
  process: Process;
  priority: number;
  deadline?: number; // Logical deadline
  inputArtifacts: ArtifactId[];
  queueLevel: number; // MLFQ level
  waitingTime: number;
  lastPromotion: number;
  metrics: {
    executionTime?: number;
    completionRate: number;
    failures: number;
  };
}

// 큐 수위 기반 백프레셔
export interface QueueWatermark {
  high: number;  // 팬아웃 감소 임계값
  low: number;   // 팬아웃 증가 임계값
}

// 스케줄러 상태
export type SchedulerState = 'idle' | 'running' | 'paused' | 'overloaded';

export class EventDrivenScheduler extends EventEmitter {
  private logicalClock: number = 0;
  private eventQueue: SchedulingEvent[] = [];
  private taskQueues: TaskItem[][] = []; // MLFQ levels
  private runningTasks: Map<string, TaskItem> = new Map();
  private resourcePool: ResourcePool;
  private queueWatermarks: QueueWatermark = { high: 0.8, low: 0.3 };
  private state: SchedulerState = 'idle';
  private fanoutMultiplier: number = 1.0;

  // 스케줄링 정책
  private policy = {
    maxFanout: 16,
    quantum: 100, // Time quantum (logical units)
    boostInterval: 1000, // Priority boost interval (logical time)
    agingFactor: 1.1,  // Aging factor for lower priority queues
    deadlineSensitivity: 2.0 // EDF weight factor
  };

  constructor(initialResources: ResourcePool) {
    super();
    this.resourcePool = initialResources;
    this.initializeMLFQ();
  }

  // MLFQ 초기화 (5개 큐 레벨)
  private initializeMLFQ(): void {
    this.taskQueues = [[], [], [], [], []]; // 0: highest, 4: lowest priority
  }

  // 이벤트 주입 (유일한 외부 입력)
  injectEvent(event: Omit<SchedulingEvent, 'id' | 'timestamp'>): void {
    this.logicalClock++;
    const schedulingEvent: SchedulingEvent = {
      id: `event_${this.logicalClock}`,
      timestamp: this.logicalClock,
      ...event
    };

    this.eventQueue.push(schedulingEvent);
    this.sortEventQueue();
    this.processEvents();
  }

  // 작업 제출
  submitTask(
    process: Process,
    inputArtifacts: ArtifactId[],
    priority: number = 5,
    deadline?: number
  ): string {
    this.logicalClock++;

    const task: TaskItem = {
      id: `task_${this.logicalClock}`,
      process,
      priority,
      deadline,
      inputArtifacts,
      queueLevel: 0, // Start at highest priority
      waitingTime: 0,
      lastPromotion: this.logicalClock,
      metrics: {
        completionRate: 1.0,
        failures: 0
      }
    };

    // MLFQ 레벨 결정 (우선순위 기반)
    task.queueLevel = Math.min(4, Math.floor((5 - priority) / 2));

    this.taskQueues[task.queueLevel].push(task);
    this.state = 'running';

    console.log(`Task submitted: ${task.id}, queue level: ${task.queueLevel}`);

    // 이벤트 생성
    this.injectEvent({
      type: 'artifact_available',
      payload: { taskId: task.id }
    });

    return task.id;
  }

  // 이벤트 처리 루프
  private processEvents(): void {
    while (this.eventQueue.length > 0 && this.state !== 'paused') {
      const event = this.eventQueue.shift()!;
      this.handleEvent(event);
      this.scheduleNext();
    }
  }

  // 이벤트 핸들러
  private handleEvent(event: SchedulingEvent): void {
    switch (event.type) {
      case 'artifact_available':
        this.handleArtifactAvailable(event);
        break;

      case 'resource_available':
        this.handleResourceAvailable(event);
        break;

      case 'deadline_exceeded':
        this.handleDeadlineExceeded(event);
        break;

      case 'failure':
        this.handleFailure(event);
        break;

      case 'completion':
        this.handleCompletion(event);
        break;
    }
  }

  private handleArtifactAvailable(event: SchedulingEvent): void {
    // 리소스 확인 후 스케줄링 시도
    this.checkBackpressureAndSchedule();
  }

  private handleResourceAvailable(event: SchedulingEvent): void {
    // 리소스 해제 후 다음 작업 스케줄링
    this.scheduleNext();
  }

  private handleDeadlineExceeded(event: SchedulingEvent): void {
    const taskId = event.payload.taskId;
    const task = this.findTask(taskId);

    if (task && this.runningTasks.has(taskId)) {
      console.log(`Deadline exceeded for task: ${taskId}`);
      this.terminateTask(taskId, 'deadline_exceeded');
    }
  }

  private handleFailure(event: SchedulingEvent): void {
    const { taskId, error } = event.payload;
    const task = this.findTask(taskId);

    if (task) {
      task.metrics.failures++;
      task.metrics.completionRate = Math.max(0, task.metrics.completionRate - 0.1);

      console.log(`Task failed: ${taskId}, reason: ${error}`);

      // 재시도 또는 종료 결정
      if (task.metrics.failures < 3) {
        // 재시도: 우선순위 상향
        this.promoteTask(task);
      } else {
        this.terminateTask(taskId, 'max_retries_exceeded');
      }
    }
  }

  private handleCompletion(event: SchedulingEvent): void {
    const { taskId, result, executionTime } = event.payload;
    const task = this.runningTasks.get(taskId);

    if (task) {
      task.metrics.executionTime = executionTime;
      task.metrics.completionRate = Math.min(1.0, task.metrics.completionRate + 0.1);

      console.log(`Task completed: ${taskId}, time: ${executionTime}`);

      this.runningTasks.delete(taskId);

      // 리소스 해제 이벤트
      this.injectEvent({
        type: 'resource_available',
        payload: { resources: task.process.contract.affinity }
      });
    }
  }

  // 다음 작업 스케줄링
  private scheduleNext(): void {
    if (this.state !== 'running') return;

    // 백프레셔 체크
    if (this.isOverloaded()) {
      this.state = 'overloaded';
      console.log('System overloaded - reducing fanout');
      return;
    }

    const nextTask = this.selectNextTask();
    if (!nextTask) return;

    if (this.canExecuteTask(nextTask)) {
      this.executeTask(nextTask);
    } else {
      // 리소스 부족 - 대기
      console.log(`Insufficient resources for task: ${nextTask.id}`);
    }
  }

  // MLFQ + EDF 하이브리드 작업 선택
  private selectNextTask(): TaskItem | null {
    const now = this.logicalClock;

    // 1. 최상위 큐부터 검색
    for (let level = 0; level < this.taskQueues.length; level++) {
      const queue = this.taskQueues[level];
      if (queue.length === 0) continue;

      // 2. 해당 큐에서 EDF 기반 정렬
      const sortedTasks = queue.sort((a, b) => {
        // 데드라인 기반 정렬
        if (a.deadline && b.deadline) {
          const aUrgency = a.deadline - now;
          const bUrgency = b.deadline - now;
          return aUrgency - bUrgency;
        }

        // 우선순위 기반 정렬
        return b.priority - a.priority;
      });

      return sortedTasks[0];
    }

    return null;
  }

  // 작업 실행 가능 여부 확인
  private canExecuteTask(task: TaskItem): boolean {
    const required = task.process.contract.affinity;
    return this.resourcePool.checkAvailability(required);
  }

  // 작업 실행
  private executeTask(task: TaskItem): void {
    // 큐에서 제거
    const queue = this.taskQueues[task.queueLevel];
    const index = queue.indexOf(task);
    if (index > -1) {
      queue.splice(index, 1);
    }

    // 리소스 할당
    this.resourcePool.allocate(task.process.contract.affinity);

    // 실행 중 목록에 추가
    this.runningTasks.set(task.id, task);

    console.log(`Executing task: ${task.id}, queue level: ${task.queueLevel}`);

    // 비동기 실행 시뮬레이션
    this.simulateTaskExecution(task);
  }

  // 작업 실행 시뮬레이션
  private async simulateTaskExecution(task: TaskItem): Promise<void> {
    try {
      // 실행 시간 시뮬레이션 (랜덤)
      const executionTime = Math.random() * 200 + 100;

      setTimeout(() => {
        this.logicalClock++;
        this.injectEvent({
          type: 'completion',
          payload: {
            taskId: task.id,
            result: 'success',
            executionTime
          }
        });
      }, executionTime);

    } catch (error) {
      this.logicalClock++;
      this.injectEvent({
        type: 'failure',
        payload: {
          taskId: task.id,
          error: (error as Error).message
        }
      });
    }
  }

  // 백프레셔 체크 및 조정
  private checkBackpressureAndSchedule(): void {
    const totalQueued = this.getTotalQueuedTasks();
    const queueUtilization = totalQueued / (this.policy.maxFanout * this.fanoutMultiplier);

    if (queueUtilization > this.queueWatermarks.high) {
      this.fanoutMultiplier = Math.max(0.5, this.fanoutMultiplier * 0.8);
      console.log(`Reducing fanout multiplier to: ${this.fanoutMultiplier}`);
    } else if (queueUtilization < this.queueWatermarks.low) {
      this.fanoutMultiplier = Math.min(1.0, this.fanoutMultiplier * 1.2);
      console.log(`Increasing fanout multiplier to: ${this.fanoutMultiplier}`);
    }
  }

  // MLFQ 관리
  private promoteTask(task: TaskItem): void {
    task.queueLevel = Math.max(0, task.queueLevel - 1);
    task.lastPromotion = this.logicalClock;
    this.taskQueues[task.queueLevel].push(task);
    console.log(`Task promoted: ${task.id} to level ${task.queueLevel}`);
  }

  private demoteTask(task: TaskItem): void {
    task.queueLevel = Math.min(this.taskQueues.length - 1, task.queueLevel + 1);
    this.taskQueues[task.queueLevel].push(task);
    console.log(`Task demoted: ${task.id} to level ${task.queueLevel}`);
  }

  // 주기적 우선순위 부스트 (Aging)
  private performPriorityBoost(): void {
    const now = this.logicalClock;

    // 가장 낮은 큐를 제외한 모든 큐의 작업을 한 단계 상향
    for (let level = 1; level < this.taskQueues.length - 1; level++) {
      const queue = this.taskQueues[level];
      const boosted: TaskItem[] = [];

      queue.forEach(task => {
        if (now - task.lastPromotion > this.policy.boostInterval) {
          task.queueLevel = level - 1;
          task.lastPromotion = now;
          boosted.push(task);
        }
      });

      // 이동된 작업들 제거
      this.taskQueues[level] = queue.filter(task => !boosted.includes(task));

      // 상위 큐에 추가
      if (level > 0) {
        this.taskQueues[level - 1].push(...boosted);
      }
    }

    if (boosted.length > 0) {
      console.log(`Priority boost: ${boosted.length} tasks promoted`);
    }
  }

  // 유틸리티 메서드
  private sortEventQueue(): void {
    this.eventQueue.sort((a, b) => a.timestamp - b.timestamp);
  }

  private findTask(taskId: string): TaskItem | undefined {
    // 실행 중인 작업에서 검색
    const running = this.runningTasks.get(taskId);
    if (running) return running;

    // 모든 큐에서 검색
    for (const queue of this.taskQueues) {
      const found = queue.find(task => task.id === taskId);
      if (found) return found;
    }

    return undefined;
  }

  private isOverloaded(): boolean {
    const totalQueued = this.getTotalQueuedTasks();
    const totalRunning = this.runningTasks.size;
    const capacity = this.policy.maxFanout * this.fanoutMultiplier;

    return (totalQueued + totalRunning) > capacity;
  }

  private getTotalQueuedTasks(): number {
    return this.taskQueues.reduce((sum, queue) => sum + queue.length, 0);
  }

  private terminateTask(taskId: string, reason: string): void {
    const task = this.runningTasks.get(taskId) || this.findTask(taskId);
    if (!task) return;

    console.log(`Terminating task: ${taskId}, reason: ${reason}`);

    // 리소스 해제
    if (this.runningTasks.has(taskId)) {
      this.resourcePool.deallocate(task.process.contract.affinity);
      this.runningTasks.delete(taskId);
    }

    // 모든 큐에서 제거
    this.taskQueues.forEach(queue => {
      const index = queue.findIndex(t => t.id === taskId);
      if (index > -1) {
        queue.splice(index, 1);
      }
    });
  }

  // 공개 API
  getSchedulerStatus() {
    return {
      state: this.state,
      logicalClock: this.logicalClock,
      queues: this.taskQueues.map((queue, level) => ({
        level,
        length: queue.length,
        avgWaitingTime: queue.reduce((sum, task) => sum + task.waitingTime, 0) / queue.length || 0
      })),
      running: this.runningTasks.size,
      fanoutMultiplier: this.fanoutMultiplier,
      resourceUtilization: this.resourcePool.getUtilization()
    };
  }

  pause(): void {
    this.state = 'paused';
    console.log('Scheduler paused');
  }

  resume(): void {
    if (this.state === 'paused') {
      this.state = 'running';
      console.log('Scheduler resumed');
      this.processEvents();
    }
  }

  // 주기적 작업 (외부에서 호출)
  tick(): void {
    this.logicalClock++;

    // 주기적 우선순위 부스트
    if (this.logicalClock % this.policy.boostInterval === 0) {
      this.performPriorityBoost();
    }

    // 이벤트 처리
    this.processEvents();
  }
}

// 리소스 풀
export interface ResourcePool {
  cpu: number;
  memory: number;
  gpu: number;
  network: number;
  storage: number;
}

export class SimpleResourcePool implements ResourcePool {
  private allocated: ResourcePool;
  private total: ResourcePool;

  constructor(total: ResourcePool) {
    this.total = { ...total };
    this.allocated = { cpu: 0, memory: 0, gpu: 0, network: 0, storage: 0 };
  }

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
      }
    }
  }

  getUtilization(): Omit<ResourcePool, 'storage'> {
    return {
      cpu: this.allocated.cpu / this.total.cpu,
      memory: this.allocated.memory / this.total.memory,
      gpu: this.allocated.gpu / this.total.gpu,
      network: this.allocated.network / this.total.network
    };
  }

  getTotal(): ResourcePool {
    return { ...this.total };
  }

  getAllocated(): ResourcePool {
    return { ...this.allocated };
  }
}