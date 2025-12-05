import { CoreSDK } from './index.js';
import { EvidencePayload } from './types.js';

export async function appendEvidence(sdk: CoreSDK, evidence: EvidencePayload): Promise<void> {
  return await sdk.appendEvidence(evidence);
}

export async function collectEvidence(type: string, path: string, content?: string): Promise<EvidencePayload> {
  return {
    type: type as 'log' | 'trace' | 'artifact' | 'test_result',
    path: path,
    content: content
  };
}