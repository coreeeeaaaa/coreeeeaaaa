import validator from 'validator';

export class ValidationService {
  static sanitizeString(input: string): string {
    return validator.escape(input.trim());
  }

  static sanitizeEmail(email: string): string {
    return validator.normalizeEmail(email.toLowerCase());
  }

  static validateApiKey(apiKey: string): boolean {
    return validator.isAlphanumeric(apiKey) && apiKey.length >= 32;
  }

  static validateProjectName(name: string): boolean {
    return validator.isAlphanumeric(name) && name.length >= 3 && name.length <= 50;
  }

  static sanitizeFilepath(path: string): string {
    // Prevent directory traversal
    const sanitized = path.normalize(path).replace(/^(\.\.[\/\\])+/, '');
    return sanitized;
  }

  static validateJSON(input: string): boolean {
    try {
      JSON.parse(input);
      return true;
    } catch {
      return false;
    }
  }

  static sanitizeHtml(input: string): string {
    return validator.escape(input);
  }
}