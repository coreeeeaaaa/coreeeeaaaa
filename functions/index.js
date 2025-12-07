const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

try { admin.initializeApp(); } catch (_) {}
const db = admin.firestore();

// Gen2-style HTTPS (deploy as 2nd Gen)
exports.logAgentWorkGen2 = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    const header = req.headers.authorization || '';
    if (!header.toLowerCase().startsWith('bearer ')) return res.status(401).json({ error: 'unauthorized' });
    const token = header.split(' ')[1];
    let claims;
    try {
      claims = await admin.auth().verifyIdToken(token);
    } catch {
      return res.status(401).json({ error: 'unauthorized' });
    }
    if (!claims?.dev_ai) return res.status(403).json({ error: 'forbidden' });

    const {
      project_id = 'default',
      agent_id = 'unknown',
      record_type = 'decision_log',
      content = {},
      timestamp = Date.now(),
      ttl_days = 90,
      sample_rate = 1
    } = req.body || {};

    if (typeof sample_rate === 'number' && sample_rate > 0 && sample_rate < 1) {
      if (Math.random() > sample_rate) return res.json({ ok: true, sampled: false });
    }

    const hash = crypto.createHash('md5').update(JSON.stringify(content)).digest('hex');
    const versionsPath = `dev_logs_versions/${project_id}/${record_type}/${hash}`;
    const logPath = `dev_logs/${project_id}/${agent_id}_${timestamp}`;

    await db.runTransaction(async (tx) => {
      const vRef = db.doc(versionsPath);
      const vSnap = await tx.get(vRef);
      const newVersion = vSnap.exists ? (vSnap.get('latest_version') || 1) + 1 : 1;
      const entry = { version: newVersion, content, timestamp: admin.firestore.Timestamp.fromMillis(timestamp) };
      if (vSnap.exists) {
        tx.update(vRef, {
          versions: admin.firestore.FieldValue.arrayUnion(entry),
          latest_version: newVersion,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        tx.set(vRef, {
          versions: [entry],
          latest_version: newVersion,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    await db.doc(logPath).set({
      record_type,
      agent_id,
      project_id,
      content,
      hash,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      expires_at: admin.firestore.Timestamp.fromMillis(Date.now() + ttl_days * 86400 * 1000),
    }, { merge: true });

    const dateKey = new Date(timestamp).toISOString().slice(0,10).replace(/-/g,'');
    const summaryRef = db.doc(`dev_logs_summaries/${project_id}/${dateKey}`);
    await summaryRef.set({
      total: admin.firestore.FieldValue.increment(1),
      by_type: { [record_type]: admin.firestore.FieldValue.increment(1) },
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ ok: true, hash });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
