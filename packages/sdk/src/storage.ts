import { StorageDriver } from './types';
import { loadSecureStorageConfig } from '../config/secure-config';

let cachedDriver: StorageDriver | null = null;

export async function getStorage(): Promise<StorageDriver> {
  if (cachedDriver) return cachedDriver;
  const cfg = await loadSecureStorageConfig();
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
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
}

/**
 * Get storage driver with health check
 */
export async function getStorageWithHealthCheck(): Promise<{ driver: StorageDriver; healthy: boolean; details: string }> {
  const driver = await getStorage();

  // Basic health check for most storage drivers
  if (typeof (driver as any).healthCheck === 'function') {
    const health = await (driver as any).healthCheck();
    return { driver, healthy: health.healthy, details: health.details };
  }

  // For LocalFs, assume healthy if it was created successfully
  return { driver, healthy: true, details: 'Local filesystem storage active' };
}