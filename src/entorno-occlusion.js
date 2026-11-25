/**
 * Boceto · Círculo de visión ESTABLE (Rob: «Regresa el círculo pero sin parpadeo»).
 *
 * s18 disolvía el entorno dentro de un cono 3D con un tramado por gl_FragCoord que cambiaba
 * de aspecto (parpadeo) y a veces tocaba torres del fondo. s19 (0.22.9) desvanecía el edificio
 * completo. Este boceto vuelve al círculo, pero en pantalla y sin ruido:
 *
 *  - El centro y el radio se calculan proyectando la caja de la oficina (OFFICE_BOX) con un
 *    margen, y SOLO se recalculan cuando se mueve la cámara (o cambia el tamaño / la proyección).
 *    Al quedarse quieta, los uniformes se fijan en el valor exacto: dos cuadros = los mismos píxeles.
 *  - Dentro del círculo, un fragmento del entorno más cercano que la profundidad de la oficina
 *    se vuelve vidrio fantasma (variante A) o se recorta (variante B, con un aro fino #bcd9ec).
 *    Lo que está detrás o a un lado no se toca: no hay falsos positivos en torres del fondo.
 *  - Sin ruido, sin tiempo, sin tramado por gl_FragCoord. Los materiales se compilan una vez.
 *  - Aplica a torres y, sin costo grande, a árboles y palmeras instanciados. Los pisos (GROUND_KEYS) nunca.
 *  - Se apaga con ?circulo=0. Variante B: ?circulo=b.
 *  - Variante C (por defecto, ?circulo=c), s21: círculo en pantalla que escala con el tamaño de la
 *    oficina (caja proyectada + margen en metros y en fracción). El centro se descarta por completo
 *    (silueta limpia, sin restos de torres) y el tramado IGN fijo de s18 queda solo en el borde.
 *    La prueba de profundidad compara distancias en el mundo (fragmento vs lado lejano de la oficina)
 *    con uniforms, sin textura de profundidad — robusto en móviles. Sin meshes fantasma.
 */
import * as THREE from 'three';

// Oficina en Edificio cerrado (viewVolumes de view-layout): x −13..16, y 0..28.7, z −9..9.
export const OFFICE_BOX = Object.freeze({min: Object.freeze([-13, 0, -9]), max: Object.freeze([16, 28.7, 9])});
export const OFFICE_CENTER = Object.freeze([1.5, 14, 0]);
export const OFFICE_RADIUS = 23;
export const FADE_BAND = 4;
export const FADE_WIDEN = 1.2;
// Torres: se disuelven desde la banqueta. Árboles, palmeras y farolas solo arriba de 8 m (como s18).
export const TOWER_KEYS = Object.freeze(['towerGlass', 'lobbyGlass', 'mullion', 'mullionDark', 'slab', 'slabDark', 'roofFlat', 'crown', 'winGlass', 'winOff']);
export const Y_TOWER = -0.25, Y_OTHER = 8;

/** Pisos: nunca se tocan (no tapan la oficina y dejarían hoyos en el suelo). */
export const GROUND_KEYS = Object.freeze([
  'asphalt', 'lane', 'laneAmber', 'grass', 'pavers', 'curb', 'sand', 'water',
  'foam', 'soil', 'pool', 'jet', 'concrete', 'paint',
]);

/** Valores editables del círculo. El query string solo elige variante y si está encendido. */
export const CIRCLE_CONFIG = {
  margin: 0.35,       // fracción extra del radio proyectado (s21: más holgura a los lados)
  boxPad: 12,         // metros de margen mundial alrededor de la caja de la oficina
  minRadiusPx: 36,    // radio mínimo en píxeles del buffer
  band: 0.22,         // fracción del radio que es borde punteado (el resto del círculo es hueco)
  opacity: 0.2,       // vidrio fantasma, variante A (0.15–0.25)
  softness: 16,       // suavidad del borde en píxeles (variante A)
  ringWidth: 2,       // grosor del aro en px CSS (variante B)
  ringColor: '#bcd9ec',
  depthMix: 0.92,     // 0 = solo la cara cercana, 1 = hasta la cara lejana de la caja (A/B)
  depthBias: 0.8,     // metros por delante del umbral, para no pelear con la fachada (A/B)
  smooth: 0.4,        // interpolación solo mientras la cámara se mueve (0 = siempre exacto)
};

export function circuloParam(search = (typeof location !== 'undefined' ? location.search : '')) {
  let v = '';
  try { v = (new URLSearchParams(search || '').get('circulo') || '').trim().toLowerCase(); } catch { v = ''; }
  if (v === '0' || v === 'no' || v === 'off') return {enabled: false, variant: 'c'};
  if (v === 'b' || v === 'aro' || v === 'clip') return {enabled: true, variant: 'b'};
  if (v === 'a' || v === 'vidrio' || v === 'ghost') return {enabled: true, variant: 'a'};
  return {enabled: true, variant: 'c'}; // default y ?circulo=c
}

const BOX_CORNERS = (() => {
  const {min, max} = OFFICE_BOX, out = [];
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) out.push([x, y, z]);
  return out;
})();
const BOX_EDGES = [
  [0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7],
];

const _w = new THREE.Vector3(), _u = new THREE.Vector3(), _ndc = new THREE.Vector3();

/**
 * Proyecta la caja de la oficina al buffer de dibujo (origen abajo-izquierda, como gl_FragCoord).
 * Recorta las aristas contra el plano cercano de la cámara para que el zoom no rompa el círculo.
 * Devuelve {cx, cy, radius, near, far, visible}.
 */
export function paddedOfficeBox(box = OFFICE_BOX, pad = CIRCLE_CONFIG.boxPad || 0) {
  if (!pad) return box;
  return {
    min: [box.min[0] - pad, box.min[1], box.min[2] - pad],
    max: [box.max[0] + pad, box.max[1] + pad, box.max[2] + pad],
  };
}

function cornersOf(box) {
  const {min, max} = box, out = [];
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) out.push([x, y, z]);
  return out;
}

/** Distancia mundial del origen al vértice más lejano de la caja (lado lejano de la oficina). */
export function officeFarDistance(origin, box = OFFICE_BOX, pad = 0) {
  const b = paddedOfficeBox(box, pad);
  let far = 0;
  for (const [x, y, z] of cornersOf(b)) {
    const d = Math.hypot(origin.x - x, origin.y - y, origin.z - z);
    if (d > far) far = d;
  }
  return far;
}

export function projectOfficeCircle(camera, width, height, {
  box = OFFICE_BOX, margin = CIRCLE_CONFIG.margin, minRadiusPx = CIRCLE_CONFIG.minRadiusPx,
  boxPad = CIRCLE_CONFIG.boxPad || 0,
} = {}) {
  camera.updateMatrixWorld?.(true);
  const view = camera.matrixWorldInverse;
  const nearClip = Math.max(0.05, (camera.near || 0.1) * 1.05);
  let near = Infinity, far = -Infinity;
  const pts = [];
  const use = paddedOfficeBox(box, boxPad);
  const corners = cornersOf(use);

  const pushWorld = (x, y, z) => {
    _ndc.set(x, y, z).project(camera);
    if (!Number.isFinite(_ndc.x + _ndc.y)) return;
    pts.push(((_ndc.x * 0.5) + 0.5) * width, ((_ndc.y * 0.5) + 0.5) * height);
  };

  for (const [x, y, z] of corners) {
    _w.set(x, y, z).applyMatrix4(view);
    const d = -_w.z;
    if (d > nearClip) { near = Math.min(near, d); far = Math.max(far, d); }
  }
  for (const [ia, ib] of BOX_EDGES) {
    const a = corners[ia], b = corners[ib];
    _w.set(...a).applyMatrix4(view); _u.set(...b).applyMatrix4(view);
    const da = -_w.z, db = -_u.z;
    const aIn = da >= nearClip, bIn = db >= nearClip;
    if (aIn && bIn) { pushWorld(...a); pushWorld(...b); continue; }
    if (!aIn && !bIn) continue;
    const t = (nearClip - da) / (db - da);
    if (Number.isFinite(t) && t >= 0 && t <= 1) {
      pushWorld(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
    }
    if (aIn) pushWorld(...a);
    if (bIn) pushWorld(...b);
  }

  if (!pts.length || !Number.isFinite(near)) {
    return {cx: width * 0.5, cy: height * 0.5, radius: 0, near: 0, far: 0, visible: false};
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    const x = pts[i], y = pts[i + 1];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5;
  let r = 0;
  for (let i = 0; i < pts.length; i += 2) {
    const dx = pts[i] - cx, dy = pts[i + 1] - cy, d = Math.hypot(dx, dy);
    if (d > r) r = d;
  }
  r = Math.max(minRadiusPx, r * (1 + margin));
  return {cx, cy, radius: r, near, far, visible: true};
}

function drawingBuffer() {
  const r = (typeof globalThis !== 'undefined' && globalThis.__atelierOffice?.renderer) || null;
  if (r?.domElement) {
    return {w: r.domElement.width || 1, h: r.domElement.height || 1, canvas: r.domElement, pr: r.getPixelRatio?.() || 1};
  }
  const c = (typeof document !== 'undefined') ? document.querySelector('#viewport canvas, #canvas-container canvas, canvas') : null;
  if (c) return {w: c.width || 1, h: c.height || 1, canvas: c, pr: (c.width / Math.max(1, c.clientWidth)) || 1};
  return {w: 1, h: 1, canvas: null, pr: 1};
}

function cameraMoved(camera, last, w, h, eps = 2e-5) {
  const p = camera.position, e = camera.projectionMatrix.elements, i = camera.matrixWorldInverse.elements;
  const cur = [p.x, p.y, p.z, camera.zoom || 1, camera.fov || 0, camera.aspect || 0, w, h, e[0], e[5], e[10], i[0], i[1], i[2], i[12], i[13], i[14]];
  if (!last.length) { last.push(...cur); return true; }
  let moved = last.length !== cur.length;
  if (!moved) for (let k = 0; k < cur.length; k++) if (Math.abs(cur[k] - last[k]) > eps) { moved = true; break; }
  if (moved) { last.length = 0; last.push(...cur); }
  return moved;
}

const VERT_HOOK = `#include <project_vertex>
  vOccViewZ = -mvPosition.z;
  { vec4 occW = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
    occW = instanceMatrix * occW;
#endif
    vOccW = (modelMatrix * occW).xyz; }`;

function patchVertex(shader) {
  shader.vertexShader = 'varying float vOccViewZ;\nvarying vec3 vOccW;\n' + shader.vertexShader.replace('#include <project_vertex>', VERT_HOOK);
}

function patchFragment(shader, {ghost = false, clip = false, fade = false, dither = false} = {}) {
  const head = `varying float vOccViewZ;
varying vec3 vOccW;
uniform vec2 uOccCenter;
uniform float uOccRadius;
uniform float uOccSoft;
uniform float uOccDepth;
uniform float uOccOn;
uniform float uOccOpacity;
uniform float uOccMode;
uniform vec3 uOccCam;
uniform vec3 uOccTgt;
uniform float uOccR;
uniform float uOccFar;
uniform float uOccY;
`;
  const ditherBody = `
  if (uOccOn > 0.5 && vOccW.y >= uOccY) {
    float fragDist = length(vOccW - uOccCam);
    if (fragDist < uOccFar) {
      float occD = length(gl_FragCoord.xy - uOccCenter);
      float inner = max(0.0, uOccRadius - uOccSoft);
      if (occD <= inner) discard;
      else if (occD < uOccRadius) {
        float occF = 1.0 - smoothstep(inner, uOccRadius, occD);
        vec2 occP = floor(gl_FragCoord.xy);
        float occN = fract(52.9829189 * fract(dot(occP, vec2(0.06711056, 0.00583715))));
        if (occF > occN) discard;
      }
    }
  }`;
  const body = dither ? ditherBody : clip ? `
  if (uOccOn > 0.5 && vOccViewZ < uOccDepth) {
    float occD = length(gl_FragCoord.xy - uOccCenter);
    if (occD <= uOccRadius) discard;
  }` : ghost ? `
  if (uOccOn > 0.5 && vOccViewZ < uOccDepth) {
    float occD = length(gl_FragCoord.xy - uOccCenter);
    float occAmt = 1.0 - smoothstep(uOccRadius - uOccSoft, uOccRadius, occD);
    if (occAmt <= 0.0) discard;
    gl_FragColor.a *= uOccOpacity * occAmt;
  } else {
    discard;
  }` : fade ? `
  if (uOccOn > 0.5 && vOccViewZ < uOccDepth) {
    float occD = length(gl_FragCoord.xy - uOccCenter);
    float occAmt = 1.0 - smoothstep(uOccRadius - uOccSoft, uOccRadius, occD);
    gl_FragColor.a *= mix(1.0, uOccOpacity, occAmt);
  }` : `
  if (uOccOn > 0.5 && vOccViewZ < uOccDepth) {
    float occD = length(gl_FragCoord.xy - uOccCenter);
    float occAmt = 1.0 - smoothstep(uOccRadius - uOccSoft, uOccRadius, occD);
    if (occAmt > 0.0) discard;
  }`;
  shader.fragmentShader = head + shader.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>${body}`);
}

function makeRingEl(color, widthPx) {
  if (typeof document === 'undefined') return null;
  let el = document.getElementById('circulo-aro');
  if (!el) {
    el = document.createElement('div');
    el.id = 'circulo-aro';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  el.style.cssText = [
    'position:fixed', 'pointer-events:none', 'z-index:18', 'box-sizing:border-box',
    `border:${Math.max(1, widthPx)}px solid ${color}`, 'border-radius:50%',
    'display:none', 'margin:0', 'padding:0', 'background:transparent',
  ].join(';');
  return el;
}

/** Instala el círculo. towers se ignora (queda por compatibilidad con entorno2). opts: {enabled, variant, ...CIRCLE_CONFIG}. */
export function installOcclusionFade(root, _towers = new Map(), opts = {}) {
  const cfg = {...CIRCLE_CONFIG, ...circuloParam(), ...opts};
  const variant = cfg.variant === 'b' ? 'b' : cfg.variant === 'a' ? 'a' : 'c';
  const clip = variant === 'b';
  const dither = variant === 'c';
  let enabled = cfg.enabled !== false;
  try { const el = typeof document !== 'undefined' && document.getElementById('circulo-aro'); if (el && !clip) el.style.display = 'none'; } catch {}

  const shared = {
    uOccCenter: {value: new THREE.Vector2(0, 0)},
    uOccRadius: {value: 0},
    uOccSoft: {value: Math.max(0.001, cfg.softness)},
    uOccDepth: {value: 0},
    uOccOn: {value: enabled ? 1 : 0},
    uOccOpacity: {value: cfg.opacity},
    uOccMode: {value: clip ? 1 : dither ? 2 : 0},
    uOccCam: {value: new THREE.Vector3(1e5, 1e5, 1e5)},
    uOccTgt: {value: new THREE.Vector3(...OFFICE_CENTER)},
    uOccR: {value: OFFICE_RADIUS},
    uOccFar: {value: 0},
  };

  const meshes = [], ghosts = [], materials = [], seen = new Set();
  root.traverse((o) => {
    if (!o.isMesh || !o.material || o.userData?.ghost) return;
    const key = o.material.userData?.key;
    if (!key || GROUND_KEYS.includes(key)) return;
    meshes.push(o);
  });

  for (const o of meshes) {
    const m = o.material, key = m.userData.key, transparent = !!m.transparent;
    if (!seen.has(m)) {
      seen.add(m); materials.push(key);
      const yMin = TOWER_KEYS.includes(key) ? Y_TOWER : Y_OTHER;
      m.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, shared, {uOccY: {value: yMin}});
        patchVertex(shader);
        patchFragment(shader, {clip, fade: transparent && !clip && !dither, ghost: false, dither});
      };
      m.customProgramCacheKey = () => 'occ-circulo-' + variant + (transparent ? '-t' : '-o') + (dither ? '-y' + yMin : '');
      m.needsUpdate = true;
    }
    if (clip || dither || transparent) continue;
    const g = m.clone();
    g.transparent = true; g.depthWrite = false; g.userData = {...m.userData, ghost: true};
    g.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, shared);
      patchVertex(shader);
      patchFragment(shader, {ghost: true});
    };
    g.customProgramCacheKey = () => 'occ-circulo-ghost';
    const ghost = o.isInstancedMesh
      ? new THREE.InstancedMesh(o.geometry, g, o.count)
      : new THREE.Mesh(o.geometry, g);
    if (o.isInstancedMesh) {
      ghost.instanceMatrix.copy(o.instanceMatrix);
      ghost.instanceMatrix.needsUpdate = true;
      if (o.instanceColor) { ghost.instanceColor = o.instanceColor.clone(); ghost.instanceColor.needsUpdate = true; }
    }
    ghost.name = 'fantasma-circulo:' + key;
    ghost.userData.ghost = true;
    ghost.castShadow = false;
    ghost.receiveShadow = o.receiveShadow;
    ghost.matrixAutoUpdate = false;
    ghost.matrix.copy(o.matrix);
    ghost.renderOrder = 2;
    ghost.visible = enabled;
    ghost.raycast = () => {};
    o.parent.add(ghost);
    ghosts.push({ghost, src: o});
  }

  const lastCam = [];
  let lastCircle = {cx: 0, cy: 0, radius: 0, near: 0, far: 0, visible: false};
  let drawn = null;
  let frozen = null;
  let exact = null;
  let updates = 0;
  const ring = clip ? makeRingEl(cfg.ringColor, cfg.ringWidth) : null;

  function applyCircle(c, snap) {
    let cx = c.cx, cy = c.cy, radius = c.radius;
    if (!snap && drawn && cfg.smooth > 0 && cfg.smooth < 1) {
      const k = cfg.smooth;
      cx = drawn.cx + (c.cx - drawn.cx) * k;
      cy = drawn.cy + (c.cy - drawn.cy) * k;
      radius = drawn.radius + (c.radius - drawn.radius) * k;
    }
    lastCircle = {cx, cy, radius, near: c.near, far: c.far, visible: c.visible};
    drawn = lastCircle;
    const depth = c.visible
      ? (c.near + (c.far - c.near) * cfg.depthMix) - cfg.depthBias
      : 0;
    shared.uOccCenter.value.set(cx, cy);
    shared.uOccRadius.value = radius;
    shared.uOccDepth.value = Math.max(0, depth);
    if (dither) shared.uOccSoft.value = Math.max(28, radius * (cfg.band || 0.22));
    shared.uOccOn.value = enabled && c.visible ? 1 : 0;
    frozen = snap ? {...lastCircle, depth: shared.uOccDepth.value, far: shared.uOccFar.value} : null;
  }

  function syncRing(c, buf) {
    if (!ring) return;
    if (!enabled || !c.visible || !buf.canvas) { ring.style.display = 'none'; return; }
    const rect = buf.canvas.getBoundingClientRect();
    const pr = buf.pr || 1;
    const cssR = c.radius / pr;
    const cssX = rect.left + c.cx / pr;
    const cssY = rect.top + (buf.h - c.cy) / pr;
    ring.style.display = 'block';
    ring.style.left = (cssX - cssR) + 'px';
    ring.style.top = (cssY - cssR) + 'px';
    ring.style.width = (cssR * 2) + 'px';
    ring.style.height = (cssR * 2) + 'px';
  }

  function syncGhosts() {
    for (const {ghost, src} of ghosts) {
      ghost.matrix.copy(src.matrix);
      ghost.visible = enabled;
      const d = ghost.material, m = src.material;
      d.color.copy(m.color);
      if (m.emissive && d.emissive) d.emissive.copy(m.emissive);
      d.emissiveIntensity = m.emissiveIntensity;
      d.map = m.map; d.emissiveMap = m.emissiveMap; d.envMapIntensity = m.envMapIntensity;
    }
  }

  function update(camera, _now) {
    if (!camera) return;
    camera.updateMatrixWorld?.(true);
    const buf = drawingBuffer();
    const moved = cameraMoved(camera, lastCam, buf.w, buf.h);
    if (moved) {
      updates++;
      exact = projectOfficeCircle(camera, buf.w, buf.h, {margin: cfg.margin, minRadiusPx: cfg.minRadiusPx, boxPad: cfg.boxPad || 0});
      applyCircle(exact, false);
      shared.uOccCam.value.copy(camera.position);
      shared.uOccFar.value = exact.visible ? officeFarDistance(camera.position, OFFICE_BOX, cfg.boxPad || 0) + 2 : 0;
      syncRing(lastCircle, buf);
      if (ghosts.length) syncGhosts();
    } else if (exact && frozen === null) {
      applyCircle(exact, true);
      shared.uOccCam.value.copy(camera.position);
      shared.uOccFar.value = exact.visible ? officeFarDistance(camera.position, OFFICE_BOX, cfg.boxPad || 0) + 2 : 0;
      syncRing(frozen || lastCircle, buf);
      if (ghosts.length) syncGhosts();
    }
    // Cámara quieta y uniformes ya fijos (incluido uOccCam): dos cuadros = los mismos píxeles.
  }

  return {
    materials,
    ghosts: ghosts.length,
    variant,
    config: cfg,
    update,
    state() {
      return {
        variant,
        enabled,
        updates,
        cx: +lastCircle.cx.toFixed(2),
        cy: +lastCircle.cy.toFixed(2),
        radius: +lastCircle.radius.toFixed(2),
        near: +lastCircle.near.toFixed(3),
        far: +lastCircle.far.toFixed(3),
        depth: +shared.uOccDepth.value.toFixed(3),
        far: +shared.uOccFar.value.toFixed(3),
        on: shared.uOccOn.value,
        opacity: cfg.opacity,
        softness: cfg.softness,
        materials: materials.slice(),
        ghosts: ghosts.length,
      };
    },
    setEnabled(v) {
      enabled = !!v;
      shared.uOccOn.value = enabled ? 1 : 0;
      if (ring && !enabled) ring.style.display = 'none';
      lastCam.length = 0; // fuerza recálculo
    },
    uniforms: shared,
  };
}

// --- Compatibilidad con pruebas s19 (funciones puras; el boceto ya no las usa en el shader). ---
export const FADE_OPACITY = CIRCLE_CONFIG.opacity;
export const FADE_MS = 250;
export const THROTTLE_MS = 100;
export const PAD_ON = 0.5, PAD_OFF = 2.5;
export const MAX_TOWERS = 24;
export function officeSamples(box = OFFICE_BOX) {
  const out = [];
  for (const a of [.06, .5, .94]) for (const b of [.06, .5, .94]) for (const c of [.06, .5, .94])
    out.push([box.min[0] + (box.max[0] - box.min[0]) * a, box.min[1] + (box.max[1] - box.min[1]) * b, box.min[2] + (box.max[2] - box.min[2]) * c]);
  return out;
}
const SAMPLES = officeSamples();
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
export function towerOccludes(cam, tower, wasOn = false) {
  return towerBlockCount(cam, tower, wasOn ? PAD_OFF : PAD_ON) > 0;
}
export function stepFade(f, on, dtMs, ms = FADE_MS) {
  const s = Math.max(0, dtMs) / ms;
  return on ? Math.min(1, f + s) : Math.max(0, f - s);
}
