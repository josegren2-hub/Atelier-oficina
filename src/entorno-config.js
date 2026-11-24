/**
 * s17 · Configuración del entorno decorativo (fusión distrito + costa, sin letrero).
 * Puro (sin DOM) para poder probarlo en node.
 */
export const ENTORNO_KIND = 'fusion';

/** ?entorno=0|no → apagado · ?entorno=baja|alta → fuerza calidad · sin parámetro → encendido, calidad automática. */
export function entornoParam(search = '') {
  let v = null;
  try { v = new URLSearchParams(search || '').get('entorno'); } catch { v = null; }
  v = (v || '').trim().toLowerCase();
  if (v === '0' || v === 'no' || v === 'off') return {on: false, quality: null};
  return {on: true, quality: v === 'baja' || v === 'alta' ? v : null};
}

/** Calidad inicial según el dispositivo: «baja» en equipos de pocos núcleos/poca memoria o con ahorro de datos. */
export function entornoQualityFor(nav = {}) {
  const cores = Number(nav?.hardwareConcurrency) || 0, mem = Number(nav?.deviceMemory) || 0;
  if (nav?.connection?.saveData) return 'baja';
  if (cores && cores <= 4) return 'baja';
  if (mem && mem <= 3) return 'baja';
  return 'alta';
}

/** El entorno solo se ve en Edificio cerrado (sin piso abierto); se oculta en Separación amplia y Plantas. */
export function entornoVisibleFor(floor, mode) { return floor < 0 && mode === 'exterior'; }

/** Cámara de sombras: la amplia (±56) solo cuando el entorno está visible; si no, la de siempre. */
export function shadowBoxFor({stacked = false, spread = false, entorno = false} = {}) {
  if (stacked) return {left: -60, right: 60, top: 62, bottom: -56, far: 170};
  if (spread) return {left: -50, right: 50, top: 52, bottom: -48, far: 140};
  if (entorno) return {left: -56, right: 56, top: 56, bottom: -50, far: 200};
  return {left: -34, right: 34, top: 35, bottom: -30, far: 100};
}

/** Niebla sincronizada al fondo: lejos del edificio (no lo toca); apagada de hecho cuando no hay entorno visible. */
export function fogFor(distance, {visible = true, fogNear = 25, fogFar = 2.3} = {}) {
  if (!visible) return {near: 1e6, far: 1e6 + 1};
  return {near: distance + fogNear, far: distance * fogFar + fogNear};
}

/** Vigía de cuadros: si la mediana de 90 cuadros pasa de 45 ms (< ~22 fps) avisa UNA vez para bajar el detalle. */
export function createFrameWatch({frames = 90, limitMs = 45} = {}) {
  const s = []; let fired = false;
  return (ms) => {
    if (fired || !(ms > 0) || ms > 3000) return false; // s18: tope 3 s (antes 1 s); más es pestaña oculta
    s.push(ms); if (s.length < frames) return false;
    const m = [...s].sort((a, b) => a - b)[s.length >> 1]; s.length = 0;
    if (m > limitMs) { fired = true; return true; }
    return false;
  };
}
