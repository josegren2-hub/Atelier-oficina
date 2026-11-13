/** Luz automática por hora America/Chihuahua (como Oficina v16.16) + override manual. */
export const LIGHT_KEY = 'atelierModo'; // auto | noche | dia

const LUZH = [
  // Morning / midday stay soft; late afternoon → blue-hour dusk (fachada REF).
  [7, {sun: 1.35, ambient: 0.72, fill: 0.38, exposure: 1.18, background: '#E4D8C8', sunColor: '#ffd6a8', ambientSky: '#ffe7cc', interior: 28}],
  [11, {sun: 1.55, ambient: 0.72, fill: 0.4, exposure: 1.2, background: '#D5D2CC', sunColor: '#ffc78e', ambientSky: '#d7e0e7', interior: 24}],
  [15, {sun: 1.35, ambient: 0.62, fill: 0.36, exposure: 1.12, background: '#C8CFD8', sunColor: '#ffb070', ambientSky: '#c5d0dc', interior: 55}],
  // Blue-hour: cool grey/blue sky, warm interiors (matches fachada-san-junipero-tower-REF)
  [17.5, {sun: 0.32, ambient: 0.48, fill: 0.34, exposure: 1.06, background: '#B8C4D2', sunColor: '#ff9a6a', ambientSky: '#8fa3b8', interior: 110}],
  [19, {sun: 0.22, ambient: 0.4, fill: 0.28, exposure: 1.0, background: '#9AA8B8', sunColor: '#ff8a50', ambientSky: '#7a90a8', interior: 120}],
];

const NIGHT = {sun: 0.13, ambient: 0.22, fill: 0.16, exposure: 0.95, background: '#080f20', sunColor: '#9bb7ff', ambientSky: '#7194c4', interior: 90};
const DAY = {sun: 1.6, ambient: 0.65, fill: 0.4, exposure: 1.22, background: '#c9d8ea', sunColor: '#ffe2b0', ambientSky: '#d7e6f4', interior: 28};

export function horaChihuahua(now = new Date()) {
  const p = new Intl.DateTimeFormat('en-US', {timeZone: 'America/Chihuahua', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'}).formatToParts(now);
  const g = t => +p.find(x => x.type === t).value;
  return g('hour') + g('minute') / 60;
}

export function isNightHour(h = horaChihuahua()) {
  return h >= 19 || h < 7;
}

export function readLightPref(storage = globalThis.localStorage) {
  try {
    const v = storage?.getItem(LIGHT_KEY);
    if (v === 'noche' || v === 'dia' || v === 'auto') return v;
    // migrate old atelier.theme
    const old = storage?.getItem('atelier.theme');
    if (old === 'night') return 'noche';
    if (old === 'day') return 'dia';
  } catch {}
  return 'auto';
}

export function saveLightPref(pref, storage = globalThis.localStorage) {
  try { storage?.setItem(LIGHT_KEY, pref); return true; } catch { return false; }
}

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(lerp(ar, br, t)), g = Math.round(lerp(ag, bg, t)), bl = Math.round(lerp(ab, bb, t));
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

export function luzHora(h = horaChihuahua()) {
  let i = 0;
  while (i < LUZH.length - 1 && h >= LUZH[i + 1][0]) i++;
  const [h0, a] = LUZH[i];
  const [h1, b] = LUZH[Math.min(i + 1, LUZH.length - 1)];
  const t = h1 > h0 ? Math.min(1, Math.max(0, (h - h0) / (h1 - h0))) : 0;
  return {
    sun: lerp(a.sun, b.sun, t),
    ambient: lerp(a.ambient, b.ambient, t),
    fill: lerp(a.fill, b.fill, t),
    exposure: lerp(a.exposure, b.exposure, t),
    background: lerpHex(a.background, b.background, t),
    sunColor: lerpHex(a.sunColor, b.sunColor, t),
    ambientSky: lerpHex(a.ambientSky, b.ambientSky, t),
    interior: lerp(a.interior ?? 28, b.interior ?? 28, t),
    fase: h < 11 ? 'mañana' : h < 15 ? 'mediodía' : 'tarde',
  };
}

export function resolveLighting(pref = readLightPref(), now = new Date()) {
  const h = horaChihuahua(now);
  if (pref === 'noche' || (pref === 'auto' && isNightHour(h))) {
    return {...NIGHT, fase: 'noche', pref, hour: h, isNight: true};
  }
  if (pref === 'auto') {
    return {...luzHora(h), pref, hour: h, isNight: false};
  }
  return {...DAY, fase: 'día', pref, hour: h, isNight: false};
}

export function cycleLightPref(pref = readLightPref()) {
  return {auto: 'noche', noche: 'dia', dia: 'auto'}[pref] || 'auto';
}
