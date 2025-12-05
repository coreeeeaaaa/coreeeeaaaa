import * as admin from 'firebase-admin';
import { LogEntry, GateRecord, StatusSnapshot } from './types.js';

let _firestore: admin.firestore.Firestore | null = null;

function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    // Check if Firebase is already initialized
    // This assumes the project ID is available, e.g., via environment variable or config.
    // For local development, Firebase emulators might be used, or service account credentials.
    // For simplicity, we'll try to initialize with default credentials.
    // In a real project, this might be more sophisticated (e.g., checking for process.env.FIREBASE_CONFIG)
    admin.initializeApp();
  }
  _firestore = admin.firestore();
}

export async function getStorage() {
  if (!_firestore) {
    initializeFirebaseAdmin();
  }

  const firestore = _firestore!;

  return {
    async writeLog(entry: LogEntry & { id: string; kind: string; hashes: string[] }): Promise<void> {
      // Assuming 'logs' collection
      await firestore.collection('logs').doc(entry.id).set(entry);
    },

    async writeGate(record: GateRecord): Promise<void> {
      // Assuming 'gates' collection
      await firestore.collection('gates').doc(record.id + '-' + record.ts).set(record);
    },

    async writeStatus(snapshot: StatusSnapshot): Promise<void> {
      // Assuming 'status' collection and a specific document ID or generated one
      await firestore.collection('status').doc(snapshot.ts).set(snapshot);
    }
  };
}
