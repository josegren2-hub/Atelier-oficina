/** Phase 2: read-only client for public mando.enc + tareas.enc from Oficina-bots. */
import {SOURCE_CONTRACT} from './source-contract.js';
import {clipPhrase} from './text-clip.js';
import {assertEncEnvelope, decryptEncJson, deriveMandoKey, exportRawKey, importRawKey} from './crypto-mando.js';

export const MANDO_ENDPOINTS = Object.freeze({
  mando: 'https://josegren2-hub.github.io/Oficina-bots/mando.enc',
  tareas: 'https://josegren2-hub.github.io/Oficina-bots/tareas.enc',
});
const LS_KEY = 'atelierMandoClave';
const TAREAS_POLL_MS = 60_000;
const MANDO_POLL_MS = 5 * 60_000;

function cacheBust(url, now = Date.now()) {
  return `${url}${url.includes('?') ? '&' : '?'}t=${now}`;
}

async function fetchEnc(url, fetcher = fetch) {
  const response = await fetcher(cacheBust(url), {cache: 'no-store', credentials: 'omit', headers: {Accept: 'application/json'}});
  if (!response.ok) throw new Error(`No se pudo leer ${url.split('/').pop()} (${response.status})`);
  const enc = await response.json();
  assertEncEnvelope(enc);
  return enc;
}

function ageLabel(generado) {
  const g = Date.parse(generado);
  if (!Number.isFinite(g)) return '';
  const mi = (Date.now() - g) / 6e4;
  const text = mi < 60 ? `hace ${Math.round(mi)} min` : mi < 1440 ? `hace ${Math.round(mi / 60)} h` : `hace ${Math.round(mi / 1440)} d`;
  return mi > 60 ? `⚠️ dato viejo (${text})` : `(${text})`;
}

function hm(value) {
  const d = new Date(value);
  if (Number.isNaN(+d)) return '';
  const tz = 'America/Chihuahua';
  const sameDay = d.toLocaleDateString('es-MX', {timeZone: tz}) === new Date().toLocaleDateString('es-MX', {timeZone: tz});
  const time = d.toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit', timeZone: tz});
  if (sameDay) return time;
  return d.toLocaleString('es-MX', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: tz});
}

/** True if the text names a command or script, not a human task. */
export function isProcessPhrase(text) {
  const s = String(text || '').trim();
  if (!s) return true;
  const low = s.toLowerCase();
  if (low.startsWith('comando en terminal')) return true;
  if (/\.(js|mjs|cjs|py|sh|ts|tsx|jsx)(\s|$|·|,)/i.test(s)) return true;
  if (/^(node|python3?|npm|npx|pnpm|yarn|bun|bash|sh|dash|zsh|git|vite|ffmpeg|curl|wget|pip3?|blender)\b/i.test(s)) return true;
  return false;
}

const PROJECT_NAMES = Object.freeze([
  ['atelier-trabajo', 'Oficina Atelier'],
  ['oficina-bots', 'Oficina 3D'],
  ['ofi-pub', 'Oficina 3D'],
  ['remotion-tinta-rosa', 'Video Tinta Rosa'],
  ['github-tinta-rosa', 'Tinta Rosa web'],
  ['tinta-rosa', 'Tinta Rosa web'],
  ['uach-moodle', 'Moodle UACH'],
  ['habitflow', 'App HabitFlow'],
  ['juridico', 'Jurídico'],
  ['expediente', 'Jurídico'],
  ['finanzas', 'Finanzas'],
  ['calendario', 'Calendario'],
  ['substack', 'Substack'],
  ['podcast', 'Podcast'],
  ['blender', 'Render 3D'],
  ['moodle', 'Moodle UACH'],
  ['salud', 'Salud'],
  ['libro', 'Libro'],
  ['redes', 'Redes'],
  ['videos', 'Videos'],
]);

/** Human project name from a process phrase or folder slug; never returns a command. */
export function humanProjectName(text) {
  const s = String(text || '').trim();
  if (!s) return null;
  const low = s.toLowerCase();
  for (const [key, name] of PROJECT_NAMES) {
    if (low.includes(key)) return name;
  }
  if (!isProcessPhrase(s) && !/[/\\]/.test(s) && s.length <= 40) return s;
  return null;
}

/** Ahora: último mensaje del chat, si no un título legible, si no el nombre humano del proyecto. */
export function liveTaskText({botId, mandoBot, vivoStatus, tareas, mandoGenerado} = {}) {
  const working = vivoStatus === 'working' || vivoStatus === 'trabajando';
  const row = tareas?.bots?.[botId];
  const ultimo = row?.ultimo?.txt;
  if (ultimo && !isProcessPhrase(ultimo)) {
    return {text: clipPhrase(ultimo, 80), detail: `su último mensaje, ${hm(row.ultimo.t)}`, source: 'tareas.enc'};
  }
  if (mandoBot?.tarea && !isProcessPhrase(mandoBot.tarea)) {
    return {text: mandoBot.tarea, detail: ageLabel(mandoGenerado), source: 'mando.enc'};
  }
  const resumen = typeof mandoBot?.resumen?.txt === 'string' ? mandoBot.resumen.txt.trim() : '';
  if (resumen && !isProcessPhrase(resumen)) {
    return {text: clipPhrase(resumen, 80), detail: ageLabel(mandoGenerado), source: 'mando.enc'};
  }
  const project = humanProjectName(row?.frase);
  if (project) {
    return {text: project, detail: row?.desde ? `desde ${hm(row.desde)}` : '', source: 'tareas.enc'};
  }
  if (working) return {text: 'Trabajando', detail: '', source: 'estado'};
  return null;
}


function sameSnippet(a, b) {
  const x = String(a || '').trim();
  const y = String(b || '').trim();
  if (!x || !y) return false;
  return x === y || x.startsWith(y) || y.startsWith(x);
}

/** Prefer tareas.enc anterior (kept by estado-vivo as the last Ahora), then mando.enc historial. */
function humanSnippet(raw, current) {
  if (!raw || typeof raw !== 'string') return null;
  const txt = raw.trim();
  if (!txt || isProcessPhrase(txt) || sameSnippet(txt, current)) return null;
  return clipPhrase(txt, 80);
}

export function previousTaskText(mandoBot, currentText, tareasRow) {
  const cur = currentText || '';
  const ant = tareasRow?.anterior;
  const fromAnt = humanSnippet(ant?.txt, cur);
  if (fromAnt) {
    const when = hm(ant.t);
    return when ? `${fromAnt} · ${when}` : fromAnt;
  }
  const hist = Array.isArray(mandoBot?.historial) ? mandoBot.historial : [];
  const prev = hist.find(h => humanSnippet(h?.txt, cur));
  if (!prev) return null;
  const txt = humanSnippet(prev.txt, cur);
  const when = hm(prev.t);
  return when ? `${txt} · ${when}` : txt;
}

export function waitingFromLive(snapshot) {
  return (snapshot?.bots || []).filter(b => b.status === 'review' && !b.stale);
}

export function authorizationItems(mandoBot, vivoStatus) {
  if (!mandoBot) return [];
  if (vivoStatus && vivoStatus !== 'review' && vivoStatus !== 'esperando') return [];
  return [...new Set(mandoBot.ok || [])].filter(Boolean);
}

export function createMandoSession({
  fetcher = fetch,
  storage = globalThis.localStorage,
  subtle = globalThis.crypto?.subtle,
  onChange = () => {},
} = {}) {
  let key = null;
  let mandoEnc = null;
  let mando = null;
  let tareas = null;
  let unlocked = false;
  let remembered = false;
  let error = null;
  let timers = [];

  function snapshot() {
    return {
      unlocked,
      remembered,
      error,
      mando,
      tareas,
      generado: mando?.generado || null,
      tareasGenerado: tareas?.generado || null,
      source: SOURCE_CONTRACT.sourceLabel,
    };
  }

  function emit() {
    onChange(snapshot());
  }

  function clearTimers() {
    for (const id of timers) clearInterval(id);
    timers = [];
  }

  async function loadTareas() {
    if (!key || !mandoEnc) return;
    const enc = await fetchEnc(MANDO_ENDPOINTS.tareas, fetcher);
    if (enc.salt !== mandoEnc.salt) throw new Error('tareas.enc y mando.enc no comparten sal');
    tareas = await decryptEncJson(key, enc, subtle);
  }

  async function loadMandoWithKey(nextKey) {
    mandoEnc = await fetchEnc(MANDO_ENDPOINTS.mando, fetcher);
    const data = await decryptEncJson(nextKey, mandoEnc, subtle);
    if (!data || !Array.isArray(data.bots)) throw new Error('mando.enc sin bots');
    key = nextKey;
    mando = data;
    unlocked = true;
    error = null;
    await loadTareas().catch(() => { tareas = null; });
    clearTimers();
    timers.push(setInterval(() => { loadTareas().then(emit).catch(() => {}); }, TAREAS_POLL_MS));
    timers.push(setInterval(() => { refresh().catch(() => {}); }, MANDO_POLL_MS));
    emit();
    return snapshot();
  }

  async function unlock(passphrase, {remember = true} = {}) {
    const enc = await fetchEnc(MANDO_ENDPOINTS.mando, fetcher);
    const nextKey = await deriveMandoKey(passphrase, enc, subtle);
    mandoEnc = enc;
    await loadMandoWithKey(nextKey);
    remembered = !!remember && !!storage;
    if (remembered) {
      storage.setItem(LS_KEY, JSON.stringify({salt: enc.salt, k: await exportRawKey(nextKey, subtle)}));
    } else if (storage) {
      storage.removeItem(LS_KEY);
    }
    return snapshot();
  }

  async function tryRestore() {
    if (!storage) return snapshot();
    let saved;
    try { saved = JSON.parse(storage.getItem(LS_KEY) || 'null'); } catch { saved = null; }
    if (!saved?.salt || !saved?.k) return snapshot();
    try {
      const enc = await fetchEnc(MANDO_ENDPOINTS.mando, fetcher);
      if (enc.salt !== saved.salt) throw new Error('sal distinta');
      mandoEnc = enc;
      remembered = true;
      await loadMandoWithKey(await importRawKey(saved.k, subtle));
    } catch {
      storage.removeItem(LS_KEY);
      remembered = false;
      key = null; mando = null; tareas = null; unlocked = false;
      error = null;
      emit();
    }
    return snapshot();
  }

  async function refresh() {
    if (!key) return snapshot();
    return loadMandoWithKey(key);
  }

  function lock() {
    clearTimers();
    key = null; mando = null; tareas = null; mandoEnc = null; unlocked = false; remembered = false; error = null;
    try { storage?.removeItem(LS_KEY); } catch {}
    emit();
    return snapshot();
  }

  function botRecord(id) {
    return mando?.bots?.find(b => b.id === id) || null;
  }

  function enrichBot(liveBot) {
    if (!liveBot) return null;
    const mandoBot = botRecord(liveBot.id);
    const waiting = liveBot.status === 'review' && !liveBot.stale;
    const task = unlocked
      ? liveTaskText({botId: liveBot.id, mandoBot, vivoStatus: liveBot.status, tareas, mandoGenerado: mando?.generado})
      : null;
    const auths = unlocked ? authorizationItems(mandoBot, liveBot.status) : [];
    const resolvedWait = unlocked && mandoBot && !waiting && (mandoBot.resuelto || mandoBot.pendiente || (mandoBot.ok || []).length);
    return {
      ...liveBot,
      waiting,
      waitingResolved: !!resolvedWait,
      pendiente: unlocked && waiting ? (mandoBot?.pendiente || null) : null,
      authorization: auths,
      agente: unlocked ? (mandoBot?.agente || null) : null,
      callado: unlocked ? (mandoBot?.callado || null) : null,
      rutina: unlocked ? (mandoBot?.rutina || null) : null,
      liveTask: task,
      // Prefer live encrypted phrase / supervisor task over public estado frase when unlocked.
      task: task?.text || liveBot.task || null,
      activity: task ? [task.text, task.detail].filter(Boolean).join(' · ') : liveBot.activity,
      previousTask: unlocked ? previousTaskText(mandoBot, task?.text || liveBot.task, tareas?.bots?.[liveBot.id]) : (liveBot.previousTask || null),
      mandoUso: unlocked ? (mandoBot?.uso || null) : null,
      // t334u: short explained summary built by recolectar-mando.py rules (no model calls).
      resumen: unlocked && typeof mandoBot?.resumen?.txt === 'string' ? mandoBot.resumen.txt : null,
      mandoUnlocked: unlocked,
    };
  }

  return {
    unlock, tryRestore, refresh, lock, snapshot, enrichBot, botRecord,
    get unlocked() { return unlocked; },
    get mando() { return mando; },
    get tareas() { return tareas; },
    get key() { return key; },
  };
}

