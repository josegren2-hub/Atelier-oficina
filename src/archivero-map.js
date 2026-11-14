/** Fetch and decrypt archivero.enc with the already-unlocked mando key. No keys stored here. */
import {assertEncEnvelope, decryptEncJson} from './crypto-mando.js';

export function archiveroEncUrl(base = import.meta.env.BASE_URL || '/') {
  const root = base.endsWith('/') ? base : `${base}/`;
  return `${root}archivero.enc`;
}

export async function loadArchiveroMap(key, {fetcher = fetch, subtle = globalThis.crypto?.subtle, url = archiveroEncUrl()} = {}) {
  if (!key) throw new Error('mando-locked');
  const response = await fetcher(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
    cache: 'no-store',
    credentials: 'omit',
    headers: {Accept: 'application/json'},
  });
  if (!response.ok) throw new Error(`archivero-enc-${response.status}`);
  const enc = await response.json();
  assertEncEnvelope(enc);
  return decryptEncJson(key, enc, subtle);
}

export function foldersFor(map, botId) {
  const row = map?.bots?.[botId];
  return Array.isArray(row?.folders) ? row.folders : [];
}
