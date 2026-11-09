import {SOURCE_CONTRACT,assertLiveEnvelope} from './source-contract.js';

/** Old-office estado → Atelier status. IDs are already canonical 1:1. */
export const OFICINA_STATUS_MAP = Object.freeze({
  trabajando: 'working',
  esperando: 'review',
  pausa: 'idle',
});

export function isOficinaEstado(payload) {
  return Boolean(payload && typeof payload === 'object' && Array.isArray(payload.bots) && typeof payload.actualizado === 'string' && payload.schemaVersion == null);
}

/** Newest trustworthy feed clock: bot change time or the ~30 min latido. */
export function oficinaFeedTime(payload) {
  const times = [Date.parse(payload?.actualizado)];
  if (payload?.salud?.latido) times.push(Date.parse(payload.salud.latido));
  const finite = times.filter(Number.isFinite);
  if (!finite.length) throw new Error('estado.json sin reloj de frescura');
  return Math.max(...finite);
}

/**
 * Map public estado.json into the schemaVersion:1 envelope.
 * Uses only id/estado/frase and feed timestamps — never encrypted private payloads.
 */
export function mapOficinaEstado(payload, knownIds, now = Date.now()) {
  if (!isOficinaEstado(payload)) throw new Error('No es el estado.json público de Oficina-bots');
  const valid = new Set(knownIds);
  const feedMs = oficinaFeedTime(payload);
  if (feedMs > now + SOURCE_CONTRACT.maxFutureSkewMs) throw new Error('Reloj de estado.json en el futuro');
  const lastSignal = new Date(feedMs).toISOString();
  const byId = new Map();
  for (const row of payload.bots) {
    if (!row || typeof row.id !== 'string') continue;
    if (!valid.has(row.id)) throw new Error(`ID desconocido en estado.json: ${row.id}`);
    if (byId.has(row.id)) throw new Error(`ID duplicado en estado.json: ${row.id}`);
    const status = OFICINA_STATUS_MAP[row.estado];
    if (!status) throw new Error(`Estado desconocido: ${row.estado}`);
    let task = null;
    if (typeof row.frase === 'string' && row.frase.trim()) {
      task = row.frase.trim().slice(0, 500);
    }
    const waitingSince = (status === 'review' && typeof row.esperando_desde === 'string' && row.esperando_desde.trim())
      ? row.esperando_desde.trim()
      : null;
    byId.set(row.id, {id: row.id, status, task, lastSignal, waitingSince});
  }
  const bots = [...valid].map(id => byId.get(id) || {id, status: 'unknown', task: null, lastSignal, waitingSince: null});
  const salud = payload.salud && typeof payload.salud === 'object' ? {
    latido: typeof payload.salud.latido === 'string' ? payload.salud.latido : null,
    mando: typeof payload.salud.mando === 'string' ? payload.salud.mando : null,
    avisos_ok: typeof payload.salud.avisos_ok === 'string' ? payload.salud.avisos_ok : null,
    avisos_error: typeof payload.salud.avisos_error === 'string' ? payload.salud.avisos_error : null,
    avisos_config: typeof payload.salud.avisos_config === 'boolean' ? payload.salud.avisos_config : null,
  } : null;
  const racha = payload.racha && typeof payload.racha === 'object' ? {
    dias: Number(payload.racha.dias) || 0,
    hoy_cero: Boolean(payload.racha.hoy_cero),
  } : null;
  return {
    schemaVersion: 1,
    mode: 'live',
    source: SOURCE_CONTRACT.sourceLabel,
    provenance: {kind: SOURCE_CONTRACT.provenanceKind, origin: 'oficina-bots-estado-json', feedUpdatedAt: payload.actualizado, feedHeartbeatAt: payload?.salud?.latido ?? null},
    simulated: false,
    bots,
    salud,
    racha,
  };
}

/** Read-only boundary. Live reads use the approved public estado.json URL. */
export function validateSnapshot(payload, knownIds, now = Date.now()) {
  if (payload?.mode === 'demo' || payload?.simulated === true) throw new Error('La simulación no es actividad real');
  if (!payload || payload.schemaVersion !== 1 || typeof payload.source !== 'string' || !payload.source.trim()) throw new Error('Fuente o versión ausente');
  if (!Array.isArray(payload.bots)) throw new Error('Lista de bots inválida');
  const ids = new Set(), valid = new Set(knownIds);
  const allowed = new Set(['working', 'review', 'idle', 'error', 'unknown']);
  const records = payload.bots.map(record => {
    if (!valid.has(record.id) || ids.has(record.id)) throw new Error('ID desconocido o duplicado');
    ids.add(record.id);
    if (!allowed.has(record.status)) throw new Error('Estado inválido');
    const date = Date.parse(record.lastSignal);
    if (!Number.isFinite(date) || date > now + SOURCE_CONTRACT.maxFutureSkewMs) throw new Error('Fecha inválida o futura');
    if (record.task !== null && record.task !== undefined && (typeof record.task !== 'string' || record.task.length > 500)) throw new Error('Tarea inválida');
    const stale = now - date > SOURCE_CONTRACT.maxSignalAgeMs;
    return {id: record.id, status: stale ? 'unknown' : record.status, task: stale ? null : record.task ?? null, lastSignal: new Date(date).toISOString(), stale, waitingSince: stale ? null : (record.waitingSince || null)};
  });
  return {mode: 'live', source: payload.source.slice(0, 120), bots: records, lastSignal: records.length ? records.reduce((a, b) => a > b.lastSignal ? a : b.lastSignal, '') : null, salud: payload.salud && typeof payload.salud === 'object' ? payload.salud : null, racha: payload.racha && typeof payload.racha === 'object' ? payload.racha : null};
}

export async function readSnapshot({signal, knownIds, fetcher = fetch, enabled = SOURCE_CONTRACT.enabled, now = Date.now()} = {}) {
  if (enabled !== true) throw new Error('Conexión real deshabilitada; requiere fuente y autorización');
  const separator = SOURCE_CONTRACT.endpoint.includes('?') ? '&' : '?';
  const url = `${SOURCE_CONTRACT.endpoint}${separator}t=${now}`;
  const response = await fetcher(url, {
    signal,
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'follow',
    headers: {Accept: 'application/json'},
  });
  if (!response.ok) throw new Error(`Fuente no disponible (${response.status})`);
  const raw = await response.json();
  const payload = isOficinaEstado(raw) ? mapOficinaEstado(raw, knownIds, now) : raw;
  assertLiveEnvelope(payload);
  return validateSnapshot(payload, knownIds, now);
}
