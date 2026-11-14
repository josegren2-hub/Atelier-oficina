/** Weekly Grok Bot usage share. Encrypted like mando. Never invents numbers. */
import {assertEncEnvelope, decryptEncJson} from './crypto-mando.js';
import {bots as officeBots} from './data.js';

export function usoUrl(base) {
  try {
    const root = base || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
    return new URL('uso.enc', new URL(root, typeof document !== 'undefined' ? document.baseURI : 'https://example.invalid/')).href;
  } catch {
    return './uso.enc';
  }
}

function fold(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

/** Map a nombre or id from the feed onto an office avatar. Unknown names are dropped (never invented). */
export function mapBotName(nombre, bots = officeBots) {
  const raw = String(nombre || '').trim();
  if (!raw) return null;
  const key = fold(raw);
  const list = bots || [];
  const byId = list.find(b => fold(b.id) === key);
  if (byId) return byId;
  const byName = list.find(b => fold(b.name) === key);
  if (byName) return byName;
  const starts = list.filter(b => fold(b.name).startsWith(key) || key.startsWith(fold(b.name)));
  if (starts.length === 1) return starts[0];
  return null;
}

export function normalizeUso(data, bots = officeBots) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const semanaRaw = data.semana_pct;
  const semana = Number(semanaRaw);
  const semana_pct = Number.isFinite(semana) ? Math.max(0, Math.min(100, semana)) : null;
  if (semanaRaw != null && semana_pct == null) return null;
  const actualizado = typeof data.actualizado === 'string' ? data.actualizado.trim() : '';
  const src = Array.isArray(data.bots) ? data.bots : [];
  const rows = [];
  const seen = new Set();
  for (const row of src) {
    if (!row || typeof row !== 'object') continue;
    const bot = mapBotName(row.nombre || row.id, bots);
    const pct = Number(row.pct);
    if (!bot || !Number.isFinite(pct)) continue;
    if (seen.has(bot.id)) continue;
    seen.add(bot.id);
    rows.push({id: bot.id, name: bot.name, pct: Math.max(0, Math.min(100, pct))});
  }
  rows.sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name, 'es'));
  return {semana_pct, actualizado, bots: rows};
}

export async function loadUsoEnc({url, key, fetchImpl = fetch, subtle, bots = officeBots} = {}) {
  if (!key) return {state: 'locked', uso: null};
  const target = url || usoUrl();
  let response;
  try {
    response = await fetchImpl(target, {cache: 'no-store', credentials: 'omit'});
  } catch {
    return {state: 'missing', uso: null};
  }
  if (response.status === 404 || !response.ok) return {state: 'missing', uso: null};
  let enc;
  try { enc = await response.json(); } catch { return {state: 'missing', uso: null}; }
  try { assertEncEnvelope(enc); } catch { return {state: 'missing', uso: null}; }
  try {
    const data = await decryptEncJson(key, enc, subtle);
    const uso = normalizeUso(data, bots);
    if (!uso) return {state: 'missing', uso: null};
    return {state: 'ok', uso};
  } catch {
    return {state: 'locked', uso: null};
  }
}

export function usoLine(state, botId) {
  if (!state || state.state === 'locked') return 'Solo con el mando desbloqueado';
  if (state.state === 'missing' || !state.uso) return 'Sin dato de uso todavía';
  const row = state.uso.bots.find(b => b.id === botId);
  if (!row) return 'Sin dato de uso todavía';
  const n = Number.isInteger(row.pct) ? String(row.pct) : String(Math.round(row.pct * 10) / 10);
  return `Uso esta semana: ${n} %`;
}

export function formatActualizado(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  try {
    return new Date(t).toLocaleString('es-MX', {timeZone: 'America/Chihuahua', dateStyle: 'medium', timeStyle: 'short'});
  } catch {
    return iso;
  }
}


let usoState = {state: 'locked', uso: null};
const usoListeners = [];

export function getUsoState() {
  return usoState;
}

export function setUsoState(next) {
  usoState = next || {state: 'locked', uso: null};
  for (const fn of usoListeners) {
    try { fn(usoState); } catch {}
  }
  return usoState;
}

export function onUsoChange(fn) {
  if (typeof fn !== 'function') return () => {};
  usoListeners.push(fn);
  return () => {
    const i = usoListeners.indexOf(fn);
    if (i >= 0) usoListeners.splice(i, 1);
  };
}

/** Counts already present in mando.enc (hoy / 7d). Never invents a weekly percentage. */
export function formatMandoUso(uso) {
  if (!uso || typeof uso !== 'object' || Array.isArray(uso)) return null;
  const hoy = Number(uso.hoy?.mensajes);
  const d7 = Number(uso['7d']?.mensajes);
  if (!Number.isFinite(hoy) && !Number.isFinite(d7)) return null;
  const h = Number.isFinite(hoy) ? hoy : 0;
  const s = Number.isFinite(d7) ? d7 : 0;
  return `Hoy: ${h} mensajes · 7 días: ${s}`;
}

/** Only the approved weekly percentage. Never message counts. */
export function displayUsoLine(state, botId, _mandoUso) {
  return usoLine(state, botId);
}
