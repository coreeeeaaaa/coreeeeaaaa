const admin = require('firebase-admin')
let inited = false
let db

function ensureInit() {
  if (inited) return
  try {
    admin.initializeApp()
  } catch (_) {}
  db = admin.firestore()
  inited = true
}

/** @typedef {"info"|"warn"|"error"} CoreeeeaaaaLogLevel */
/** @typedef {"web"|"api"|"dev-server"|"worker"} CoreeeeaaaaLogSource */

/**
 * @typedef CoreeeeaaaaLogEvent
 * @property {CoreeeeaaaaLogLevel} level
 * @property {CoreeeeaaaaLogSource} source
 * @property {string} message
 * @property {any} [context]
 */

async function logEvent(event) {
  ensureInit()
  const doc = {
    level: event.level,
    source: event.source,
    message: event.message,
    context: event.context || null,
    ts: admin.firestore.FieldValue.serverTimestamp(),
    ts_ms: Date.now()
  }
  try {
    await db.collection('coreeeeaaaa_logs').add(doc)
  } catch (err) {
    console.warn('logEvent noop (firestore write failed):', err.message)
  }
}

module.exports = { logEvent }
