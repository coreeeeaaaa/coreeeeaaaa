import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';

export class CryptoService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly SALT_ROUNDS = 100000;

  static async encrypt(text: string, password: string): Promise<{ encrypted: string; iv: string }> {
    const salt = randomBytes(16);
    const key = await this.deriveKey(password, salt);
    const iv = randomBytes(16);

    const cipher = createCipheriv(this.ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted: `${encrypted}:${authTag.toString('hex')}`,
      iv: iv.toString('hex'),
      salt: salt.toString('hex')
    };
  }

  static async decrypt(encryptedData: string, password: string, ivHex: string, saltHex?: string): Promise<string> {
    const [encrypted, authTagHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Use provided salt or throw error - never use fixed salt
    if (!saltHex) {
      throw new Error('Salt is required for decryption');
    }
    const salt = Buffer.from(saltHex, 'hex');
    const key = await this.deriveKey(password, salt);

    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private static async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(password, salt, 32, { N: this.SALT_ROUNDS }, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }

  static generateSecureRandom(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  static hash(data: string): string {
    return require('crypto').createHash('sha256').update(data).digest('hex');
  }

  // For sensitive data redaction
  static redactSensitiveData(text: string): string {
    // Common sensitive data patterns
    const sensitivePatterns = [
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[REDACTED_EMAIL]' },
      { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[REDACTED_CREDIT_CARD]' },
      { pattern: /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, replacement: '[REDACTED_TOKEN]' },
      { pattern: /password["\s:]+["\']([^"']+)["']/gi, replacement: 'password: "[REDACTED]"' },
    ];

    let redacted = text;
    for (const { pattern, replacement } of sensitivePatterns) {
      redacted = redacted.replace(pattern, replacement);
    }

    return redacted;
  }
}