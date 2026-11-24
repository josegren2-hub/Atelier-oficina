/**
 * s19 · Desvanecido de oclusión del entorno, estable y por edificio (Rob t432u «los otros edificios me tapan la vista»
 * y t441u «mira cómo parpadea»).
 *
 * s18 usaba un tramado en pantalla por fragmento dentro de un cono ancho: parpadeaba y disolvía torres que estaban
 * a un lado o detrás. Ahora:
 *  - En CPU (con throttle: solo si la cámara se movió y como mucho cada 100 ms) se decide, POR EDIFICIO, si alguno
 *    de los rayos cámara→oficina choca con su caja ANTES de entrar a la oficina. Nada que esté detrás o a un lado.
 *    Histeresis: para prender hace falta chocar con la caja + 0.5 m; para apagar, dejar de chocar con la caja + 2.5 m.
 *  - En GPU, cada edificio lleva su id en un atributo (aTower) y lee su opacidad de un arreglo de uniformes.
 *    El mesh opaco descarta el edificio desvanecido y un mesh «fantasma» (mismo geometry, material transparente,
 *    depthWrite off) lo dibuja con opacidad 0.2. Transición interpolada de 250 ms. Sin ruido, sin tiempo, sin
 *    gl_FragCoord: con la cámara quieta la imagen no cambia entre cuadros.
 *  - Los materiales se compilan una sola vez; por cuadro solo se escriben ≤24 floats.
 */
import * as THREE from 'three';

// Oficina en Edificio cerrado (viewVolumes de view-layout): x −13..16, y 0..28.7, z −9..9.
export const OFFICE_BOX = Object.freeze({min: Object.freeze([-13, 0, -9]), max: Object.freeze([16, 28.7, 9])});
export const OFFICE_CENTER = Object.freeze([1.5, 14, 0]);
export const FADE_OPACITY = 0.2;
export const FADE_MS = 250;
export const THROTTLE_MS = 100;
export const PAD_ON = 0.5, PAD_OFF = 2.5;
export const MAX_TOWERS = 24;
// Materiales de piso: nunca se desvanecen.
export const GROUND_KEYS = Object.freeze(['asphalt', 'lane', 'grass', 'pavers', 'curb', 'sand', 'water', 'foam', 'soil', 'pool', 'jet', 'concrete']);

/** 27 puntos de la oficina (rejilla 3×3×3 apenas dentro de la caja). */
export function officeSamples(box = OFFICE_BOX) {
  const out = [];
  for (const a of [.06, .5, .94]) for (const b of [.06, .5, .94]) for (const c of [.06, .5, .94])
    out.push([box.min[0] + (box.max[0] - box.min[0]) * a, box.min[1] + (box.max[1] - box.min[1]) * b, box.min[2] + (box.max[2] - box.min[2]) * c]);
  return out;
}
const SAMPLES = officeSamples();

/** Segmento o→p contra caja [min,max] (+pad). Devuelve el t de entrada (0..1) o Infinity si no choca. */
export function segmentBoxEnter(o, p, min, max, pad = 0) {
  let t0 = 0, t1 = 1;
  for (let k = 0; k < 3; k++) {
    const d = p[k] - o[k], lo = min[k] - pad, hi = max[k] + pad;
    if (Math.abs(d) < 1e-9) { if (o[k] < lo || o[k] > hi) return Infinity; continue; }
    let a = (lo - o[k]) / d, b = (hi - o[k]) / d; if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return Infinity;
  }
  return t0;
}

/** Cuántos rayos cámara→oficina choca el edificio antes de llegar a la oficina. */
export function towerBlockCount(cam, tower, pad = 0, samples = SAMPLES) {
  let n = 0;
  for (const s of samples) {
    const tOffice = segmentBoxEnter(cam, s, OFFICE_BOX.min, OFFICE_BOX.max, 0);
    const lim = Number.isFinite(tOffice) ? tOffice : 1;
    const t = segmentBoxEnter(cam, s, tower.min, tower.max, pad);
    if (t < lim) n++;
  }
  return n;
}

/** Con histeresis: ¿el edificio debe estar desvanecido? */
export function towerOccludes(cam, tower, wasOn = false) {
  return towerBlockCount(cam, tower, wasOn ? PAD_OFF : PAD_ON) > 0;
}

/** Avanza la opacidad interpolada (0 = se ve, 1 = desvanecido) dt ms hacia el objetivo. */
export function stepFade(f, on, dtMs, ms = FADE_MS) {
  const s = Math.max(0, dtMs) / ms;
  return on ? Math.min(1, f + s) : Math.max(0, f - s);
}

const VERT_DECL = 'attribute float aTower;\nuniform float uOccFade[' + MAX_TOWERS + '];\nvarying float vOccFade;\n';
function vert(shader) {
  return VERT_DECL + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  { int occId = int(aTower + 0.5) - 1; vOccFade = (occId >= 0 && occId < ${MAX_TOWERS}) ? uOccFade[occId] : 0.0; }`);
}

/** Instala el desvanecido. towers: Map id→Box3 (coordenadas del mundo del entorno). */
export function installOcclusionFade(root, towers = new Map()) {
  const fadeArr = new Float32Array(MAX_TOWERS);
  const shared = {uOccFade: {value: fadeArr}};
  root.updateMatrixWorld(true);
  const list = [];
  for (const [id, box] of towers) {
    if (id < 1 || id > MAX_TOWERS || box.isEmpty()) continue;
    const b = box.clone().applyMatrix4(root.matrixWorld);
    list.push({id, min: b.min.toArray(), max: b.max.toArray(), on: false, f: 0});
  }
  const meshes = [], ghosts = [], materials = [], seen = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.material || !o.geometry?.attributes?.aTower) return;
    const key = o.material.userData?.key; if (!key || GROUND_KEYS.includes(key)) return;
    const arr = o.geometry.attributes.aTower.array; let any = false; for (let i = 0; i < arr.length; i++) if (arr[i] > 0) { any = true; break; }
    if (any) meshes.push(o);
  });
  for (const o of meshes) {
    const m = o.material, key = m.userData.key;
    if (!seen.has(m)) {
      seen.set(m, true); materials.push(key);
      const transparent = !!m.transparent;
      m.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, shared);
        shader.vertexShader = vert(shader);
        shader.fragmentShader = 'varying float vOccFade;\n' + shader.fragmentShader.replace('#include <dithering_fragment>', transparent
          ? `#include <dithering_fragment>\n  gl_FragColor.a *= mix(1.0, ${FADE_OPACITY.toFixed(2)}, vOccFade);`
          : `#include <dithering_fragment>\n  if (vOccFade > 0.0) discard;`);
      };
      m.customProgramCacheKey = () => 'occ-s19-' + (transparent ? 't' : 'o');
      m.needsUpdate = true;
    }
    if (m.transparent) continue;
    // fantasma: mismo geometry, transparente, sin escribir profundidad; solo pinta los edificios desvanecidos
    const g = m.clone(); g.transparent = true; g.depthWrite = false; g.userData = {...m.userData, ghost: true};
    g.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, shared);
      shader.vertexShader = vert(shader);
      shader.fragmentShader = 'varying float vOccFade;\n' + shader.fragmentShader.replace('#include <dithering_fragment>',
        `#include <dithering_fragment>\n  if (vOccFade <= 0.0) discard;\n  gl_FragColor.a *= mix(1.0, ${FADE_OPACITY.toFixed(2)}, vOccFade);`);
    };
    g.customProgramCacheKey = () => 'occ-s19-ghost';
    const ghost = new THREE.Mesh(o.geometry, g);
    ghost.name = 'fantasma:' + key; ghost.userData.ghost = true; ghost.castShadow = false; ghost.receiveShadow = o.receiveShadow;
    ghost.matrixAutoUpdate = false; ghost.matrix.copy(o.matrix); ghost.renderOrder = 2; ghost.visible = false; ghost.raycast = () => {};
    o.parent.add(ghost); ghosts.push({ghost, src: m});
  }
  const cam = [0, 0, 0], last = [NaN, NaN, NaN];
  let lastCheck = -Infinity, lastFrame = null, enabled = true, checks = 0;
  const syncGhost = (g, m) => { const d = g.material; d.color.copy(m.color); if (m.emissive) d.emissive.copy(m.emissive); d.emissiveIntensity = m.emissiveIntensity; d.map = m.map; d.emissiveMap = m.emissiveMap; d.envMapIntensity = m.envMapIntensity; };
  function update(camera, now = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    const p = camera.position; cam[0] = p.x; cam[1] = p.y; cam[2] = p.z;
    const moved = Math.abs(cam[0] - last[0]) + Math.abs(cam[1] - last[1]) + Math.abs(cam[2] - last[2]) > 1e-3 || !Number.isFinite(last[0]);
    if (moved && now - lastCheck >= THROTTLE_MS) {
      lastCheck = now; last[0] = cam[0]; last[1] = cam[1]; last[2] = cam[2]; checks++;
      for (const t of list) t.on = enabled && towerOccludes(cam, t, t.on);
    }
    const dt = lastFrame === null ? 0 : Math.min(100, now - lastFrame); lastFrame = now;
    let any = false;
    for (const t of list) { const f = stepFade(t.f, t.on, dt); if (f !== t.f) { t.f = f; fadeArr[t.id - 1] = f; } if (t.f > 0) any = true; }
    for (const {ghost, src} of ghosts) { if (any) syncGhost(ghost, src); ghost.visible = any; }
  }
  return {
    materials, ghosts: ghosts.length, towers: list,
    update,
    state() { return {checks, towers: list.map((t) => ({id: t.id, on: t.on, f: +t.f.toFixed(3)}))}; },
    setEnabled(v) { enabled = !!v; if (!enabled) for (const t of list) t.on = false; last[0] = NaN; },
    uniforms: shared,
  };
}
