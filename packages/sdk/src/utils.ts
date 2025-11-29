import { createHash } from 'crypto';

export function hashObject(value: any): string {
  const normalized = JSON.stringify(value ?? {}, null, 2);
  return createHash('sha256').update(normalized).digest('hex');
}

export function hashString(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function compactTs(date = new Date()): string {
  // YYMMDDHHMMSS (UTC)
  const pad = (n: number) => String(n).padStart(2, '0');
  const yr = String(date.getUTCFullYear()).slice(-2);
  return `${yr}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function anonymizeContent(text: string, projectName?: string, redactPatterns: string[] = []): string {
  let result = text;
  if (projectName) {
    const safe = projectName.replace(/[-/\\^$*+?.()|[\\\]{}]/g, '\\$&');
    result = result.replace(new RegExp(safe, 'gi'), 'project-anon');
  }
  for (const pattern of redactPatterns) {
    try {
      const re = new RegExp(pattern, 'gi');
      result = result.replace(re, '[REDACTED]');
    } catch (err) {
      // ignore invalid patterns
    }
  }
  // Simple heuristic for secrets (long alphanumeric strings)
  result = result.replace(/\b[A-Za-z0-9_]{20,}\b/g, '[REDACTED]');
  return result;
}
