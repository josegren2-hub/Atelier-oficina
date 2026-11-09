/** Phase 1 live source: public read-only estado.json from the previous office.
 * Client-side only. No credentials, no private encrypted files (tareas.enc / mando.enc).
 * Freshness follows the publisher's own heartbeat (~30 min), not a 120 s animation timer.
 */
export const SOURCE_CONTRACT = Object.freeze({
  enabled: true,
  endpoint: 'https://josegren2-hub.github.io/Oficina-bots/estado.json',
  sourceLabel: 'Oficina-bots · estado.json público',
  /** Unknown only when the feed (actualizado / salud.latido) is older than this. */
  maxSignalAgeMs: 45 * 60 * 1000,
  maxFutureSkewMs: 60 * 1000,
  pollIntervalMs: 45 * 1000,
  requiredEvidence: 'runtime-observation',
  provenanceKind: 'runtime-observation',
});

export function assertLiveEnvelope(payload) {
  if (payload?.mode !== 'live' || payload?.provenance?.kind !== SOURCE_CONTRACT.requiredEvidence) {
    throw new Error('La fuente no acredita observación real; demo e históricos no son actividad en vivo');
  }
  if (payload.simulated === true || payload.provenance.simulated === true) {
    throw new Error('Una simulación no es una fuente en vivo');
  }
}
