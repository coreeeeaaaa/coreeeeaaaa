import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse as parseToml } from '@iarna/toml';

export interface LocalFsConfig {
  root?: string;
}

export interface FirestoreConfig {
  project_id?: string;
  collection_prefix?: string;
}

export interface DynamoConfig {
  region?: string;
  table_prefix?: string;
}

export interface CosmosConfig {
  endpoint?: string;
  database?: string;
  container_prefix?: string;
}

export interface HttpRestConfig {
  endpoint?: string;
  api_key_env?: string;
}

export interface StorageConfig {
  provider?: string;
  storage?: {
    'local-fs'?: LocalFsConfig;
    'gcp-firestore'?: FirestoreConfig;
    'aws-dynamodb'?: DynamoConfig;
    'azure-cosmos'?: CosmosConfig;
    'http-rest'?: HttpRestConfig;
  };
}

const STORAGE_FILE = path.join(process.cwd(), '.core', 'storage.toml');

export async function loadStorageConfig(): Promise<StorageConfig> {
  try {
    const content = await fs.readFile(STORAGE_FILE, 'utf8');
    const parsed = (await parseToml(content)) as StorageConfig;
    return normalizeConfig(parsed);
  } catch (err) {
    return normalizeConfig({});
  }
}

function normalizeConfig(cfg: StorageConfig): StorageConfig {
  const provider = process.env.COREEEEEAAAA_STORAGE_PROVIDER || cfg.provider || 'local-fs';
  return {
    provider,
    storage: {
      ...(cfg.storage ?? {}),
    },
  };
}
