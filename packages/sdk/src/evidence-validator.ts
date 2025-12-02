export interface EvidenceSource {
  kind: 'log' | 'trace' | 'git';
  hash: string;
  timestamp: string;
}

export function validate2of3(sources: EvidenceSource[]): boolean {
  const kinds = new Set(sources.map(s => s.kind));
  return kinds.size >= 2;
}
