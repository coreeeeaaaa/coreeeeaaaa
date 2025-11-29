/**
 * Coreeeeaaaa common logger stub for Firebase wiring.
 * Replace TODOs with actual Firebase client init and addDoc/push calls.
 */

/** @typedef {"info"|"warn"|"error"} CoreeeeaaaaLogLevel */
/** @typedef {"web"|"api"|"dev-server"|"worker"} CoreeeeaaaaLogSource */

/**
 * @typedef CoreeeeaaaaLogEvent
 * @property {CoreeeeaaaaLogLevel} level
 * @property {CoreeeeaaaaLogSource} source
 * @property {string} message
 * @property {any} [context]
 */

/**
 * Send a log event to the shared sink (intended: Firebase collection "coreeeeaaaa_logs").
 * TODO: wire Firebase client and perform addDoc/push.
 * @param {CoreeeeaaaaLogEvent} event
 */
async function logEvent(event) {
  // TODO_CONFIG: initialize Firebase app/client here
  // TODO: await addDoc(collection(db, "coreeeeaaaa_logs"), event)
  return
}

module.exports = { logEvent }
