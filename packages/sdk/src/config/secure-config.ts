/**
 * Secure Configuration Management for Cloud Storage
 *
 * Security Principles:
 * - Never commit credentials to repository
 * - Local encryption of sensitive data
 * - Environment-based configuration
 * - Zero-exposure for external communications
 */

import { promises as fs } from 'fs';
import path from 'path';
import { createHash, randomBytes } from 'crypto';
import { homedir } from 'os';

export interface CloudCredentials {
  provider: 'gcp-firestore' | 'aws-dynamodb' | 'azure-cosmos';
  encrypted: {
    credentials: string; // encrypted base64
    iv: string; // initialization vector
    authTag: string; // authentication tag
  };
  timestamp: string;
  projectId?: string;
  region?: string;
}

export interface StorageConfig {
  provider: 'local-fs' | 'gcp-firestore' | 'aws-dynamodb' | 'azure-cosmos';
  projectId?: string;
  region?: string;
  encryptionKey?: string;
  failClosed: boolean; // default: true - fail if cloud auth fails
}

const CONFIG_DIR = path.join(homedir(), '.coreeeeaaaa');
const CREDENTIALS_FILE = path.join(CONFIG_DIR, 'credentials.enc');
const MASTER_KEY_FILE = path.join(CONFIG_DIR, '.master-key');

/**
 * Initialize secure configuration directory
 */
export async function initSecureConfig(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });

    // Set secure permissions
    await fs.chmod(CONFIG_DIR, 0o700);

    // Check if master key exists
    const masterKeyExists = await fs.access(MASTER_KEY_FILE).then(() => true).catch(() => false);

    if (!masterKeyExists) {
      const masterKey = randomBytes(32).toString('hex');
      await fs.writeFile(MASTER_KEY_FILE, masterKey, { mode: 0o600 });
      console.log(`Master key generated: ${MASTER_KEY_FILE}`);
      console.log('⚠️  Store this key securely! Do not commit to version control.');
    }
  } catch (error: any) {
    throw new Error(`Failed to initialize secure config: ${error.message}`);
  }
}

/**
 * Get or create master encryption key
 */
export async function getMasterKey(): Promise<string> {
  await initSecureConfig();

  try {
    const masterKey = await fs.readFile(MASTER_KEY_FILE, 'utf-8');
    return masterKey.trim();
  } catch (error: any) {
    throw new Error(`Master key not found. Run initSecureConfig() first: ${error.message}`);
  }
}

/**
 * Encrypt sensitive data
 */
export async function encryptData(data: string, key: string): Promise<{
  encrypted: string;
  iv: string;
  authTag: string;
}> {
  const crypto = require('crypto');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-gcm', key);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex')
  };
}

/**
 * Decrypt sensitive data
 */
export async function decryptData(encryptedData: {
  encrypted: string;
  iv: string;
  authTag: string;
}, key: string): Promise<string> {
  const crypto = require('crypto');
  const decipher = crypto.createDecipher('aes-256-gcm', key);

  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Store encrypted cloud credentials
 */
export async function storeCredentials(creds: {
  provider: string;
  credentials: any;
  projectId?: string;
  region?: string;
}): Promise<void> {
  const masterKey = await getMasterKey();

  const encrypted = await encryptData(JSON.stringify(creds.credentials), masterKey);
  const credentialData = {
    provider: creds.provider as any,
    credentials: encrypted.encrypted,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    timestamp: new Date().toISOString(),
    projectId: creds.projectId,
    region: creds.region
  };

  await fs.writeFile(CREDENTIALS_FILE, JSON.stringify(credentialData, null, 2), { mode: 0o600 });
}

/**
 * Load and decrypt cloud credentials
 */
export async function loadCredentials(provider: string): Promise<any> {
  try {
    const credsData = JSON.parse(await fs.readFile(CREDENTIALS_FILE, 'utf-8')) as CloudCredentials;

    if (credsData.provider !== provider) {
      throw new Error(`No credentials found for provider: ${provider}`);
    }

    const masterKey = await getMasterKey();
    const decrypted = await decryptData({
      encrypted: credsData.credentials,
      iv: credsData.iv,
      authTag: credsData.authTag
    }, masterKey);

    return JSON.parse(decrypted);
  } catch (error: any) {
    throw new Error(`Failed to load credentials for ${provider}: ${error.message}`);
  }
}

/**
 * Validate storage configuration
 */
export function validateStorageConfig(config: StorageConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.provider) {
    errors.push('Provider is required');
  }

  if (config.provider !== 'local-fs' && !config.failClosed) {
    errors.push('Cloud providers must have failClosed=true for security');
  }

  if (config.provider === 'gcp-firestore' && !config.projectId) {
    errors.push('GCP Firestore requires projectId');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Load storage configuration with security validation
 */
export async function loadSecureStorageConfig(): Promise<StorageConfig> {
  // Environment variable takes precedence
  const provider = process.env.COREEEEAAAA_STORAGE_PROVIDER || 'local-fs';

  const config: StorageConfig = {
    provider: provider as any,
    projectId: process.env.COREEEEAAAA_PROJECT_ID,
    region: process.env.COREEEEAAAA_REGION,
    failClosed: process.env.COREEEEAAAA_FAIL_CLOSED !== 'false'
  };

  // Try to load from local config file
  try {
    const configPath = path.join(CONFIG_DIR, 'storage.json');
    const localConfig = JSON.parse(await fs.readFile(configPath, 'utf-8')) as StorageConfig;
    Object.assign(config, localConfig);
  } catch {
    // No local config file, use defaults
  }

  const validation = validateStorageConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid storage configuration: ${validation.errors.join(', ')}`);
  }

  return config;
}