/** Offline contract only. No endpoint, credentials or user data are provisioned here.
 * A deployment operator must provide an authenticated, read-only same-origin endpoint
 * and obtain approval for the exact data and audience before enabling live reads.
 * Public snapshots and message-recency heuristics do not prove runtime activity.
 * Send only canonical bot IDs, explicitly observed states and per-bot observation times.
 * Tasks/calendars require separately approved scope; do not bundle conversation bodies.
 */
export const SOURCE_CONTRACT = Object.freeze({
  enabled: false,
  endpoint: '/api/office/snapshot',
  maxSignalAgeMs: 120000,
  maxFutureSkewMs: 30000,
  requiredEvidence: 'runtime-observation',
});
export function assertLiveEnvelope(payload) {
  if (payload?.mode !== 'live' || payload?.provenance?.kind !== SOURCE_CONTRACT.requiredEvidence) {
    throw new Error('La fuente no acredita observación real; demo e históricos no son actividad en vivo');
  }
  // These fields are declarations, not authentication. The trusted server must
  // verify observations and enforce authorization; client validation cannot do so.
  if (payload.simulated === true || payload.provenance.simulated === true) {
    throw new Error('Una simulación no es una fuente en vivo');
  }
}
