import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
const db = getFirestore();

export const logAgentWorkGen2 = onRequest(async (req: any, res: any) => {
  // Authenticate using static token
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== process.env.DEV_AI_TOKEN) {
    res.status(401).send('Unauthorized');
    return;
  }

  // Extract input
  const { project, gate, result, evidence } = req.body;

  // Validate input (simple JSON schema)
  if (!project || !gate || !result || !evidence) {
    res.status(400).send('Invalid input: missing required fields');
    return;
  }
  if (typeof project !== 'string' || typeof gate !== 'string') {
    res.status(400).send('Schema validation failed');
    return;
  }

  // Write to Firestore
  try {
    await db.collection('dev_lineage').doc(project).collection('gates').add({
      gate,
      result,
      evidence,
      timestamp: new Date()
    });
    res.status(200).send('Logged successfully');
  } catch (error) {
    console.error('Error writing to Firestore:', error);
    res.status(500).send('Internal server error');
  }
});