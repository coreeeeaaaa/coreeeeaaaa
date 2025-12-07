import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
  apiKey: string;
}

export class AuthService {
  private static readonly JWT_SECRET = this.getJWTSecret();
  private static readonly API_KEY_PREFIX = 'coree_';

  private static getJWTSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET environment variable must be set and at least 32 characters long');
    }
    return secret;
  }

  static generateApiKey(): string {
    return this.API_KEY_PREFIX + randomBytes(32).toString('hex');
  }

  static generateJWT(user: AuthUser): string {
    return jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  static verifyJWT(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}