import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// 작업팀 정의
export interface TeamMember {
  id: string;
  name: string;
  role: 'processor' | 'validator' | 'coordinator';
  capabilities: string[];
  status: 'idle' | 'busy' | 'error' | 'paused';
  currentTask?: TaskAssignment;
}

// 작업 정의
export interface Task {
  id: string;
  type: 'development' | 'validation' | 'testing' | 'analysis';
  priority: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  dependencies: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'blocked';
  attempts: number;
  maxAttempts: number;
  created: Date;
  updated: Date;
  results?: any;
  errors?: Error[];
}

export interface TaskAssignment {
  taskId: string;
  memberId: string;
  assignedAt: Date;
  status: 'assigned' | 'started' | 'completed' | 'failed';
  progress: number; // 0-100
}

export interface Workflow {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'failed' | 'terminated';
  tasks: Task[];
  currentStep: number;
  totalSteps: number;
  startTime: Date;
  endTime?: Date;
  results: any;
  metrics: WorkflowMetrics;
}

export interface WorkflowMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageProcessingTime: number;
  throughput: number; // tasks per minute
  errorRate: number; // percentage
}

export interface Checkpoint {
  id: string;
  workflowId: string;
  step: number;
  state: Record<string, any>;
  timestamp: Date;
  isRecoveryPoint: boolean;
}

// 이벤트 정의
interface OrchestratorEvents {
  'task:created': { task: Task };
  'task:assigned': { task: Task, member: TeamMember };
  'task:completed': { task: Task, member: TeamMember };
  'task:failed': { task: Task, member: TeamMember, error: Error };
  'task:retry': { task: Task, attempt: number };
  'workflow:created': { workflow: Workflow };
  'workflow:progress': { workflow: Workflow, progress: number };
  'workflow:completed': { workflow: Workflow };
  'workflow:failed': { workflow: Workflow, error: Error };
  'workflow:paused': { workflow: Workflow };
  'checkpoint:created': { checkpoint: Checkpoint };
  'error:recovered': { error: Error, checkpoint: Checkpoint };
  'termination:triggered': { reason: string, workflow?: Workflow };
}

export class ParallelTeamOrchestrator extends EventEmitter<OrchestratorEvents> {
  private team: TeamMember[] = [];
  private workflows: Map<string, Workflow> = new Map();
  private taskQueue: Task[] = [];
  private checkpoints: Map<string, Checkpoint> = new Map();
  private isRunning = false;
  private maxConcurrentTasks: number = 3;
  private checkpointInterval: number = 30000; // 30 seconds
  private checkpointTimer?: NodeJS.Timeout;

  // 진행 상태 추적
  private processingTasks: Map<string, { task: Task; member: TeamMember; startTime: Date }> = new Map();

  constructor() {
    super();
    this.setupCheckpointSystem();
  }

  // 팀원 등록
  registerMember(member: Omit<TeamMember, 'id' | 'status'>): TeamMember {
    const newMember: TeamMember = {
      ...member,
      id: uuidv4(),
      status: 'idle'
    };
    this.team.push(newMember);
    console.log(`👥 Team member registered: ${newMember.name} (${newMember.role})`);
    return newMember;
  }

  // 워크플로우 생성
  createWorkflow(name: string, tasks: Omit<Task, 'id' | 'status' | 'created' | 'updated'>[]): Workflow {
    const processedTasks: Task[] = tasks.map(task => ({
      ...task,
      id: uuidv4(),
      status: 'pending',
      attempts: 0,
      maxAttempts: task.maxAttempts || 3,
      created: new Date(),
      updated: new Date()
    }));

    const workflow: Workflow = {
      id: uuidv4(),
      name,
      status: 'active',
      tasks: processedTasks,
      currentStep: 0,
      totalSteps: processedTasks.length,
      startTime: new Date(),
      metrics: {
        totalTasks: processedTasks.length,
        completedTasks: 0,
        failedTasks: 0,
        averageProcessingTime: 0,
        throughput: 0,
        errorRate: 0
      },
      results: {}
    };

    this.workflows.set(workflow.id, workflow);
    this.taskQueue.push(...processedTasks);

    console.log(`📋 Workflow created: ${name} (${processedTasks.length} tasks)`);
    this.emit('workflow:created', { workflow });

    return workflow;
  }

  // 병렬 처리 시작
  async startProcessing(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Processing is already running');
    }

    this.isRunning = true;
    console.log(`🚀 Starting parallel processing (max concurrent: ${this.maxConcurrentTasks})`);

    // 메인 처리 루프
    this.processLoop();
  }

  private async processLoop(): Promise<void> {
    while (this.isRunning && (this.taskQueue.length > 0 || this.processingTasks.size > 0)) {
      await this.processAvailableTasks();
      await this.checkWorkflowProgress();
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms 간격 체크
    }

    this.isRunning = false;
    console.log('🏁 Processing completed');
  }

  private async processAvailableTasks(): Promise<void> {
    // 동시 처리 제한 확인
    while (this.processingTasks.size < this.maxConcurrentTasks && this.taskQueue.length > 0) {
      const task = this.getNextAvailableTask();
      if (!task) break;

      const member = this.assignTaskToMember(task);
      if (!member) {
        // 유휨한 멤버가 없으면 대기
        break;
      }

      this.processTask(member, task);
    }
  }

  private getNextAvailableTask(): Task | null {
    // 의존성 확인 및 우선순위 정렬
    const readyTasks = this.taskQueue.filter(task =>
      task.status === 'pending' &&
      task.dependencies.every(depId => this.isDependencyCompleted(depId))
    );

    if (readyTasks.length === 0) return null;

    // 우선순위 정렬
    readyTasks.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // 첫 번째 작업 반환
    const task = readyTasks[0];
    this.taskQueue = this.taskQueue.filter(t => t.id !== task.id);

    return task;
  }

  private assignTaskToMember(task: Task): TeamMember | null {
    // 작업에 적합한 멤버 찾기
    const availableMembers = this.team.filter(member =>
      member.status === 'idle' &&
      member.capabilities.includes(task.type)
    );

    if (availableMembers.length === 0) return null;

    // 작업이 적은 멤버 선택 (현재는 첫 번째 멤버)
    const member = availableMembers[0];
    member.status = 'busy';
    member.currentTask = {
      taskId: task.id,
      memberId: member.id,
      assignedAt: new Date(),
      status: 'assigned',
      progress: 0
    };

    console.log(`📝 Task assigned: ${task.id} → ${member.name}`);
    this.emit('task:assigned', { task, member });

    return member;
  }

  private async processTask(member: TeamMember, task: Task): Promise<void> {
    const startTime = new Date();
    this.processingTasks.set(task.id, { task, member, startTime });

    try {
      // 작업 상태 업데이트
      this.updateTaskStatus(task.id, 'in-progress');
      member.currentTask!.status = 'started';
      member.currentTask!.progress = 10;

      // 실제 작업 처리 (시뮬레이션)
      const result = await this.executeTask(member, task);

      // 성공 처리
      const processingTime = Date.now() - startTime;
      this.handleTaskCompletion(member, task, result, processingTime);

    } catch (error) {
      // 에러 처리
      const processingTime = Date.now() - startTime;
      await this.handleTaskFailure(member, task, error as Error, processingTime);
    }
  }

  private async executeTask(member: TeamMember, task: Task): Promise<any> {
    // 시뮬레이션된 작업 실행
    console.log(`⚙️  Executing task: ${task.id} by ${member.name}`);

    // 실제 구현에서는 각 멤버의 capability에 따라 실제 작업 수행
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500)); // 시뮬레이션

    return {
      result: `Task ${task.id} completed by ${member.name}`,
      processedBy: member.id,
      timestamp: new Date()
    };
  }

  private handleTaskCompletion(member: TeamMember, task: Task, result: any, processingTime: number): void {
    task.status = 'completed';
    task.results = result;
    task.updated = new Date();

    member.status = 'idle';
    member.currentTask = undefined;

    this.processingTasks.delete(task.id);

    // 워크플로우 메트릭스 업데이트
    this.updateWorkflowMetrics(task.id, processingTime, true);

    console.log(`✅ Task completed: ${task.id} (${processingTime}ms)`);
    this.emit('task:completed', { task, member });
  }

  private async handleTaskFailure(member: TeamMember, task: Task, error: Error, processingTime: number): Promise<void> {
    task.attempts++;
    task.errors = task.errors || [];
    task.errors.push(error);
    task.updated = new Date();

    // 재시도 여부 확인
    if (task.attempts < task.maxAttempts) {
      console.log(`🔄 Retrying task: ${task.id} (attempt ${task.attempts}/${task.maxAttempts})`);
      this.emit('task:retry', { task, attempt: task.attempts });

      // 작업을 다시 큐에 넣기
      task.status = 'pending';
      this.taskQueue.push(task);
    } else {
      // 최종 실패
      task.status = 'failed';
      console.log(`❌ Task failed: ${task.id} after ${task.maxAttempts} attempts`);
      this.emit('task:failed', { task, member, error });

      // 워크플로우 실패 확인
      await this.checkWorkflowFailure(task.id);
    }

    member.status = 'idle';
    member.currentTask = undefined;
    this.processingTasks.delete(task.id);

    // 워크플로우 메트릭스 업데이트
    this.updateWorkflowMetrics(task.id, processingTime, false);
  }

  private updateTaskStatus(taskId: string, status: Task['status']): void {
    const workflow = Array.from(this.workflows.values()).find(wf =>
      wf.tasks.some(task => task.id === taskId)
    );

    if (workflow) {
      const task = workflow.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = status;
        task.updated = new Date();
      }
    }
  }

  private updateWorkflowMetrics(taskId: string, processingTime: number, success: boolean): void {
    const workflow = Array.from(this.workflows.values()).find(wf =>
      wf.tasks.some(task => task.id === taskId)
    );

    if (workflow) {
      const completedTasks = workflow.tasks.filter(t => t.status === 'completed').length;
      const failedTasks = workflow.tasks.filter(t => t.status === 'failed').length;

      workflow.metrics.completedTasks = completedTasks;
      workflow.metrics.failedTasks = failedTasks;
      workflow.metrics.errorRate = (failedTasks / workflow.tasks.length) * 100;
      workflow.metrics.averageProcessingTime = (workflow.metrics.averageProcessingTime * workflow.metrics.completedTasks + processingTime) / (workflow.metrics.completedTasks + 1);

      // Checkpoint 생성
      this.createCheckpoint(workflow.id);
    }
  }

  private async checkWorkflowProgress(): Promise<void> {
    for (const workflow of this.workflows.values()) {
      if (workflow.status === 'active') {
        const completedTasks = workflow.tasks.filter(t => t.status === 'completed').length;
        const totalTasks = workflow.tasks.length;
        const progress = (completedTasks / totalTasks) * 100;

        if (workflow.currentStep !== completedTasks) {
          workflow.currentStep = completedTasks;
          console.log(`📊 Workflow progress: ${workflow.name} - ${progress.toFixed(1)}%`);
          this.emit('workflow:progress', { workflow, progress });

          // 워크플로우 완료 확인
          if (completedTasks === totalTasks) {
            await this.completeWorkflow(workflow);
          }
        }
      }
    }
  }

  private async checkWorkflowFailure(failedTaskId: string): Promise<void> {
    // 워크플로우 실패 정책 확인
    for (const workflow of this.workflows.values()) {
      const hasFailedTask = workflow.tasks.some(task => task.id === failedTaskId && task.status === 'failed');

      if (hasFailedTask && workflow.status === 'active') {
        const criticalTasks = workflow.tasks.filter(task => task.priority === 'critical' && task.status === 'failed');

        if (criticalTasks.length > 0) {
          // 중요 작업 실패 시 워크플로우 중단
          workflow.status = 'failed';
          console.log(`🚨 Workflow failed due to critical task failures: ${workflow.name}`);
          this.emit('workflow:failed', {
            workflow,
            error: new Error(`Critical task ${failedTaskId} failed`)
          });
        }
      }
    }
  }

  private async completeWorkflow(workflow: Workflow): Promise<void> {
    workflow.status = 'completed';
    workflow.endTime = new Date();

    const duration = workflow.endTime.getTime() - workflow.startTime.getTime();

    console.log(`🏁 Workflow completed: ${workflow.name} (duration: ${duration}ms)`);
    console.log(`📊 Final metrics: ${workflow.metrics.completedTasks}/${workflow.metrics.totalTasks} tasks, error rate: ${workflow.metrics.errorRate.toFixed(1)}%`);

    this.emit('workflow:completed', { workflow });
  }

  // 체크포인트 시스템
  private setupCheckpointSystem(): void {
    this.checkpointTimer = setInterval(() => {
      for (const workflow of this.workflows.values()) {
        if (workflow.status === 'active') {
          this.createCheckpoint(workflow.id);
        }
      }
    }, this.checkpointInterval);
  }

  private createCheckpoint(workflowId: string): void {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    const checkpoint: Checkpoint = {
      id: uuidv4(),
      workflowId,
      step: workflow.currentStep,
      state: {
        workflowStatus: workflow.status,
        tasks: workflow.tasks.map(task => ({
          id: task.id,
          status: task.status,
          attempts: task.attempts,
          data: task.data
        })),
        processingTasks: Array.from(this.processingTasks.entries()).map(([id, info]) => ({
          taskId: id,
          memberId: info.member.id,
          progress: info.member.currentTask?.progress || 0,
          startTime: info.startTime
        })),
        metrics: workflow.metrics
      },
      timestamp: new Date(),
      isRecoveryPoint: true
    };

    this.checkpoints.set(checkpoint.id, checkpoint);
    this.emit('checkpoint:created', { checkpoint });
  }

  // 복구 기능
  async resumeFromCheckpoint(checkpointId: string): Promise<boolean> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint || !checkpoint.isRecoveryPoint) {
      return false;
    }

    console.log(`🔄 Resuming from checkpoint: ${checkpointId}`);

    const workflow = this.workflows.get(checkpoint.workflowId);
    if (!workflow) return false;

    // 상태 복구
    workflow.status = checkpoint.state.workflowStatus as Workflow['status'];
    workflow.tasks = checkpoint.state.tasks.map((taskData: any) => ({
      ...taskData,
      created: new Date(taskData.created),
      updated: new Date(taskData.updated)
    }));
    workflow.currentStep = checkpoint.step;
    workflow.metrics = checkpoint.state.metrics;

    // 처리 중인 작업 재시도
    for (const processingTask of checkpoint.state.processingTasks) {
      const task = workflow.tasks.find(t => t.id === processingTask.taskId);
      const member = this.team.find(m => m.id === processingTask.memberId);

      if (task && member) {
        member.status = 'busy';
        member.currentTask = {
          taskId: task.id,
          memberId: member.id,
          assignedAt: new Date(),
          status: 'assigned',
          progress: processingTask.progress || 0
        };

        this.processingTasks.set(processingTask.taskId, {
          task,
          member,
          startTime: processingTask.startTime
        });
      }
    }

    // 재처리 시작
    this.emit('error:recovered', {
      error: new Error('Resumed from checkpoint'),
      checkpoint
    });

    return true;
  }

  // 종료 및 정리
  async terminate(reason: string, force: boolean = false): Promise<void> {
    console.log(`🛑 Terminating processing: ${reason} (force: ${force})`);

    this.isRunning = false;

    if (force) {
      // 강제 종료 시 모든 진행 중인 작업 중단
      for (const [taskId, info] of this.processingTasks) {
        info.member.status = 'idle';
        info.member.currentTask = undefined;
        info.task.status = 'failed';
        info.task.errors = [new Error('Workflow terminated')];
      }
      this.processingTasks.clear();
    }

    // 활성 워크플로우 중단
    for (const workflow of this.workflows.values()) {
      if (workflow.status === 'active') {
        workflow.status = force ? 'terminated' : 'completed';
        workflow.endTime = new Date();

        this.emit('termination:triggered', { reason, workflow });
      }
    }

    // 체크포인트 타이머 정리
    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
    }
  }

  // 중지/재개
  pause(): void {
    this.isRunning = false;
    console.log('⏸️ Processing paused');
  }

  resume(): void {
    if (!this.isRunning) {
      console.log('▶️️ Resuming processing...');
      this.processLoop().catch(console.error);
    }
  }

  // 상태 조회
  getStatus(): {
    isRunning: boolean;
    teamStatus: {
      total: number;
      idle: number;
      busy: number;
      error: number;
    };
    workflowStatus: {
      total: number;
      active: number;
      completed: number;
      failed: number;
    };
    taskStatus: {
      queued: number;
      processing: number;
      total: number;
    };
    metrics: {
      totalWorkflows: number;
      totalTasks: number;
      completedTasks: number;
      failedTasks: number;
      successRate: number;
      errorRate: number;
    };
  } {
    return {
      isRunning: this.isRunning,
      teamStatus: {
        total: this.team.length,
        idle: this.team.filter(m => m.status === 'idle').length,
        busy: this.team.filter(m => m.status === 'busy').length,
        error: this.team.filter(m => m.status === 'error').length
      },
      workflowStatus: {
        total: this.workflows.size,
        active: Array.from(this.workflows.values()).filter(w => w.status === 'active').length,
        completed: Array.from(this.workflows.values()).filter(w => w.status === 'completed').length,
        failed: Array.from(this.workflows.values()).filter(w => w.status === 'failed').length
      },
      taskStatus: {
        queued: this.taskQueue.length,
        processing: this.processingTasks.size,
        total: this.taskQueue.length + this.processingTasks.size
      },
      metrics: this.calculateOverallMetrics()
    };
  }

  private calculateOverallMetrics(): {
    totalWorkflows: number;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    successRate: number;
    errorRate: number;
  } {
    const totalTasks = Array.from(this.workflows.values()).reduce((sum, wf) => sum + wf.tasks.length, 0);
    const completedTasks = Array.from(this.workflows.values()).reduce((sum, wf) => sum + wf.metrics.completedTasks, 0);
    const failedTasks = Array.from(this.workflows.values()).reduce((sum, wf) => sum + wf.metrics.failedTasks, 0);

    return {
      totalWorkflows: this.workflows.size,
      totalTasks,
      completedTasks,
      failedTasks,
      successRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      errorRate: totalTasks > 0 ? (failedTasks / totalTasks) * 100 : 0
    };
  }
}