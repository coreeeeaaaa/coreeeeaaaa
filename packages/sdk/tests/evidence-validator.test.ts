import { validate2of3, EvidenceSource } from '../src/evidence-validator.js';

describe('Evidence validator', () => {
  test('returns true when two distinct kinds present', () => {
    const sources: EvidenceSource[] = [
      { kind: 'log', hash: 'a', timestamp: '2024-01-01T00:00:00Z' },
      { kind: 'trace', hash: 'b', timestamp: '2024-01-01T00:01:00Z' },
    ];
    expect(validate2of3(sources)).toBe(true);
  });

  test('returns false when only one kind', () => {
    const sources: EvidenceSource[] = [
      { kind: 'log', hash: 'x', timestamp: '2024-01-01T00:00:00Z' },
      { kind: 'log', hash: 'y', timestamp: '2024-01-01T00:01:00Z' },
    ];
    expect(validate2of3(sources)).toBe(false);
  });
});
