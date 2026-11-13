/** Phase 5: client-only ntfy topic (like mando key). Never ships in repo/dist. Atelier does NOT POST to Rob's real topic — the old box loop already does. */

export const NTFY_LS_KEY = 'atelierNtfyTema';
export const NTFY_HISTORY_KEY = 'atelierNtfyHistoria';
export const NTFY_WAIT_HOURS = 24;
/** Public Atelier Pages URL used in deep-link copy helpers (not the Click header of the old loop). */
export const ATELIER_PUBLIC_BASE = 'https://josegren2-hub.github.io/Atelier-oficina/';

/** Reject empty / path-like / URL-like values; topic is a single ntfy path segment. */
export function normalizeTopic(raw) {
  const t = String(raw ?? '').trim();
  if (!t) return '';
  if (/[\s/?#]/.test(t)) throw new Error('El tema no debe tener espacios ni barras');
  if (t.length < 8) throw new Error('Usa un tema largo (como contraseña)');
  if (t.length > 120) throw new Error('Tema demasiado largo');
  return t;
}

export function subscribeUrl(topic) {
  const t = normalizeTopic(topic);
  return t ? `https://ntfy.sh/${encodeURIComponent(t)}` : '';
}

export function atelierDeepLink({botId, abrir} = {}) {
  const u = new URL(ATELIER_PUBLIC_BASE);
  if (botId) u.searchParams.set('bot', botId);
  if (abrir) u.searchParams.set('abrir', abrir);
  return u.toString();
}

export function hoursWaiting(waitingSince, now = Date.now()) {
  const t = Date.parse(waitingSince);
  if (!Number.isFinite(t)) return null;
  return Math.floor((now - t) / 36e5);
}

/** Candidates the old loop would notify (>24 h waiting). Display-only; does not send. */
export function waitingAlertCandidates(bots = [], now = Date.now()) {
  const out = [];
  for (const b of bots) {
    if (!b || b.status !== 'review' || b.stale) continue;
    const hrs = hoursWaiting(b.waitingSince, now);
    if (hrs == null || hrs < NTFY_WAIT_HOURS) continue;
    out.push({
      id: b.id,
      name: b.name || b.id,
      waitingSince: b.waitingSince,
      hours: hrs,
      deepLink: atelierDeepLink({botId: b.id}),
      title: `${b.name || b.id} te espera desde hace ${hrs} h`,
    });
  }
  return out.sort((a, b) => b.hours - a.hours);
}

export function mapSalud(salud) {
  if (!salud || typeof salud !== 'object') {
    return {avisosConfig: null, avisosOk: null, avisosError: null, latido: null, mando: null};
  }
  return {
    avisosConfig: typeof salud.avisos_config === 'boolean' ? salud.avisos_config : null,
    avisosOk: typeof salud.avisos_ok === 'string' ? salud.avisos_ok : null,
    avisosError: typeof salud.avisos_error === 'string' ? salud.avisos_error : null,
    latido: typeof salud.latido === 'string' ? salud.latido : null,
    mando: typeof salud.mando === 'string' ? salud.mando : null,
  };
}

export function avisosHealthLabel(saludMapped, now = Date.now()) {
  const s = saludMapped || {};
  if (s.avisosConfig === false) return {tone: 'warn', text: 'Los avisos al celular no están configurados en el loop (tema ausente en la caja).'};
  if (s.avisosConfig == null) return {tone: 'muted', text: 'Sin dato de salud de avisos en estado.json.'};
  const ok = s.avisosOk ? Date.parse(s.avisosOk) : NaN;
  const er = s.avisosError ? Date.parse(s.avisosError) : NaN;
  if (Number.isFinite(er) && (!Number.isFinite(ok) || er > ok)) {
    return {tone: 'warn', text: 'El último aviso al celular falló; el loop reintenta solo.'};
  }
  if (Number.isFinite(ok)) {
    const h = Math.round((now - ok) / 36e5);
    return {tone: 'ok', text: h < 1 ? 'Avisos al celular OK (último envío reciente).' : `Avisos al celular OK (último envío hace ~${h} h).`};
  }
  return {tone: 'ok', text: 'Avisos configurados; aún no ha hecho falta enviar ninguno (o no hay registro público).'};
}

/**
 * Optional POST only to an explicit throwaway topic for QA.
 * Never call with Rob's real topic. Requires confirmThrowaway === true.
 */
export async function sendThrowawayTest({topic, body = 'Prueba San Junipero (tema desechable)', fetcher = fetch, confirmThrowaway = false} = {}) {
  if (confirmThrowaway !== true) throw new Error('Se requiere confirmThrowaway=true');
  const t = normalizeTopic(topic);
  if (!/^prueba-atelier-/i.test(t) && !/^test-atelier-/i.test(t)) {
    throw new Error('El tema de prueba debe empezar con prueba-atelier- o test-atelier-');
  }
  const res = await fetcher(`https://ntfy.sh/${encodeURIComponent(t)}`, {
    method: 'POST',
    body,
    headers: {
      Title: 'San Junipero · prueba',
      Tags: 'test_tube',
      Click: atelierDeepLink({abrir: 'avisos'}),
    },
  });
  if (!res.ok) throw new Error(`ntfy respondió ${res.status}`);
  return res.status;
}

export function createNtfySession({storage = globalThis.localStorage} = {}) {
  function readTopic() {
    try { return normalizeTopic(storage?.getItem?.(NTFY_LS_KEY) || ''); }
    catch { return ''; }
  }
  function saveTopic(raw, {remember = true} = {}) {
    const t = normalizeTopic(raw);
    if (!remember) {
      try { storage?.removeItem?.(NTFY_LS_KEY); } catch {}
      return t;
    }
    if (!t) {
      try { storage?.removeItem?.(NTFY_LS_KEY); } catch {}
      return '';
    }
    storage.setItem(NTFY_LS_KEY, t);
    return t;
  }
  function clearTopic() {
    try { storage?.removeItem?.(NTFY_LS_KEY); } catch {}
  }
  function readHistory() {
    try {
      const raw = JSON.parse(storage?.getItem?.(NTFY_HISTORY_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter(x => x && x.id && x.title).slice(0, 40) : [];
    } catch { return []; }
  }
  /** Merge display-only history from current waiting candidates (no network). */
  function rememberCandidates(cands = [], now = Date.now()) {
    const prev = readHistory();
    const byKey = new Map(prev.map(x => [`${x.id}|${x.waitingSince || ''}`, x]));
    for (const c of cands) {
      const k = `${c.id}|${c.waitingSince || ''}`;
      if (!byKey.has(k)) {
        byKey.set(k, {
          id: c.id,
          title: c.title,
          waitingSince: c.waitingSince,
          hours: c.hours,
          deepLink: c.deepLink,
          seenAt: new Date(now).toISOString(),
          source: 'cliente · umbral 24 h (sin envío)',
        });
      }
    }
    const next = [...byKey.values()].sort((a, b) => Date.parse(b.seenAt) - Date.parse(a.seenAt)).slice(0, 40);
    try { storage.setItem(NTFY_HISTORY_KEY, JSON.stringify(next)); } catch {}
    return next;
  }
  function snapshot() {
    const topic = readTopic();
    return {
      configured: Boolean(topic),
      topicMasked: topic ? `${topic.slice(0, 3)}…${topic.slice(-2)}` : '',
      subscribeUrl: topic ? subscribeUrl(topic) : '',
      history: readHistory(),
    };
  }
  return {readTopic, saveTopic, clearTopic, readHistory, rememberCandidates, snapshot, subscribeUrl: () => subscribeUrl(readTopic())};
}
