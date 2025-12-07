import { StorageDriver } from './types.js';
import type { StorageConfig } from '../config/storage-config.js';
import { loadStorageConfig } from '../config/storage-config.js';

let cachedDriver: StorageDriver | null = null;

export async function getStorage(): Promise<StorageDriver> {
  if (cachedDriver) return cachedDriver;
  const cfg = await loadStorageConfig();
  const provider = cfg.provider ?? 'local-fs';
  switch (provider) {
    case 'local-fs': {
      const { LocalFsStorage } = await import('./local-fs.js');
      cachedDriver = new LocalFsStorage(cfg);
      return cachedDriver;
    }
    case 'gcp-firestore': {
      const { FirestoreStorage } = await import('./gcp-firestore.js');
      cachedDriver = new FirestoreStorage(cfg);
      return cachedDriver;
    }
    case 'aws-dynamodb': {
      const { DynamoStorage } = await import('./aws-dynamodb.js');
      cachedDriver = new DynamoStorage(cfg);
      return cachedDriver;
    }
    case 'azure-cosmos': {
      const { CosmosStorage } = await import('./azure-cosmos.js');
      cachedDriver = new CosmosStorage(cfg);
      return cachedDriver;
    }
    case 'http-rest': {
      const { HttpStorage } = await import('./http-rest.js');
      cachedDriver = new HttpStorage(cfg);
      return cachedDriver;
    }
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
}
