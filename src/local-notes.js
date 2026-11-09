/** Notas privadas por bot — solo localStorage (atelierNotas). Nunca se sube. */
const KEY = 'atelierNotas';

export function readNotes(storage = globalThis.localStorage) {
  try { return JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { return {}; }
}

export function getNote(id, storage = globalThis.localStorage) {
  const n = readNotes(storage)[id];
  return typeof n === 'string' ? n : '';
}

export function setNote(id, text, storage = globalThis.localStorage) {
  const map = readNotes(storage);
  const trimmed = String(text ?? '').trim();
  if (trimmed) map[id] = trimmed;
  else delete map[id];
  try { storage?.setItem(KEY, JSON.stringify(map)); return true; } catch { return false; }
}
