/** Posponer Te espera — solo localStorage (atelierPos). Nunca se sube. */
const KEY = 'atelierPos';

function load(storage = globalThis.localStorage) {
  try { return JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { return {}; }
}

function save(map, storage = globalThis.localStorage) {
  try { storage?.setItem(KEY, JSON.stringify(map)); return true; } catch { return false; }
}

function prune(map, now = Date.now()) {
  for (const k of Object.keys(map)) if (!(map[k] > now)) delete map[k];
  return map;
}

export function postponeKey(id, waitingSince) {
  return `${id}|${waitingSince || ''}`;
}

export function isPostponed(bot, storage, now = Date.now()) {
  if (!bot?.id || bot.status !== 'review') return false;
  const map = prune(load(storage), now);
  return (map[postponeKey(bot.id, bot.waitingSince)] || 0) > now;
}

/** modo: '3h' | 'manana' — mañana = 08:00 hora local del dispositivo (como v16.15). */
export function postpone(id, waitingSince, modo, storage, now = Date.now()) {
  const map = prune(load(storage), now);
  let until = now + 3 * 3600e3;
  if (modo === 'manana') {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    until = d.getTime();
  }
  map[postponeKey(id, waitingSince)] = until;
  save(map, storage);
  return until;
}

export function clearExpiredPostpones(storage, now = Date.now()) {
  const map = prune(load(storage), now);
  save(map, storage);
  return map;
}

export function filterWaiting(bots, storage, now = Date.now()) {
  clearExpiredPostpones(storage, now);
  return (bots || []).filter(b => b.status === 'review' && !b.stale && !isPostponed(b, storage, now))
    .sort((a, b) => (Date.parse(a.waitingSince) || 9e15) - (Date.parse(b.waitingSince) || 9e15));
}
