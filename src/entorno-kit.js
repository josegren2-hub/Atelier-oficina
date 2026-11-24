/**
 * Kit (s17) de piezas detalladas para el entorno decorativo.
 * Todo se fusiona por material (un draw call por material) y lo repetido va en InstancedMesh.
 * Mate, sin brillo plástico. Acento #bcd9ec.
 */
import * as THREE from 'three';
import {mergeGeometries, mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const ACCENT = 0xbcd9ec;
export function rng(seed) {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const smooth3 = (x, y, z) => Math.sin(x * 1.7 + z * 0.9) * 0.5 + Math.sin(y * 2.3 + x * 1.1) * 0.3 + Math.sin(z * 2.9 + y * 1.3 + x * 0.4) * 0.2;

/* ---------------- textures (canvas, procedural, deterministic) ---------------- */
function canvasTex(size, draw, {srgb = true, repeat = true} = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size, rng(size * 7 + draw.length));
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4; return t;
}
const TEX = {};
function tex(name) {
  if (TEX[name]) return TEX[name];
  const D = {
    grass: (g, n, r) => { g.fillStyle = '#7c9461'; g.fillRect(0, 0, n, n);
      for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${70 + r() * 40|0},${100 + r() * 40|0},${50 + r() * 30|0},.18)`; g.beginPath(); g.arc(r() * n, r() * n, 8 + r() * 30, 0, 7); g.fill(); }
      for (let i = 0; i < 5200; i++) { const v = r(); g.fillStyle = v < .5 ? `rgba(60,88,44,.55)` : v < .85 ? `rgba(150,170,105,.45)` : 'rgba(120,120,80,.35)'; const x = r() * n, y = r() * n; g.fillRect(x, y, 1, 2 + r() * 3); } },
    asphalt: (g, n, r) => { g.fillStyle = '#50565a'; g.fillRect(0, 0, n, n);
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() < .5 ? '40,44,48' : '98,102,104'},.10)`; g.beginPath(); g.arc(r() * n, r() * n, 10 + r() * 40, 0, 7); g.fill(); }
      for (let i = 0; i < 6000; i++) { g.fillStyle = r() < .5 ? 'rgba(30,33,36,.5)' : 'rgba(140,142,140,.35)'; g.fillRect(r() * n, r() * n, 1, 1); } },
    pavers: (g, n, r) => { g.fillStyle = '#9c9a94'; g.fillRect(0, 0, n, n); const k = n / 4;
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = 176 + (r() * 22 | 0); g.fillStyle = `rgb(${v},${v - 2},${v - 6})`; g.fillRect(x * k + 2, y * k + 2, k - 4, k - 4);
        for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(120,118,110,.25)'; g.fillRect(x * k + r() * k, y * k + r() * k, 1, 1); } } },
    concrete: (g, n, r) => { g.fillStyle = '#c3c1bb'; g.fillRect(0, 0, n, n);
      for (let i = 0; i < 3000; i++) { g.fillStyle = r() < .5 ? 'rgba(120,118,112,.25)' : 'rgba(230,228,222,.3)'; g.fillRect(r() * n, r() * n, 1, 1); }
      g.fillStyle = 'rgba(110,108,102,.6)'; g.fillRect(0, 0, n, 2); g.fillRect(0, 0, 2, n); },
    sand: (g, n, r) => { g.fillStyle = '#d9ccb0'; g.fillRect(0, 0, n, n);
      for (let i = 0; i < 50; i++) { g.fillStyle = `rgba(${r() < .5 ? '196,180,150' : '232,222,200'},.25)`; g.beginPath(); g.ellipse(r() * n, r() * n, 20 + r() * 40, 6 + r() * 10, r() * 3, 0, 7); g.fill(); }
      for (let i = 0; i < 5000; i++) { g.fillStyle = r() < .5 ? 'rgba(160,145,115,.4)' : 'rgba(245,240,228,.4)'; g.fillRect(r() * n, r() * n, 1, 1); } },
    water: (g, n, r) => { const gr = g.createLinearGradient(0, 0, 0, n); gr.addColorStop(0, '#6f97a8'); gr.addColorStop(1, '#7aa3b3'); g.fillStyle = gr; g.fillRect(0, 0, n, n);
      g.lineWidth = 2; for (let i = 0; i < 70; i++) { const y = r() * n, x = r() * n, w = 20 + r() * 60; g.strokeStyle = r() < .6 ? 'rgba(220,236,242,.35)' : 'rgba(60,92,108,.35)'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 3, x + w, y); g.stroke();
        g.beginPath(); g.moveTo(x - n, y); g.quadraticCurveTo(x - n + w / 2, y - 3, x - n + w, y); g.stroke(); } },
    roofTile: (g, n, r) => { g.fillStyle = '#8e5a46'; g.fillRect(0, 0, n, n); const rows = 8, k = n / rows;
      for (let y = 0; y < rows; y++) for (let x = 0; x < 8; x++) { const v = r() * 18 | 0; const gr = g.createLinearGradient(0, y * k, 0, y * k + k); gr.addColorStop(0, `rgb(${150 + v},${94 + v},${74 + v})`); gr.addColorStop(1, `rgb(${110 + v},${66 + v},${52 + v})`); g.fillStyle = gr; g.fillRect(x * k + (y % 2) * k / 2, y * k, k - 2, k - 2); g.fillRect(x * k + (y % 2) * k / 2 - n, y * k, k - 2, k - 2); } },
    slateRoof: (g, n, r) => { g.fillStyle = '#4e5459'; g.fillRect(0, 0, n, n); const rows = 10, k = n / rows;
      for (let y = 0; y < rows; y++) for (let x = 0; x < 10; x++) { const v = r() * 16 | 0; g.fillStyle = `rgb(${82 + v},${88 + v},${94 + v})`; g.fillRect(x * k + (y % 2) * k / 2, y * k, k - 2, k - 2); g.fillRect(x * k + (y % 2) * k / 2 - n, y * k, k - 2, k - 2); } },
    stucco: (g, n, r) => { g.fillStyle = '#eeeeee'; g.fillRect(0, 0, n, n);
      for (let i = 0; i < 4000; i++) { g.fillStyle = r() < .5 ? 'rgba(200,200,200,.35)' : 'rgba(255,255,255,.4)'; g.fillRect(r() * n, r() * n, 2, 2); } },
    block: (g, n, r) => { g.fillStyle = '#b9b3a8'; g.fillRect(0, 0, n, n); const bw = n / 4, bh = n / 8;
      for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) { const v = r() * 16 | 0; g.fillStyle = `rgb(${196 + v},${190 + v},${180 + v})`; g.fillRect(x * bw + (y % 2) * bw / 2 + 1, y * bh + 1, bw - 2, bh - 2); } },
    wood: (g, n, r) => { g.fillStyle = '#9a7a58'; g.fillRect(0, 0, n, n); const k = n / 8;
      for (let i = 0; i < 8; i++) { const v = r() * 20 | 0; g.fillStyle = `rgb(${140 + v},${108 + v},${76 + v})`; g.fillRect(0, i * k + 1, n, k - 2); for (let j = 0; j < 20; j++) { g.fillStyle = 'rgba(90,64,40,.25)'; g.fillRect(r() * n, i * k + r() * k, 20 + r() * 40, 1); } } },
    soil: (g, n, r) => { g.fillStyle = '#5a4a3a'; g.fillRect(0, 0, n, n); for (let i = 0; i < 3000; i++) { g.fillStyle = r() < .5 ? 'rgba(40,30,22,.5)' : 'rgba(120,100,80,.4)'; g.fillRect(r() * n, r() * n, 2, 2); } },
    garage: (g, n) => { g.fillStyle = '#e2e0da'; g.fillRect(0, 0, n, n); for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(120,118,112,.55)'; g.fillRect(0, i * n / 6, n, 3); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, i * n / 6 + 3, n, 2); } },
  };
  TEX[name] = canvasTex(256, D[name]);
  return TEX[name];
}

/* Curtain-wall atlas: 8x8 cells (bay x floor). Day = glass with interiors insinuated; night emissive = lit offices. */
let FACADE = null;
export function facadeTextures() {
  if (FACADE) return FACADE;
  const n = 512, k = n / 8, r = rng(91);
  const day = document.createElement('canvas'); day.width = day.height = n; const d = day.getContext('2d');
  const night = document.createElement('canvas'); night.width = night.height = n; const e = night.getContext('2d');
  e.fillStyle = '#000'; e.fillRect(0, 0, n, n);
  for (let cy = 0; cy < 8; cy++) for (let cx = 0; cx < 8; cx++) {
    const x = cx * k, y = cy * k; const lit = r() < 0.55, blinds = r(), tone = r() * 14 | 0;
    const gr = d.createLinearGradient(0, y, 0, y + k); gr.addColorStop(0, `rgb(${150 + tone},${172 + tone},${186 + tone})`); gr.addColorStop(.55, `rgb(${104 + tone},${124 + tone},${138 + tone})`); gr.addColorStop(1, `rgb(${84 + tone},${100 + tone},${112 + tone})`);
    d.fillStyle = gr; d.fillRect(x, y, k, k);
    // ceiling with light strips
    d.fillStyle = 'rgba(214,222,226,.55)'; d.fillRect(x, y + 3, k, 5); d.fillStyle = 'rgba(255,255,250,.6)'; d.fillRect(x + 8, y + 4, k - 16, 2);
    // interior silhouettes (desks, partitions, plants)
    d.fillStyle = 'rgba(48,56,62,.42)'; d.fillRect(x + 6 + r() * 10, y + k * .62, k * .45, k * .1); d.fillRect(x + k * .7, y + k * .42, 3, k * .34);
    if (r() < .4) { d.fillStyle = 'rgba(60,82,58,.5)'; d.beginPath(); d.arc(x + k * .2 + r() * k * .5, y + k * .6, 5, 0, 7); d.fill(); }
    // sky reflection streak
    d.fillStyle = 'rgba(235,244,250,.18)'; d.beginPath(); d.moveTo(x + k * .1, y + k); d.lineTo(x + k * .45, y); d.lineTo(x + k * .62, y); d.lineTo(x + k * .27, y + k); d.fill();
    if (blinds < 0.14) { const bh = k * (0.3 + r() * 0.5); d.fillStyle = 'rgba(214,212,204,.82)'; d.fillRect(x, y + 8, k, bh); d.fillStyle = 'rgba(160,158,150,.5)'; for (let j = y + 10; j < y + 8 + bh; j += 4) d.fillRect(x, j, k, 1); }
    const rowLit = ((cy * 7 + 3) % 5) < 3, runLit = Math.sin(cx * 1.3 + cy * 2.1) > -.35;
    if (rowLit && runLit && lit !== null) { const w = cy % 2 ? '255,214,160' : '238,226,206';
      e.fillStyle = `rgba(${w},.62)`; e.fillRect(x, y + 6, k, k - 10); e.fillStyle = `rgba(255,246,228,1)`; e.fillRect(x + 6, y + 4, k - 12, 3);
      e.fillStyle = 'rgba(0,0,0,.75)'; e.fillRect(x + 6 + r() * 10, y + k * .62, k * .45, k * .14); e.fillRect(x + k * .7, y + k * .42, 4, k * .4);
      if (blinds < 0.14) { e.fillStyle = 'rgba(0,0,0,.45)'; e.fillRect(x, y + 8, k, k * .4); } }
  }
  const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
  FACADE = {day: mk(day), night: mk(night)};
  return FACADE;
}

/* ---------------- materials ---------------- */
const SPEC = {
  asphalt: {color: 0xffffff, tex: 'asphalt', tile: 9, rough: .96},
  pavers: {color: 0xffffff, tex: 'pavers', tile: 2.4, rough: .9},
  concrete: {color: 0xffffff, tex: 'concrete', tile: 3, rough: .92},
  curb: {color: 0xcfccc4, rough: .9},
  grass: {color: 0xffffff, tex: 'grass', tile: 7, rough: 1},
  sand: {color: 0xffffff, tex: 'sand', tile: 9, rough: 1},
  water: {color: 0xffffff, tex: 'water', tile: 22, rough: .34, metal: .05},
  soil: {color: 0xffffff, tex: 'soil', tile: 2, rough: 1},
  paint: {color: 0xf1efe8, rough: .8},
  bark: {color: 0x5e4a36, rough: .95},
  leaf: {color: 0xffffff, rough: .92},
  palmLeaf: {color: 0xffffff, rough: .9, side: THREE.DoubleSide},
  palmTrunk: {color: 0x8b7a62, rough: .95},
  wood: {color: 0xffffff, tex: 'wood', tile: 1.2, rough: .85},
  iron: {color: 0x2c3036, rough: .62, metal: .3},
  metal: {color: 0x7d838a, rough: .55, metal: .35},
  darkMetal: {color: 0x3a4047, rough: .6, metal: .3},
  lens: {color: 0xfff3dc, emissive: 0xffe7c2, ei: .25, eiNight: 2.2, rough: .5},
  signalRed: {color: 0x5a2a28, emissive: 0xb7473c, ei: .25, eiNight: .9},
  signalAmber: {color: 0x5a4c30, emissive: 0x8a6d3a, ei: .05, eiNight: .2},
  signalGreen: {color: 0x2e5a4a, emissive: 0x6fd1a6, ei: .9, eiNight: 1.6},
  stucco: {color: 0xffffff, tex: 'stucco', tile: 4, rough: .95},
  trim: {color: 0xe7e4dc, rough: .85},
  frame: {color: 0x33373c, rough: .6, metal: .2},
  winGlass: {color: 0x5d6f7a, emissive: 0xffd7a3, ei: 0, eiNight: .95, rough: .3},
  winOff: {color: 0x56656f, rough: .3},
  door: {color: 0x7a5a40, tex: 'wood', tile: 1, rough: .8},
  garage: {color: 0xffffff, tex: 'garage', tile: 0, rough: .8},
  roofTile: {color: 0xffffff, tex: 'roofTile', tile: 2.2, rough: .9},
  slate: {color: 0xffffff, tex: 'slateRoof', tile: 2, rough: .9},
  roofFlat: {color: 0x9c9a95, rough: .95},
  block: {color: 0xffffff, tex: 'block', tile: 1.6, rough: .95},
  tinaco: {color: 0x2a2d31, rough: .8},
  stone: {color: 0xb7b2a8, rough: .9},
  towerGlass: {color: 0xffffff, facade: true, rough: .32, metal: .05, eiNight: .85},
  lobbyGlass: {color: 0x8fa2ae, emissive: 0xffe2bd, ei: .05, eiNight: .9, rough: .25},
  mullion: {color: 0x5f666d, rough: .5, metal: .4},
  mullionDark: {color: 0x23272c, rough: .55, metal: .3},
  slab: {color: 0xd3d0c9, rough: .85},
  slabDark: {color: 0x30343a, rough: .7},
  crown: {color: 0x262a30, rough: .7},
  accent: {color: ACCENT, emissive: ACCENT, ei: .08, eiNight: .9, rough: .6},
  neon: {color: ACCENT, emissive: ACCENT, ei: .55, eiNight: 2.0, rough: .5},
  signPanel: {color: 0x1d232b, rough: .8},
  lane: {color: 0xe9e7df, rough: .9},
  laneAmber: {color: 0xcab98a, rough: .9},
  car: {color: 0xffffff, rough: .35, metal: .45},
  carGlass: {color: 0x1d2a33, rough: .25},
  tire: {color: 0x1d1f22, rough: .9},
  hub: {color: 0xa7adb3, rough: .45, metal: .6},
  headlight: {color: 0xf4efe2, emissive: 0xffeacc, ei: .1, eiNight: 1.4},
  taillight: {color: 0x7a2c2c, emissive: 0xc04a40, ei: .1, eiNight: .9},
  flowers: {color: 0xffffff, rough: .9},
  fabric: {color: 0xffffff, rough: .95, side: THREE.DoubleSide},
  foam: {color: 0xf1f3f2, rough: .9, transparent: true, opacity: .75},
  jet: {color: 0xe8f2f6, rough: .2, transparent: true, opacity: .55, emissive: 0xbcd9ec, ei: .05, eiNight: .5},
  pool: {color: 0x7fb1c2, rough: .3, emissive: 0x2c6a80, ei: 0, eiNight: .35},
};
export function makeMaterials() {
  const cache = new Map();
  const nightables = [];
  const get = (key) => {
    if (cache.has(key)) return cache.get(key);
    const s = SPEC[key]; if (!s) throw new Error('mat ' + key);
    const p = {color: s.color, roughness: s.rough ?? .9, metalness: s.metal ?? 0, vertexColors: true};
    if (s.tex) p.map = tex(s.tex);
    if (s.facade) { const f = facadeTextures(); p.map = f.day; p.emissiveMap = f.night; p.emissive = new THREE.Color(0xffffff); p.emissiveIntensity = 0; }
    if (s.emissive !== undefined) { p.emissive = new THREE.Color(s.emissive); p.emissiveIntensity = s.ei ?? 0; }
    if (s.side) p.side = s.side;
    if (s.transparent) { p.transparent = true; p.opacity = s.opacity; p.depthWrite = false; }
    const m = new THREE.MeshStandardMaterial(p); m.userData.key = key;
    if (s.eiNight !== undefined) nightables.push([m, s.ei ?? 0, s.eiNight]);
    cache.set(key, m); return m;
  };
  return {get, setNight(v) { for (const [m, d, n] of nightables) m.emissiveIntensity = v ? n : d; }, tileOf: (k) => SPEC[k]?.tile ?? 0, count: () => cache.size};
}

/* ---------------- geometry builder ---------------- */
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function mtx(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}
function prep(geo) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  const n = g.attributes.position.count;
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  const col = new Float32Array(n * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  // s19: building id (0 = not a building) so the occlusion fade can work per tower on the merged world mesh.
  g.setAttribute('aTower', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.morphAttributes = {}; g.groups = [];
  return g;
}
/** Ground pieces placed by a building builder (e.g. the entrance pavers) are not part of the building. */
const NO_TOWER_TAG = new Set(['pavers', 'asphalt', 'lane', 'grass', 'curb', 'sand', 'water', 'foam', 'soil', 'pool', 'jet', 'concrete']);
export class Proto {
  constructor(mats) { this.mats = mats; this.parts = new Map(); this.tower = 0; this.towers = new Map(); }
  /** s19: everything added between beginTower()/endTower() belongs to one building (id ≥ 1); its world box is kept for the CPU occlusion test. */
  beginTower() { this.tower = this.towers.size + 1; this.towers.set(this.tower, new THREE.Box3()); return this.tower; }
  endTower() { this.tower = 0; }
  add(key, geo, m, color, {worldUV = true, colorFn = null} = {}) {
    const g = prep(geo); if (m) g.applyMatrix4(m);
    if (this.tower && !NO_TOWER_TAG.has(key)) { g.attributes.aTower.array.fill(this.tower); g.computeBoundingBox(); this.towers.get(this.tower).union(g.boundingBox); }
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv, col = g.attributes.color;
    const tile = this.mats.tileOf(key);
    if (tile && worldUV) for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ny = Math.abs(nor.getY(i)), nx = Math.abs(nor.getX(i));
      if (ny > .6) uv.setXY(i, x / tile, z / tile); else if (nx > .6) uv.setXY(i, z / tile, y / tile); else uv.setXY(i, x / tile, y / tile);
    }
    if (color !== undefined && color !== null) { const c = new THREE.Color(color); for (let i = 0; i < col.count; i++) col.setXYZ(i, c.r, c.g, c.b); }
    if (colorFn) { const c = new THREE.Color(); for (let i = 0; i < col.count; i++) { colorFn(c, pos.getX(i), pos.getY(i), pos.getZ(i), i); col.setXYZ(i, c.r, c.g, c.b); } }
    if (!this.parts.has(key)) this.parts.set(key, []);
    this.parts.get(key).push(g); return g;
  }
  box(key, x, y, z, w, h, d, o = {}) { return this.add(key, UNIT_BOX, mtx(x, y, z, o.rx, o.ry, o.rz, w, h, d), o.color, o); }
  /** box sitting on y (bottom at y) */
  slab(key, x0, z0, x1, z1, yTop, th = .2, o = {}) { return this.box(key, (x0 + x1) / 2, yTop - th / 2, (z0 + z1) / 2, Math.abs(x1 - x0), th, Math.abs(z1 - z0), o); }
  cyl(key, x, y, z, rt, rb, h, seg = 10, o = {}) { const g = new THREE.CylinderGeometry(rt, rb, h, seg, o.hseg || 1, !!o.open); return this.add(key, g, mtx(x, y, z, o.rx, o.ry, o.rz, o.sx || 1, 1, o.sz || 1), o.color, o); }
  /** cylinder between two points */
  rod(key, a, b, r0, r1 = r0, seg = 6, o = {}) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), dlt = B.clone().sub(A), len = dlt.length();
    const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, false);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dlt.normalize());
    const m = new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), q, new THREE.Vector3(1, 1, 1));
    return this.add(key, g, m, o.color, o);
  }
  merge(other, m) { for (const [k, list] of other.parts) for (const g of list) { const c = g.clone(); if (m) c.applyMatrix4(m); if (!this.parts.has(k)) this.parts.set(k, []); this.parts.get(k).push(c); } return this; }
  build() { const out = new Map(); for (const [k, list] of this.parts) { out.set(k, list.length === 1 ? list[0] : mergeGeometries(list, false)); } return out; }
  tris() { let t = 0; for (const list of this.parts.values()) for (const g of list) t += g.attributes.position.count / 3; return Math.round(t); }
}

/** Instance a proto: one InstancedMesh per material. items: {x,y,z,ry,s|sx,sy,sz,tint:{key:color}} */
export function place(root, proto, items, {cast = true, receive = true, name = ''} = {}) {
  if (!items.length) return [];
  const built = proto.build(); const meshes = [];
  for (const [key, geo] of built) {
    const mat = proto.mats.get(key);
    let mesh;
    if (items.length === 1 && !items[0].tint) {
      mesh = new THREE.Mesh(geo, mat); const it = items[0];
      mesh.applyMatrix4(mtx(it.x || 0, it.y || 0, it.z || 0, 0, it.ry || 0, 0, it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.s ?? 1));
    } else {
      mesh = new THREE.InstancedMesh(geo, mat, items.length);
      const anyTint = items.some((it) => it.tint && it.tint[key] !== undefined);
      const c = new THREE.Color();
      items.forEach((it, i) => {
        mesh.setMatrixAt(i, mtx(it.x || 0, it.y || 0, it.z || 0, it.rx || 0, it.ry || 0, 0, it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.s ?? 1));
        if (anyTint) { c.set(it.tint?.[key] ?? 0xffffff); mesh.setColorAt(i, c); }
      });
      mesh.computeBoundingSphere();
    }
    const castable = typeof cast === 'function' ? cast(key) : cast;
    mesh.castShadow = castable && !['water', 'asphalt', 'grass', 'sand', 'pavers', 'lane', 'foam'].includes(key);
    mesh.receiveShadow = receive; mesh.name = `${name}:${key}`; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    root.add(mesh); meshes.push(mesh);
  }
  return meshes;
}

/* ---------------- pieces ---------------- */
function blob(r, detail, seed, amp = .2) {
  let g = new THREE.IcosahedronGeometry(r, detail); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g, 1e-4); const p = g.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + amp * smooth3(v.x * 1.3 + seed, v.y * 1.3 - seed, v.z * 1.3 + seed * .7); v.multiplyScalar(k); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
const leafShade = (base, seed) => { const r = rng(seed); return (c, x, y, z) => { const t = THREE.MathUtils.clamp((y - 2.8) / 3.4, 0, 1); c.set(base); c.offsetHSL((r() - .5) * .03, (r() - .5) * .08, -0.09 + t * .12 + (r() - .5) * .05); }; };

/** Deciduous tree, ~6.5 u tall, irregular multi-layer crown, trunk + limbs. lod 0 detailed, 1 far. */
export function treeProto(mats, {seed = 1, lod = 0, base = 0x5f7c46, height = 1} = {}) {
  const P = new Proto(mats), r = rng(seed * 31 + 7);
  const lean = (r() - .5) * .12;
  P.cyl('bark', lean * 1.2, 1.35, 0, .13, .2, 2.7, lod ? 5 : 7, {rz: -lean});
  if (!lod) {
    // root flare
    P.cyl('bark', 0, .12, 0, .2, .32, .25, 7);
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + r(), L = .9 + r() * .7; P.rod('bark', [lean * 2.4, 2.4 + r() * .4, 0], [Math.cos(a) * L, 3.4 + r() * .9, Math.sin(a) * L], .09, .035, 5); }
  }
  const blobs = lod === 1 ? 3 : 7, spheres = [];
  for (let i = 0; i < blobs; i++) {
    const a = i * 2.39 + r() * .6, rr = i === 0 ? 0 : .7 + r() * .55;
    const cy = (i === 0 ? 4.35 : 3.6 + r() * 1.5) * height, rad = (i === 0 ? 1.45 : .85 + r() * .5) * (lod === 1 ? 1.15 : 1);
    const sy = .82 + r() * .2; spheres.push([Math.cos(a) * rr, cy, Math.sin(a) * rr, rad, sy]);
    const g = blob(rad, lod === 1 || i > 0 ? 1 : 2, seed + i * 3.1, .2);
    P.add('leaf', g, mtx(Math.cos(a) * rr, cy, Math.sin(a) * rr, 0, r() * 6, 0, 1, sy, 1), null, {colorFn: leafShade(base, seed * 13 + i)});
  }
  if (lod === 0) { // leaf clusters on the crown surface (like the plaza trees' leaf cards): breaks the silhouette
    const tuft = new THREE.OctahedronGeometry(.24, 0);
    for (let i = 0; i < 150; i++) { const [cx, cy, cz, rad, sy] = spheres[i % spheres.length]; const u = r() * 6.283, v = Math.acos(2 * r() - 1) * .8;
      const px = cx + Math.sin(v) * Math.cos(u) * rad * 1.02, py = cy + Math.cos(v) * rad * sy * 1.02 - .1, pz = cz + Math.sin(v) * Math.sin(u) * rad * 1.02;
      P.add('leaf', tuft, mtx(px, py, pz, r() * 3, r() * 3, r() * 3, 1.3, .6, 1), null, {colorFn: leafShade(base, seed * 7 + i)}); }
  }
  return P;
}
/** Columnar conifer (ciprés). */
export function cypressProto(mats, {seed = 3, lod = 0} = {}) {
  const P = new Proto(mats); P.cyl('bark', 0, .6, 0, .1, .15, 1.2, 6);
  for (let i = 0; i < (lod ? 2 : 4); i++) { const g = blob(.9 - i * .14, lod ? 1 : 2, seed + i, .16); P.add('leaf', g, mtx(0, 1.7 + i * 1.25, 0, 0, i, 0, 1, 1.5, 1), null, {colorFn: leafShade(0x4b6a40, seed + i * 5)}); }
  return P;
}
export function shrubProto(mats, {seed = 5, base = 0x61804a, size = 1} = {}) {
  const P = new Proto(mats), r = rng(seed);
  for (let i = 0; i < 4; i++) { const a = i * 1.9, rr = i ? .45 : 0; const g = blob((.55 + r() * .25) * size, 1, seed + i, .2); P.add('leaf', g, mtx(Math.cos(a) * rr * size, (.45 + r() * .2) * size, Math.sin(a) * rr * size, 0, r() * 3, 0, 1, .8, 1), null, {colorFn: (c, x, y) => { c.set(base); c.offsetHSL(0, 0, -0.08 + y * .07 + (r() - .5) * .04); }}); }
  return P;
}
/** Hedge with organic top: segmented box with displaced vertices. */
export function hedge(P, x0, z0, x1, z1, h = 1.1, yBase = -0.3, seed = 2) {
  const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0);
  let g = new THREE.BoxGeometry(w, h, d, Math.max(2, w / .6 | 0), 3, Math.max(2, d / .6 | 0)); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g, 1e-4); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = .09 * smooth3(x * 2 + seed, y * 3, z * 2 - seed); p.setXYZ(i, x + Math.sign(x) * k * (Math.abs(x) > w / 2 - .01), y + (y > 0 ? k * 1.4 : 0), z + Math.sign(z) * k * (Math.abs(z) > d / 2 - .01)); }
  g.computeVertexNormals();
  P.add('leaf', g, mtx((x0 + x1) / 2, yBase + h / 2, (z0 + z1) / 2), null, {colorFn: (c, x, y) => { c.set(0x587a44); c.offsetHSL(0, 0, -0.06 + (y - yBase) * .06 + .02 * Math.sin(x * 3 + z0)); }});
}
/** Palm: curved ringed trunk, drooping V-folded fronds, coconuts. */
export function palmProto(mats, {seed = 1, height = 7.5, lod = 0} = {}) {
  const P = new Proto(mats), r = rng(seed * 17 + 3); const segs = lod ? 5 : 10, bend = .9 + r() * .9, dir = r() * 6.28;
  const pt = (t) => [Math.cos(dir) * bend * t * t, t * height, Math.sin(dir) * bend * t * t];
  for (let i = 0; i < segs; i++) { const a = pt(i / segs), b = pt((i + 1) / segs); const r0 = .3 - .12 * i / segs, r1 = .3 - .12 * (i + 1) / segs; P.rod('palmTrunk', a, b, r0 + .03, r1, 7, {colorFn: (c, x, y) => { c.set(0x8b7a62); c.offsetHSL(0, 0, ((y * 2.2) % 1 < .35 ? -.06 : .02)); }}); }
  const top = new THREE.Vector3(...pt(1));
  P.add('palmTrunk', new THREE.SphereGeometry(.34, 8, 6), mtx(top.x, top.y + .05, top.z), 0x6f5f48);
  const fronds = lod ? 7 : 11;
  for (let f = 0; f < fronds; f++) {
    const az = f * (6.283 / fronds) + r() * .3, len = 3.2 + r() * 1.1, droop = .9 + r() * .7, up = .35 + r() * .35;
    const S = lod ? 5 : 9; const pos = [], idx = [];
    for (let i = 0; i <= S; i++) { const t = i / S; const rad = t * len; const y = up * t * 2 - droop * t * t * 1.6; const w = Math.sin(Math.PI * Math.min(1, t * 1.15)) * .55 + .05;
      const cx = Math.cos(az) * rad, cz = Math.sin(az) * rad, px = -Math.sin(az) * w, pz = Math.cos(az) * w;
      pos.push(cx + px, y - w * .35, cz + pz, cx, y, cz, cx - px, y - w * .35, cz - pz); }
    for (let i = 0; i < S; i++) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    P.add('palmLeaf', g, mtx(top.x, top.y + .1, top.z), null, {colorFn: (c, x, y, z) => { const d = Math.hypot(x - top.x, z - top.z); c.set(0x5e7d3e); c.offsetHSL(-.01 + f * .002, 0, -.08 + d * .025 + (f % 3) * .02); }});
  }
  if (!lod) for (let i = 0; i < 4; i++) { const a = i * 1.6; P.add('palmTrunk', new THREE.SphereGeometry(.17, 7, 5), mtx(top.x + Math.cos(a) * .3, top.y - .25, top.z + Math.sin(a) * .3), 0x5d4a30); }
  return P;
}
/** Park bench: cast-iron side frames, 4 seat slats + 3 back slats. Facing +z. */
export function benchProto(mats) {
  const P = new Proto(mats);
  for (const x of [-.85, .85]) {
    P.box('iron', x, .25, .18, .07, .5, .07); P.box('iron', x, .25, -.2, .07, .5, .07);
    P.box('iron', x, .49, 0, .07, .06, .55); P.box('iron', x, .72, .05, .07, .05, .5); P.box('iron', x, .6, .3, .06, .25, .05);
    P.box('iron', x, .8, -.28, .07, .65, .06, {rx: -.18});
  }
  for (let i = 0; i < 4; i++) P.box('wood', 0, .54, -.18 + i * .13, 1.95, .05, .1, {worldUV: false});
  for (let i = 0; i < 3; i++) P.box('wood', 0, .72 + i * .16, -.3 - i * .03, 1.95, .1, .04, {rx: -.18, worldUV: false});
  return P;
}
/** Street lamp ~6.2 tall with curved arm and lantern head. Arm points +x. */
export function lampProto(mats, {double = false} = {}) {
  const P = new Proto(mats);
  P.cyl('darkMetal', 0, .25, 0, .2, .26, .5, 10); P.cyl('darkMetal', 0, .55, 0, .14, .2, .12, 10);
  P.cyl('darkMetal', 0, 3.2, 0, .07, .12, 5.4, 8); P.cyl('darkMetal', 0, 1.3, 0, .13, .13, .06, 8);
  const arms = double ? [1, -1] : [1];
  for (const s of arms) {
    const arc = new THREE.TorusGeometry(.7, .045, 5, 10, Math.PI / 2);
    P.add('darkMetal', arc, mtx(s * .7, 5.9, 0, 0, s > 0 ? Math.PI : 0, 0));
    P.rod('darkMetal', [s * .7, 6.6, 0], [s * 1.25, 6.6, 0], .045, .045, 5);
    P.box('darkMetal', s * 1.6, 6.62, 0, .95, .14, .42); P.box('darkMetal', s * 1.6, 6.72, 0, .7, .08, .3);
    P.box('lens', s * 1.6, 6.52, 0, .8, .06, .34);
  }
  return P;
}
/** Traffic light with mast arm over the road (+x), 3-lens head, visors, pedestrian head. */
export function trafficProto(mats, {arm = 5} = {}) {
  const P = new Proto(mats);
  P.cyl('darkMetal', 0, .3, 0, .22, .28, .6, 10); P.cyl('darkMetal', 0, 3.4, 0, .12, .16, 6.8, 10);
  P.rod('darkMetal', [0, 6.2, 0], [arm, 6.35, 0], .09, .06, 6); P.rod('darkMetal', [0, 5.2, 0], [arm * .45, 6.25, 0], .04, .04, 5);
  const head = (x, y, z, ry) => {
    P.box('darkMetal', x, y, z, .48, 1.35, .38, {ry}); P.box('iron', x, y, z - .02, .7, 1.6, .05, {ry});
    [['signalRed', .42], ['signalAmber', 0], ['signalGreen', -.42]].forEach(([k, dy]) => {
      P.cyl(k, x + Math.sin(ry) * .2, y + dy, z + Math.cos(ry) * .2, .15, .15, .04, 12, {rx: Math.PI / 2, ry});
      P.cyl('iron', x + Math.sin(ry) * .28, y + dy + .08, z + Math.cos(ry) * .28, .18, .18, .18, 8, {rx: Math.PI / 2, ry, open: true});
    });
  };
  head(arm - .3, 5.6, 0, 0); head(arm * .55, 5.6, 0, 0); head(.25, 3.4, .15, 0);
  P.box('darkMetal', 0, 2.6, -.2, .34, .45, .26); P.box('lane', 0, 2.62, -.335, .22, .28, .01);
  P.box('darkMetal', 0, 1.2, .16, .12, .2, .1);
  return P;
}
export function bollardProto(mats) { const P = new Proto(mats); P.cyl('darkMetal', 0, .45, 0, .09, .11, .9, 10); P.cyl('lens', 0, .86, 0, .1, .1, .06, 10); return P; }
export function binProto(mats) { const P = new Proto(mats); P.cyl('darkMetal', 0, .5, 0, .3, .26, 1, 12, {open: false}); P.cyl('iron', 0, 1.03, 0, .33, .33, .07, 12); return P; }
/** Car: same profile as the office cars, merged; paint tinted per instance. Facing +x. */
export function carProto(mats) {
  const P = new Proto(mats);
  const s = new THREE.Shape(); s.moveTo(-1.75, .22); s.lineTo(-1.73, .48); s.quadraticCurveTo(-1.5, .65, -1.05, .65); s.lineTo(-.65, .99); s.quadraticCurveTo(.1, 1.13, .65, 1.02); s.lineTo(1.15, .66); s.quadraticCurveTo(1.65, .65, 1.75, .44); s.lineTo(1.7, .22); s.closePath();
  const body = new THREE.ExtrudeGeometry(s, {depth: 1.64, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .05, bevelThickness: .05, curveSegments: 5}); body.translate(0, 0, -.82);
  P.add('car', body, null, null, {worldUV: false});
  P.box('carGlass', -.05, .82, 0, 1.15, .3, 1.62); P.box('carGlass', .85, .82, 0, .35, .28, 1.5, {rz: .75}); P.box('carGlass', -.98, .8, 0, .32, .26, 1.5, {rz: -.75});
  for (const x of [-1.12, 1.12]) for (const z of [-.86, .86]) { P.cyl('tire', x, .27, z, .28, .28, .2, 12, {rx: Math.PI / 2}); P.cyl('hub', x, .27, z * 1.06, .15, .15, .04, 10, {rx: Math.PI / 2}); }
  for (const z of [-.55, .55]) { P.box('headlight', 1.74, .46, z, .04, .1, .3); P.box('taillight', -1.76, .5, z, .04, .1, .3); }
  return P;
}
/** Bus shelter: glass panels, slim frame, roof, bench. Faces +z. */
export function shelterProto(mats) {
  const P = new Proto(mats);
  for (const x of [-2, 2]) P.box('darkMetal', x, 1.35, -.6, .1, 2.7, .1);
  P.box('darkMetal', 0, 2.75, -.2, 4.4, .12, 1.6); P.box('accent', 0, 2.75, .6, 4.4, .12, .04);
  P.box('lobbyGlass', 0, 1.45, -.65, 3.9, 2.2, .04); P.box('lobbyGlass', -2, 1.45, -.15, .04, 2.2, .9);
  P.box('signPanel', 2.05, 1.5, -.15, .08, 1.9, .9); P.box('lens', 2.1, 1.5, -.15, .02, 1.7, .75);
  P.box('metal', 0, .5, -.35, 2.6, .06, .35); P.box('darkMetal', -1, .25, -.35, .06, .5, .3); P.box('darkMetal', 1, .25, -.35, .06, .5, .3);
  return P;
}

/** Night-only light pool under lamps (additive decal). */
export function lightPoolMesh(items, y) {
  if (!items.length) return null;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,226,180,1)'); gr.addColorStop(.45, 'rgba(255,214,160,.45)'); gr.addColorStop(1, 'rgba(255,214,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({map: t, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, toneMapped: true});
  const geo = new THREE.PlaneGeometry(9, 9); geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geo, m, items.length);
  items.forEach((it, i) => { const ox = Math.cos(it.ry || 0) * (it.off ?? 1.6), oz = -Math.sin(it.ry || 0) * (it.off ?? 1.6); mesh.setMatrixAt(i, mtx(it.x + ox, (it.y ?? y) + .05, it.z + oz)); });
  mesh.renderOrder = 2; mesh.name = 'luz-farolas'; mesh.visible = false; mesh.userData.night = m;
  return mesh;
}

/* ---------------- streets ---------------- */
export const Y = {road: -0.5, walk: -0.3, grass: -0.33, ground: -0.55};
/** Sidewalk with curb along its outer edge(s). curbs: list of 'n','s','e','w' edges facing the road. */
export function sidewalk(P, x0, z0, x1, z1, curbs = '') {
  P.slab('pavers', x0, z0, x1, z1, Y.walk, .25);
  const c = .25;
  if (curbs.includes('n')) P.slab('curb', x0, z0, x1, z0 + c, Y.walk + .005, .28);
  if (curbs.includes('s')) P.slab('curb', x0, z1 - c, x1, z1, Y.walk + .005, .28);
  if (curbs.includes('w')) P.slab('curb', x0, z0, x0 + c, z1, Y.walk + .005, .28);
  if (curbs.includes('e')) P.slab('curb', x1 - c, z0, x1, z1, Y.walk + .005, .28);
}
export function road(P, x0, z0, x1, z1, {axis = 'x', center = true, edge = true} = {}) {
  P.slab('asphalt', x0, z0, x1, z1, Y.road, .15);
  const yl = Y.road + .012;
  if (axis === 'x') { const zc = (z0 + z1) / 2; if (center) for (let x = x0 + 1; x < x1 - 2; x += 4.5) P.box('lane', x + 1.2, yl, zc, 2.4, .02, .16);
    if (edge) { P.box('lane', (x0 + x1) / 2, yl, z0 + .55, x1 - x0, .02, .1); P.box('lane', (x0 + x1) / 2, yl, z1 - .55, x1 - x0, .02, .1); } }
  else { const xc = (x0 + x1) / 2; if (center) for (let z = z0 + 1; z < z1 - 2; z += 4.5) P.box('lane', xc, yl, z + 1.2, .16, .02, 2.4);
    if (edge) { P.box('lane', x0 + .55, yl, (z0 + z1) / 2, .1, .02, z1 - z0); P.box('lane', x1 - .55, yl, (z0 + z1) / 2, .1, .02, z1 - z0); } }
}
/** Zebra crossing. axis = direction pedestrians walk ('x' or 'z'). */
export function zebra(P, cx, cz, len, width = 3.2, axis = 'z') {
  const n = Math.floor(len / 1.1); for (let i = 0; i < n; i++) { const o = -len / 2 + .55 + i * 1.1;
    if (axis === 'z') P.box('lane', cx + o, Y.road + .014, cz, .6, .02, width); else P.box('lane', cx, Y.road + .014, cz + o, width, .02, .6); }
}
export function manhole(P, x, z) { P.cyl('darkMetal', x, Y.road + .01, z, .45, .45, .03, 14); }
/** tree grate in sidewalk */
export function treePit(P, x, z) { P.box('darkMetal', x, Y.walk + .008, z, 1.5, .02, 1.5); P.box('soil', x, Y.walk + .012, z, 1.05, .02, 1.05); }

/* ---------------- ground ---------------- */
export function groundDisc(P, key = 'grass', radius = 320, y = Y.ground, tint = 0xffffff, seed = 1, sea = false) {
  const g = new THREE.PlaneGeometry(radius * 2, radius * 2, sea ? 96 : 48, sea ? 96 : 48); g.rotateX(-Math.PI / 2);
  P.add(key, g, mtx(0, y, 0), null, {colorFn: (c, x, yy, z) => { c.set(tint); const n = smooth3(x * .045 + seed, 0, z * .045) * .06 + smooth3(x * .011, 1, z * .013) * .05; c.offsetHSL(0, 0, n);
    if (sea) { const d = Math.max(0, -35 - z); c.offsetHSL(.01 * Math.min(1, d / 60), .04 * Math.min(1, d / 60), .07 - Math.min(1, d / 50) * .11 + .05 * Math.max(0, Math.sin(x * .19 + z * .07) * Math.sin(z * .23 - x * .05))); } }});
}
export function lawn(P, x0, z0, x1, z1, y = Y.grass, seed = 1) {
  const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0);
  const g = new THREE.BoxGeometry(w, .2, d, Math.max(1, w / 4 | 0), 1, Math.max(1, d / 4 | 0));
  P.add('grass', g, mtx((x0 + x1) / 2, y - .1, (z0 + z1) / 2), null, {colorFn: (c, x, yy, z) => { c.set(0xffffff); c.offsetHSL(0, 0, smooth3(x * .09 + seed, 0, z * .09) * .07); }});
}
