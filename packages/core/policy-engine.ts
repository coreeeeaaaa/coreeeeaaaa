// 정책 엔진 - OPA/Rego 기반 게이트 및 정책 평가
import { Artifact, ArtifactId } from './composition-algebra';

// 정책 평가 결과
export interface PolicyEvaluation {
  allowed: boolean;
  reason?: string;
  metrics?: {
    evaluation_time_ms: number;
    rules_matched: number;
    risk_score?: number;
  };
}

// 정책 엔진 인터페이스
export interface PolicyEngine {
  evaluate(policy: string, input: any): Promise<PolicyEvaluation>;
  loadPolicy(policyId: string, policyContent: string): Promise<void>;
  unloadPolicy(policyId: string): Promise<void>;
}

// OPA 기반 정책 엔진
export class OPAPolicyEngine implements PolicyEngine {
  private policies: Map<string, string> = new Map();
  private evaluationCache: Map<string, PolicyEvaluation> = new Map();

  async evaluate(policyId: string, input: any): Promise<PolicyEvaluation> {
    const cacheKey = this.getCacheKey(policyId, input);

    // 캐시 확인
    if (this.evaluationCache.has(cacheKey)) {
      return this.evaluationCache.get(cacheKey)!;
    }

    const startTime = Date.now();
    const policy = this.policies.get(policyId);

    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    // 실제 OPA evaluation은 여기서 시뮬레이션
    const result = await this.simulateOPAEvaluation(policy, input);
    const evaluationTime = Date.now() - startTime;

    const evaluation: PolicyEvaluation = {
      allowed: result.allowed,
      reason: result.reason,
      metrics: {
        evaluation_time_ms: evaluationTime,
        rules_matched: result.rulesMatched,
        risk_score: result.riskScore
      }
    };

    // 캐시 저장 (단기간)
    this.evaluationCache.set(cacheKey, evaluation);

    // 캐시 크기 제한
    if (this.evaluationCache.size > 1000) {
      const firstKey = this.evaluationCache.keys().next().value;
      this.evaluationCache.delete(firstKey);
    }

    return evaluation;
  }

  async loadPolicy(policyId: string, policyContent: string): Promise<void> {
    // 정책 구문 검증 (단순화)
    if (!policyContent.includes('package ') || !policyContent.includes('default ')) {
      throw new Error(`Invalid policy format for ${policyId}`);
    }

    this.policies.set(policyId, policyContent);
    console.log(`Policy loaded: ${policyId}`);
  }

  async unloadPolicy(policyId: string): Promise<void> {
    this.policies.delete(policyId);
    console.log(`Policy unloaded: ${policyId}`);
  }

  private getCacheKey(policyId: string, input: any): string {
    return `${policyId}:${JSON.stringify(input)}`;
  }

  // OPA 평가 시뮬레이션
  private async simulateOPAEvaluation(policy: string, input: any): Promise<{
    allowed: boolean;
    reason: string;
    rulesMatched: number;
    riskScore?: number;
  }> {
    // 간단한 규칙 기반 평가 시뮬레이션
    const rulesMatched = this.countRules(policy);
    let allowed = true;
    let reason = '';
    let riskScore = 0;

    // 서명 검증
    if (input.signature && input.signature.valid === false) {
      allowed = false;
      reason = 'Invalid signature';
    }

    // 스키마 검증
    if (input.schema && !this.isValidSchema(input.schema)) {
      allowed = false;
      reason = 'Invalid schema';
    }

    // 보안 점수 계산
    if (input.sbom) {
      riskScore = input.sbom.risk_score || 0;

      // 취약점 검사
      const criticalVulns = input.sbom.vulnerabilities?.filter((v: any) =>
        v.severity === 'critical'
      ).length || 0;

      if (criticalVulns > 0) {
        allowed = false;
        reason = `Critical vulnerabilities found: ${criticalVulns}`;
      }

      // 위험도 임계값
      if (riskScore > 0.7) {
        allowed = false;
        reason = `Risk score too high: ${riskScore}`;
      }
    }

    // 공급망 검증
    if (input.provenance) {
      const allowedTools = ['builderA', 'builderB', 'secure-builder'];
      if (!allowedTools.includes(input.provenance.tool)) {
        allowed = false;
        reason = `Unauthorized build tool: ${input.provenance.tool}`;
      }
    }

    return {
      allowed,
      reason: reason || 'All checks passed',
      rulesMatched,
      riskScore
    };
  }

  private countRules(policy: string): number {
    // 간단한 규칙 카운팅
    const rulePatterns = [/allow\s*\{/, /\{\s*.*\}/g];
    return rulePatterns.reduce((count, pattern) => {
      const matches = policy.match(pattern);
      return count + (matches?.length || 0);
    }, 0);
  }

  private isValidSchema(schema: string): boolean {
    const validSchemas = [
      'Artifact.Build',
      'Artifact.Test',
      'Artifact.Scan',
      'Artifact.Deploy',
      'Artifact.Release'
    ];
    return validSchemas.includes(schema);
  }
}

// 정책 템플릿
export class PolicyTemplates {
  // 보안 스캔 정책
  static readonly SECURITY_SCAN = `
package policies.security

default allow = false

allow {
  input.signature.valid == true
  input.sbom.risk_score <= 0.3
  count(input.vulns.critical) == 0
  input.provenance.tool in {"builderA", "builderB", "secure-builder"}
}

risk_score = input.sbom.risk_score
has_critical_vulns = count(input.vulns.critical) > 0
`;

  // 배포 게이트 정책
  static readonly DEPLOY_GATE = `
package policies.deploy

default allow = false

allow {
  input.schema == "Artifact.Release"
  input.signature.valid == true
  input.tests.pass_rate >= 0.985
  input.security.scan_passed == true
  input.env risk_score <= 0.2
}

deny {
  input.schema != "Artifact.Release"
}
`;

  // 자원 쿼터 정책
  static readonly RESOURCE_QUOTA = `
package policies.resources

default allow = false

allow {
  input.request.cpu <= quota.cpu
  input.request.memory <= quota.memory
  input.request.gpu <= quota.gpu
}

quota = {
  "cpu": 16,
  "memory": 64,
  "gpu": 4
}
`;

  // 팬아웃 제어 정책
  static readonly FANOUT_CONTROL = `
package policies.fanout

default allow = false

allow {
  input.fanout <= max_fanout
  input.queue_depth < 0.8
}

max_fanout = 16
queue_healthy = input.queue_depth < 0.8
`;
}

// 게이트 엔진
export class GateEngine {
  private policyEngine: PolicyEngine;
  private auditLog: Array<{
    timestamp: Date;
    artifactId: ArtifactId;
    policyId: string;
    result: PolicyEvaluation;
    decision: 'allow' | 'deny' | 'quarantine';
  }> = [];

  constructor(policyEngine: PolicyEngine) {
    this.policyEngine = policyEngine;
  }

  async evaluateGate(
    artifact: Artifact,
    policyId: string,
    options: {
      strict?: boolean;
      quarantineOnFail?: boolean;
    } = {}
  ): Promise<{
    allowed: boolean;
    decision: 'allow' | 'deny' | 'quarantine';
    evaluation: PolicyEvaluation;
  }> {
    const evaluation = await this.policyEngine.evaluate(policyId, {
      ...artifact,
      evaluation_time: new Date().toISOString()
    });

    let decision: 'allow' | 'deny' | 'quarantine' = 'deny';
    let allowed = false;

    if (evaluation.allowed) {
      decision = 'allow';
      allowed = true;
    } else if (options.quarantineOnFail && this.shouldQuarantine(artifact, evaluation)) {
      decision = 'quarantine';
    }

    // 감사 로그 기록
    this.logDecision(artifact.id, policyId, evaluation, decision);

    return { allowed, decision, evaluation };
  }

  private shouldQuarantine(artifact: Artifact, evaluation: PolicyEvaluation): boolean {
    // 격리 기준: 높은 위험도 또는 서명 실패
    return (
      evaluation.metrics?.risk_score !== undefined && evaluation.metrics.risk_score > 0.8 ||
      !artifact.signature.valid ||
      evaluation.reason?.includes('Critical vulnerabilities')
    );
  }

  private logDecision(
    artifactId: ArtifactId,
    policyId: string,
    evaluation: PolicyEvaluation,
    decision: 'allow' | 'deny' | 'quarantine'
  ): void {
    this.auditLog.push({
      timestamp: new Date(),
      artifactId,
      policyId,
      result: evaluation,
      decision
    });

    // 로그 크기 제한
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }

  getAuditLog(filter?: {
    artifactId?: ArtifactId;
    policyId?: string;
    decision?: 'allow' | 'deny' | 'quarantine';
    since?: Date;
  }) {
    let filtered = this.auditLog;

    if (filter?.artifactId) {
      filtered = filtered.filter(log => log.artifactId === filter.artifactId);
    }

    if (filter?.policyId) {
      filtered = filtered.filter(log => log.policyId === filter.policyId);
    }

    if (filter?.decision) {
      filtered = filtered.filter(log => log.decision === filter.decision);
    }

    if (filter?.since) {
      filtered = filtered.filter(log => log.timestamp >= filter.since);
    }

    return filtered;
  }

  // 불변식 검증
  async checkInvariant(
    artifacts: Artifact[],
    invariant: 'no_ungated_artifact' | 'finite_retry' | 'bounded_fanout'
  ): Promise<{
    valid: boolean;
    violations: string[];
  }> {
    const violations: string[] = [];

    switch (invariant) {
      case 'no_ungated_artifact':
        // 모든 산출물은 게이트 통과 여부 확인
        for (const artifact of artifacts) {
          if (!artifact.signature.valid) {
            violations.push(`Artifact ${artifact.id} has invalid signature`);
          }
        }
        break;

      case 'finite_retry':
        // 재시도 횟수 확인 (메타데이터 기반)
        for (const artifact of artifacts) {
          const retryCount = artifact.metadata.retry_count || 0;
          if (retryCount > 5) {
            violations.push(`Artifact ${artifact.id} exceeded retry limit: ${retryCount}`);
          }
        }
        break;

      case 'bounded_fanout':
        // 팬아웃 수 확인
        for (const artifact of artifacts) {
          const fanout = artifact.metadata.fanout || 0;
          if (fanout > 16) {
            violations.push(`Artifact ${artifact.id} exceeded fanout limit: ${fanout}`);
          }
        }
        break;
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }
}

// 서명된 아티팩트 저장소 (CAS)
export class ContentAddressableStorage {
  private artifacts: Map<string, Artifact> = new Map();
  private signatures: Map<string, string> = new Map();

  async store(artifact: Artifact): Promise<ArtifactId> {
    const hash = this.calculateHash(artifact);

    // 멱등성: 이미 존재하면 기존 것 반환
    if (this.artifacts.has(hash)) {
      return hash;
    }

    // 서명 검증
    if (!this.verifySignature(artifact)) {
      throw new Error(`Invalid signature for artifact ${artifact.id}`);
    }

    this.artifacts.set(hash, artifact);
    console.log(`Artifact stored: ${hash}`);

    return hash;
  }

  async retrieve(hash: ArtifactId): Promise<Artifact | null> {
    const artifact = this.artifacts.get(hash);
    return artifact || null;
  }

  async exists(hash: ArtifactId): Promise<boolean> {
    return this.artifacts.has(hash);
  }

  private calculateHash(artifact: Artifact): string {
    // 간단한 해시 계산 (실제로는 SHA-256 사용)
    const content = JSON.stringify(artifact.data) + artifact.schema;
    return `hash_${Buffer.from(content).toString('base64').substr(0, 16)}`;
  }

  private verifySignature(artifact: Artifact): boolean {
    // 간단한 서명 검증 (실제로는 암호화된 서명 검증)
    return artifact.signature.valid &&
           artifact.signature.sig.length > 0 &&
           artifact.signature.key_id.length > 0;
  }

  // CAS 통계
  getStats() {
    return {
      totalArtifacts: this.artifacts.size,
      storageSize: JSON.stringify([...this.artifacts.values()]).length,
      schemas: [...new Set([...this.artifacts.values()].map(a => a.schema))]
    };
  }
}