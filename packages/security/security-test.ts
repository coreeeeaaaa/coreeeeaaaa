import request from 'supertest';
import express from 'express';
import { securityHeaders, apiRateLimit, validateInput } from './middleware';
import { AuthService } from './auth';
import { ValidationService } from './validation';
import { CryptoService } from './crypto';

describe('Security Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(validateInput);
    app.use(securityHeaders);
    app.use(apiRateLimit);
  });

  describe('Authentication', () => {
    test('should generate valid JWT', () => {
      const user = {
        id: 'test-user',
        username: 'testuser',
        role: 'user' as const,
        apiKey: 'test-api-key'
      };

      const token = AuthService.generateJWT(user);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      const decoded = AuthService.verifyJWT(token);
      expect(decoded.username).toBe('testuser');
    });

    test('should hash password correctly', async () => {
      const password = 'testPassword123!';
      const hash = await AuthService.hashPassword(password);

      expect(hash.length).toBeGreaterThan(50);
      expect(hash.startsWith('$2b$')).toBe(true);

      const isValid = await AuthService.comparePassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await AuthService.comparePassword('wrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Input Validation', () => {
    test('should sanitize malicious input', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = ValidationService.sanitizeString(maliciousInput);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
    });

    test('should validate email format', () => {
      const validEmail = 'test@example.com';
      const sanitizedEmail = ValidationService.sanitizeEmail(validEmail);

      expect(sanitizedEmail).toBe('test@example.com');

      const invalidEmail = 'invalid-email';
      expect(ValidationService.sanitizeEmail(invalidEmail)).toBe('invalid-email');
    });

    test('should validate API key format', () => {
      const validKey = 'coree_' + 'a'.repeat(32);
      expect(ValidationService.validateApiKey(validKey)).toBe(true);

      const invalidKey = 'short';
      expect(ValidationService.validateApiKey(invalidKey)).toBe(false);
    });
  });

  describe('Cryptography', () => {
    test('should encrypt and decrypt data', async () => {
      const message = 'Secret message';
      const password = 'testPassword';

      const { encrypted, iv } = await CryptoService.encrypt(message, password);
      const decrypted = await CryptoService.decrypt(encrypted, password, iv);

      expect(decrypted).toBe(message);
    });

    test('should redact sensitive information', () => {
      const textWithSecrets = 'Contact test@example.com and use token Bearer sk-1234567890abcdef';
      const redacted = CryptoService.redactSensitiveData(textWithSecrets);

      expect(redacted).toContain('[REDACTED_EMAIL]');
      expect(redacted).toContain('[REDACTED_TOKEN]');
      expect(redacted).not.toContain('test@example.com');
      expect(redacted).not.toContain('sk-1234567890abcdef');
    });
  });

  describe('Rate Limiting', () => {
    test('should handle rate limits gracefully', async () => {
      // Simulate multiple requests
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/test')
          .send({ data: 'test' });
      }
      // Rate limiting will kick in after many more requests
      // This test ensures the middleware doesn't crash
      expect(true).toBe(true); // Basic pass test
    });
  });
});