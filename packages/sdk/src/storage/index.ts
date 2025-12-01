import { StorageDriver } from './types';
import type { StorageConfig } from '../config/storage-config';
import { loadStorageConfig } from '../config/storage-config';

let cachedDriver: StorageDriver | null = null;

export async function getStorage(): Promise<StorageDriver> {
  if (cachedDriver) return cachedDriver;
  const cfg = await loadStorageConfig();
  const provider = cfg.provider ?? 'local-fs';
  switch (provider) {
    case 'local-fs': {
      const { LocalFsStorage } = await import('./local-fs');
      cachedDriver = new LocalFsStorage(cfg);
      return cachedDriver;
    }
    case 'gcp-firestore': {
      const { FirestoreStorage } = await import('./gcp-firestore');
      cachedDriver = new FirestoreStorage(cfg);
      return cachedDriver;
    }
    case 'aws-dynamodb': {
      const { DynamoStorage } = await import('./aws-dynamodb');
      cachedDriver = new DynamoStorage(cfg);
      return cachedDriver;
    }
    case 'azure-cosmos': {
      const { CosmosStorage } = await import('./azure-cosmos');
      cachedDriver = new CosmosStorage(cfg);
      return cachedDriver;
    }
    case 'http-rest': {
      const { HttpStorage } = await import('./http-rest');
      cachedDriver = new HttpStorage(cfg);
      return cachedDriver;
    }
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
}
