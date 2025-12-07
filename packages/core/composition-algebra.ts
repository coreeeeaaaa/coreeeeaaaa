// 합성 대수 시스템 - 전역 오케스트레이션 코어
import { EventEmitter } from 'events';

// 기본 타입 정의
export type SchemaId = string;
export type ArtifactId = string;
export type PolicyId = string;

// 산출물 타입
export interface Artifact<T = any> {
  id: ArtifactId;
  schema: SchemaId;
  data: T;
  signature: {
    algo: string;
    sig: string;
    key_id: string;
    valid: boolean;
  };
  sbom?: {
    risk_score: number;
    vulnerabilities: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      cve: string;
    }>;
  };
  provenance: {
    tool: string;
    version: string;
    inputs: ArtifactId[];
    timestamp: Date;
  };
  metadata: Record<string, any>;
}

// 결과 타입
export type Result<T> =
  | { _tag: 'Ok'; value: T }
  | { _tag: 'Err'; error: Error };

// 효과 시스템
export type Effect =
  | { _tag: 'Net'; endpoint: string }
  | { _tag: 'FS'; path: string }
  | { _tag: 'GPU'; compute: number }
  | { _tag: 'Secret'; key: string }
  | { _tag: 'Mut'; state: string };

// 프로세스 계약
export interface Contract<T> {
  requires: (artifact: Artifact) => boolean;
  ensures: (artifact: Artifact<T>) => boolean;
  cost: number;
  affinity: Effect[];
  quota: Record<string, number>;
}

// 프로세스 타입
export abstract class Process<T = any> {
  abstract readonly schema: SchemaId;
  abstract readonly contract: Contract<T>;
  abstract readonly id: string;

  abstract execute(input: Artifact[]): Promise<Result<Artifact<T>>>;

  // 합성 연산자
  seq<U>(this: Process<T>, f: (a: Artifact<T>) => Process<U>): SeqProcess<T, U> {
    return new SeqProcess(this, f);
  }

  par<U>(this: Process<T>, that: Process<U>): ParProcess<T, U> {
    return new ParProcess(this, that);
  }

  alt(this: Process<T>, that: Process<T>): AltProcess<T> {
    return new AltProcess(this, that);
  }

  gate(predicate: (artifact: Artifact<T>) => boolean): GateProcess<T> {
    return new GateProcess(this, predicate);
  }

  retry(policy: RetryPolicy): RetryProcess<T> {
    return new RetryProcess(this, policy);
  }

  compensate(compensation: (artifact: Artifact<T>) => Process<void>): CompensateProcess<T> {
    return new CompensateProcess(this, compensation);
  }

  route<U>(branches: Record<string, (artifact: Artifact<T>) => Process<U>>): RouteProcess<T, U> {
    return new RouteProcess(this, branches);
  }
}

// 순차 합성 (Seq)
export class SeqProcess<T, U> extends Process<U> {
  readonly id: string;
  readonly schema: SchemaId;

  constructor(
    private readonly first: Process<T>,
    private readonly then: (a: Artifact<T>) => Process<U>
  ) {
    super();
    this.id = `seq(${first.id})`;
    this.schema = '';
  }

  get contract(): Contract<U> {
    return {
      requires: this.first.contract.requires,
      ensures: (artifact) => true, // then의 contract로 결정
      cost: this.first.contract.cost + 100, // 추정
      affinity: [...this.first.contract.affinity],
      quota: { ...this.first.contract.quota }
    };
  }

  async execute(input: Artifact[]): Promise<Result<Artifact<U>>> {
    // 첫 번째 프로세스 실행
    const firstResult = await this.first.execute(input);
    if (firstResult._tag === 'Err') {
      return firstResult;
    }

    // 두 번째 프로세스 실행
    const nextProcess = this.then(firstResult.value);
    return nextProcess.execute([firstResult.value]);
  }
}

// 병렬 합성 (Par)
export class ParProcess<T, U> extends Process<[T, U]> {
  readonly id: string;
  readonly schema: SchemaId;

  constructor(
    private readonly left: Process<T>,
    private readonly right: Process<U>
  ) {
    super();
    this.id = `par(${left.id}, ${right.id})`;
    this.schema = '';
  }

  get contract(): Contract<[T, U]> {
    return {
      requires: (artifact) =>
        this.left.contract.requires(artifact) ||
        this.right.contract.requires(artifact),
      ensures: (artifact) => true,
      cost: this.left.contract.cost + this.right.contract.cost,
      affinity: [...this.left.contract.affinity, ...this.right.contract.affinity],
      quota: {
        ...this.left.contract.quota,
        ...this.right.contract.quota
      }
    };
  }

  async execute(input: Artifact[]): Promise<Result<Artifact<[T, U]>>> {
    // 병렬 실행
    const [leftResult, rightResult] = await Promise.all([
      this.left.execute(input),
      this.right.execute(input)
    ]);

    if (leftResult._tag === 'Err') return leftResult;
    if (rightResult._tag === 'Err') return rightResult;

    // 결합된 아티팩트 생성
    const combinedArtifact: Artifact<[T, U]> = {
      id: `combined_${Date.now()}`,
      schema: this.schema,
      data: [leftResult.value.data, rightResult.value.data],
      signature: {
        algo: 'combined',
        sig: 'combined_sig',
        key_id: 'combined_key',
        valid: true
      },
      provenance: {
        tool: 'ParProcess',
        version: '1.0',
        inputs: [leftResult.value.id, rightResult.value.id],
        timestamp: new Date()
      },
      metadata: {
        left_id: leftResult.value.id,
        right_id: rightResult.value.id
      }
    };

    return { _tag: 'Ok', value: combinedArtifact };
  }
}

// 대안 합성 (Alt)
export class AltProcess<T> extends Process<T> {
  readonly id: string;
  readonly schema: SchemaId;

  constructor(
    private readonly primary: Process<T>,
    private readonly alternative: Process<T>
  ) {
    super();
    this.id = `alt(${primary.id}, ${alternative.id})`;
    this.schema = primary.schema;
  }

  get contract(): Contract<T> {
    return this.primary.contract; // primary를 따름
  }

  async execute(input: Artifact[]): Promise<Result<Artifact<T>>> {
    // 먼저 primary 시도
    const primaryResult = await this.primary.execute(input);
    if (primaryResult._tag === 'Ok') {
      return primaryResult;
    }

    // 실패시 alternative 시도
    console.log(`Primary failed, trying alternative: ${primaryResult.error.message}`);
    return this.alternative.execute(input);
  }
}

// 게이트 (Gate)
export class GateProcess<T> extends Process<T> {
  readonly id: string;
  readonly schema: SchemaId;

  constructor(
    private readonly inner: Process<T>,
    private readonly predicate: (artifact: Artifact<T>) => boolean
  ) {
    super();
    this.id = `gate(${inner.id})`;
    this.schema = inner.schema;
  }

  get contract(): Contract<T> {
    return {
      ...this.inner.contract,
      requires: (artifact) =>
        this.inner.contract.requires(artifact) &&
        this.predicate(artifact)
    };
  }

  async execute(input: Artifact[]): Promise<Result<Artifact<T>>> {
    // 입력 아티팩트에 대해 게이트 체크
    for (const artifact of input) {
      if (!this.predicate(artifact)) {
        return {
          _tag: 'Err',
          error: new Error(`Gate rejected artifact: ${artifact.id}`)
        };
      }
    }

    return this.inner.execute(input);
  }
}

// 재시도 (Retry)
export interface RetryPolicy {
  mode: 'exponential' | 'linear' | 'fixed';
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  circuitBreakerThreshold: number;
}

export class RetryProcess<T> extends Process<T> {
  readonly id: string;
  readonly schema: SchemaId;

  constructor(
    private readonly inner: Process<T>,
    private readonly policy: RetryPolicy
  ) {
    super();
    this.id = `retry(${inner.id})`;
    this.schema = inner.schema;
  }

  get contract(): Contract<T> {
    return {
      ...this.inner.contract,
      cost: this.inner.contract.cost * (this.policy.maxAttempts + 1)
    };
  }

  async execute(input: Artifact[]): Promise<Result<Artifact<T>>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.policy.maxAttempts; attempt++) {
      try {
        const result = await this.inner.execute(input);

        if (result._tag === 'Ok') {
          return result;
        }

        lastError = result.error;

        if (attempt < this.policy.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          console.log(`Retry attempt ${attempt}/${this.policy.maxAttempts} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.policy.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      _tag: 'Err',
      error: new Error(`Retry failed after ${this.policy.maxAttempts} attempts: ${lastError?.message}`)
    };
  }

  private calculateDelay(attempt: number): number {
    switch (this.policy.mode) {
      case 'exponential':
        return Math.min(
          this.policy.baseDelay * Math.pow(2, attempt - 1),
          this.policy.maxDelay
        );
      case 'linear':
        return Math.min(
          this.policy.baseDelay * attempt,
          this.policy.maxDelay
        );
      case 'fixed':
        return this.policy.baseDelay;
      default:
        return this.policy.baseDelay;
    }
  }
}

// 보상 (Compensate)
export class CompensateProcess<T> extends Process<T> {
  readonly id: string;
  readonly schema: SchemaId;

  constructor(
    private readonly inner: Process<T>,
    private readonly compensation: (artifact: Artifact<T>) => Process<void>
  ) {
    super();
    this.id = `compensate(${inner.id})`;
    this.schema = inner.schema;
  }

  get contract(): Contract<T> {
    return this.inner.contract;
  }

  async execute(input: Artifact[]): Promise<Result<Artifact<T>>> {
    try {
      const result = await this.inner.execute(input);

      if (result._tag === 'Ok') {
        // 성공 시 compensation 등록 (실패 시에만 호출)
        this.registerCompensation(result.value);
      }

      return result;
    } catch (error) {
      // 실패 시 compensation 실행
      console.log('Executing compensation due to failure');
      // 실제 보상 로직은 외부에서 관리
      throw error;
    }
  }

  private registerCompensation(artifact: Artifact<T>): void {
    // 보상 동작 등록 (실제 구현은 외부 컨텍스트에서)
    console.log(`Compensation registered for artifact: ${artifact.id}`);
  }
}

// 라우팅 (Route)
export class RouteProcess<T, U> extends Process<U> {
  readonly id: string;
  readonly schema: SchemaId;

  constructor(
    private readonly inner: Process<T>,
    private readonly branches: Record<string, (artifact: Artifact<T>) => Process<U>>
  ) {
    super();
    this.id = `route(${inner.id})`;
    this.schema = ''; // 동적으로 결정
  }

  get contract(): Contract<U> {
    // 모든 브랜치의 contract 결합
    return {
      requires: this.inner.contract.requires,
      ensures: (artifact) => true,
      cost: this.inner.contract.cost + 100,
      affinity: this.inner.contract.affinity,
      quota: this.inner.contract.quota
    };
  }

  async execute(input: Artifact[]): Promise<Result<Artifact<U>>> {
    const result = await this.inner.execute(input);

    if (result._tag === 'Err') {
      return result;
    }

    // 브랜치 선택
    for (const [branchName, branchFn] of Object.entries(this.branches)) {
      try {
        const branchProcess = branchFn(result.value);
        const branchResult = await branchProcess.execute([result.value]);

        if (branchResult._tag === 'Ok') {
          return branchResult;
        }
      } catch (error) {
        console.log(`Branch ${branchName} failed:`, (error as Error).message);
        continue;
      }
    }

    return {
      _tag: 'Err',
      error: new Error('All routing branches failed')
    };
  }
}

// 루프 (Loop)
export class LoopProcess<T> extends Process<T[]> {
  readonly id: string;
  readonly schema: SchemaId;

  constructor(
    private readonly body: (state: T, iteration: number) => Promise<{
      result: T;
      shouldContinue: boolean;
    }>,
    private readonly options: {
      maxIterations: number;
      stagnationGuard?: {
        window: number;
        delta: number;
      };
    }
  ) {
    super();
    this.id = 'loop';
    this.schema = '';
  }

  get contract(): Contract<T[]> {
    return {
      requires: () => true,
      ensures: () => true,
      cost: this.options.maxIterations * 100,
      affinity: [],
      quota: {}
    };
  }

  async execute(input: Artifact[]): Promise<Result<Artifact<T[]>>> {
    const results: T[] = [];
    let currentState: T | undefined;

    if (input.length > 0) {
      currentState = input[0].data as T;
    }

    let previousResults: T[] = [];

    for (let iteration = 0; iteration < this.options.maxIterations; iteration++) {
      try {
        const bodyResult = await this.body(
          currentState as T,
          iteration
        );

        results.push(bodyResult.result);
        currentState = bodyResult.result;

        // 정체 상태 감지
        if (this.options.stagnationGuard) {
          const { window, delta } = this.options.stagnationGuard;

          if (results.length >= window) {
            const recent = results.slice(-window);
            const hasSignificantChange = this.detectChange(recent, delta);

            if (!hasSignificantChange) {
              console.log(`Stagnation detected at iteration ${iteration}, stopping loop`);
              break;
            }
          }
        }

        if (!bodyResult.shouldContinue) {
          console.log(`Loop completed naturally at iteration ${iteration}`);
          break;
        }
      } catch (error) {
        return {
          _tag: 'Err',
          error: new Error(`Loop failed at iteration ${iteration}: ${(error as Error).message}`)
        };
      }
    }

    const resultArtifact: Artifact<T[]> = {
      id: `loop_result_${Date.now()}`,
      schema: this.schema,
      data: results,
      signature: {
        algo: 'loop',
        sig: 'loop_sig',
        key_id: 'loop_key',
        valid: true
      },
      provenance: {
        tool: 'LoopProcess',
        version: '1.0',
        inputs: input.map(a => a.id),
        timestamp: new Date()
      },
      metadata: {
        iterations: results.length,
        final_state: currentState
      }
    };

    return { _tag: 'Ok', value: resultArtifact };
  }

  private detectChange(recent: T[], delta: number): boolean {
    // 단순화된 변화 감지 - 실제로는 더 정교한 로직 필요
    if (recent.length < 2) return true;

    // 마지막 두 결과의 차이 확인 (단순 문자열 비교)
    const lastTwo = recent.slice(-2);
    return JSON.stringify(lastTwo[0]) !== JSON.stringify(lastTwo[1]);
  }
}

// 유틸리티 함수
export function createArtifact<T>(
  id: ArtifactId,
  schema: SchemaId,
  data: T,
  options: Partial<Pick<Artifact<T>, 'signature' | 'provenance' | 'metadata'>> = {}
): Artifact<T> {
  return {
    id,
    schema,
    data,
    signature: {
      algo: 'SHA256',
      sig: `sig_${Math.random().toString(36).substr(2, 9)}`,
      key_id: 'default_key',
      valid: true,
      ...options.signature
    },
    provenance: {
      tool: 'manual',
      version: '1.0',
      inputs: [],
      timestamp: new Date(),
      ...options.provenance
    },
    metadata: {
      ...options.metadata
    }
  };
}

export function ok<T>(value: Artifact<T>): Result<T> {
  return { _tag: 'Ok', value };
}

export function err<T>(error: Error): Result<T> {
  return { _tag: 'Err', error };
}