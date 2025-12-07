import { hashObject } from '../src/utils.js';

describe('hashObject determinism', () => {
  test('order-insensitive', () => {
    const first = hashObject({ a: 1, b: 2 });
    const second = hashObject({ b: 2, a: 1 });
    expect(first).toBe(second);
  });

  test('null and undefined become same hash', () => {
    const nullHash = hashObject(null);
    const undefinedHash = hashObject(undefined);
    expect(nullHash).toBe(undefinedHash);
  });

  test('empty object equals normalized empty object', () => {
    const emptyHash = hashObject({});
    const normalizedHash = hashObject({});
    expect(emptyHash).toBe(normalizedHash);
  });
});
