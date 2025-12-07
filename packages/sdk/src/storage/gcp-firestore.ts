import { StorageDriver, LogRecord, GateRecord, StatusSnapshot } from '../types';
import { StorageConfig } from '../config/storage-config';
import { loadCredentials } from '../config/secure-config';

interface FirestoreDocument {
  id: string;
  data: any;
  timestamp: string;
  metadata?: {
    source: string;
    version: string;
    encrypted?: boolean;
  };
}

export class FirestoreStorage implements StorageDriver {
  private db: any; // Firestore instance
  private projectId: string;

  constructor(private cfg: StorageConfig) {
    if (!cfg.projectId) {
      throw new Error('projectId is required for GCP Firestore');
    }
    this.projectId = cfg.projectId;
  }

  /**
   * Initialize Firestore connection with secure credentials
   */
  private async initializeFirestore(): Promise<void> {
    if (this.db) return;

    try {
      // Load encrypted credentials
      const credentials = await loadCredentials('gcp-firestore');

      // Import Firestore dynamically to avoid dependency issues
      const { Firestore } = await import('@google-cloud/firestore');

      // Initialize with secure credentials
      const clientOptions = {
        projectId: this.projectId,
        credentials: credentials
      };

      this.db = new Firestore(clientOptions);

      // Test connection
      await this.db.collection('_health').doc('test').get();

    } catch (error: any) {
      throw new Error(`Failed to initialize Firestore: ${error.message}`);
    }
  }

  /**
   * Write log entry to Firestore
   * Collection: logs/{date}/{logId}
   */
  async writeLog(record: LogRecord): Promise<void> {
    await this.initializeFirestore();

    const date = record.ts.slice(0, 10); // YYYY-MM-DD
    const doc: FirestoreDocument = {
      id: `${record.ts_compact}_${record.id}`,
      data: record,
      timestamp: record.ts,
      metadata: {
        source: 'coreeeeaaaa-sdk',
        version: '1.0.0'
      }
    };

    await this.db
      .collection('logs')
      .doc(date)
      .collection('entries')
      .doc(doc.id)
      .set(doc);
  }

  /**
   * Write gate validation result
   * Collection: gates/{gateId}/{timestamp}
   */
  async writeGate(record: GateRecord): Promise<void> {
    await this.initializeFirestore();

    const doc: FirestoreDocument = {
      id: `${record.timestamp}_${record.gateId}`,
      data: record,
      timestamp: record.timestamp,
      metadata: {
        source: 'coreeeeaaaa-sdk',
        version: '1.0.0'
      }
    };

    await this.db
      .collection('gates')
      .doc(record.gateId)
      .collection('results')
      .doc(doc.id)
      .set(doc);
  }

  /**
   * Write status snapshot
   * Collection: status/{snapshotId}
   */
  async writeStatus(record: StatusSnapshot): Promise<void> {
    await this.initializeFirestore();

    const doc: FirestoreDocument = {
      id: record.id,
      data: record,
      timestamp: record.timestamp,
      metadata: {
        source: 'coreeeeaaaa-sdk',
        version: '1.0.0'
      }
    };

    await this.db
      .collection('status')
      .doc(record.id)
      .set(doc);
  }

  /**
   * Read status snapshot
   */
  async readStatus(snapshotId: string): Promise<StatusSnapshot | null> {
    await this.initializeFirestore();

    try {
      const doc = await this.db.collection('status').doc(snapshotId).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data() as FirestoreDocument;
      return data.data as StatusSnapshot;

    } catch (error: any) {
      throw new Error(`Failed to read status ${snapshotId}: ${error.message}`);
    }
  }

  /**
   * Query logs by date range
   */
  async queryLogs(startDate: string, endDate: string, limit?: number): Promise<LogRecord[]> {
    await this.initializeFirestore();

    try {
      let query = this.db
        .collection('logs')
        .where('timestamp', '>=', startDate)
        .where('timestamp', '<=', endDate);

      if (limit) {
        query = query.limit(limit);
      }

      const snapshots = await query.get();

      return snapshots.docs.map(doc => {
        const data = doc.data() as FirestoreDocument;
        return data.data as LogRecord;
      });

    } catch (error: any) {
      throw new Error(`Failed to query logs: ${error.message}`);
    }
  }

  /**
   * Health check for Firestore connection
   */
  async healthCheck(): Promise<{ healthy: boolean; details: string }> {
    try {
      await this.initializeFirestore();
      await this.db.collection('_health').doc('check').set({
        timestamp: new Date().toISOString(),
        status: 'ok'
      });

      return {
        healthy: true,
        details: `Firestore connection healthy (project: ${this.projectId})`
      };
    } catch (error: any) {
      return {
        healthy: false,
        details: `Firestore health check failed: ${error.message}`
      };
    }
  }

  /**
   * Close Firestore connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.terminate?.();
      this.db = null;
    }
  }
}