/**
 * Entorno decorativo del edificio (s17). En la app se usa la variante «fusion»: distrito de negocios
 * con costa San Junipero (sin letrero, t429u). Es la única variante que se publica.
 * Mismo nivel de detalle que el edificio:
 * calles con guarnición, pasos de cebra, farolas y semáforos modelados, árboles de copa irregular,
 * torres con muro cortina, casas con techos/ventanas/bardas, parque con fuente y kiosco, malecón con barandal.
 */
import * as THREE from 'three';
import * as K from './entorno-kit.js';
import {installOcclusionFade} from './entorno-occlusion.js';
const {Proto, place, rng, mtx, Y} = K;
export const ENTORNO_KINDS = Object.freeze(['fusion']);

const XR = [[-75, -66], [-31, -22], [22, 31], [66, 75]]; // road bands across x (roads running along z)
const ZR = [[-72, -63], [-27, -18], [22, 31], [66, 75]]; // road bands across z (roads running along x)
const XC = [[-200, -75], [-66, -31], [-22, 22], [31, 66], [75, 200]];
const ZC = [[-200, -72], [-63, -27], [-18, 22], [31, 66], [75, 200]];
const SW = 3; // sidewalk width

export function countMeshes(root) {
  let meshes = 0, instancedMeshes = 0, instances = 0, triangles = 0; const mats = new Set();
  root.traverse((o) => { if (!o.isMesh || !o.geometry) return; meshes++; mats.add(o.material);
    const t = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
    if (o.isInstancedMesh) { instancedMeshes++; instances += o.count; triangles += t * o.count; } else { instances++; triangles += t; } });
  return {meshes, instancedMeshes, instances, triangles: Math.round(triangles), materials: mats.size};
}

export const ENTORNO_QUALITIES = Object.freeze(['alta', 'baja']);
export function createEntorno(kind, {quality = 'alta'} = {}) {
  if (!ENTORNO_KINDS.includes(kind)) throw new RangeError('Entorno desconocido');
  if (!ENTORNO_QUALITIES.includes(quality)) throw new RangeError('Calidad desconocida');
  const LOW = quality === 'baja'; // dispositivo lento: árboles un nivel más simple, palmeras lejanas antes, sin flores
  const root = new THREE.Group(); root.name = 'entorno-decorativo'; root.userData.decorative = true;
  const mats = K.makeMaterials();
  const W = new Proto(mats);           // static world, merged per material
  const R = rng(kind.length * 977 + 11);
  const items = {tree: [], treeFar: [], cypress: [], shrub: [], palm: [], palmFar: [], bench: [], lamp: [], lampD: [], traffic: [], bollard: [], bin: [], car: [], shelter: [], umbrella: [], lounger: [], flowers: []};
  const extra = []; // [proto, items]
  const CAR_COLORS = [0xa8b7b6, 0x33433f, 0xd8d1c1, 0x576e76, 0x8a8f94, 0x6b5f57, 0xe4e2dc, 0x2e3a48];
  items.treeMid = [];
  const tree = (x, z, s = 1, far = false) => { const d = Math.hypot(x, z); const list = far || d > (LOW ? 62 : 95) ? items.treeFar : (LOW || d > 62) ? items.treeMid : items.tree; list.push({x, y: 0, z, ry: R() * 6.28, s: s * (.9 + R() * .25), v: R() * 3 | 0}); };
  const palm = (x, z, s = 1) => { (Math.hypot(x, z) < (LOW ? 45 : 90) ? items.palm : items.palmFar).push({x, y: 0, z, ry: R() * 6.28, s: s * (.85 + R() * .3), v: R() * 3 | 0}); };

  /* ---------- ground + streets ---------- */
  const SEA = true; // fusión: siempre hay mar detrás
  K.groundDisc(W, 'water', 340, -1.72, 0xffffff, 3, true);
  // pad ring sidewalk (around the existing gray pad x±19, z -15..19)
  K.sidewalk(W, -22, -18, 22, -15, 'n'); K.sidewalk(W, -22, 19, 22, 22, 's'); K.sidewalk(W, -22, -15, -19, 19, 'w'); K.sidewalk(W, 19, -15, 22, 19, 'e');
  const landX = [-260, 260], landZ = [-27, 260];
  const clampX = (a, b) => [Math.max(a, landX[0]), Math.min(b, landX[1])], clampZ = (a, b) => [Math.max(a, landZ[0]), Math.min(b, landZ[1])];
  // roads along x (z bands)
  for (const [z0, z1] of ZR) {
    if (z1 <= landZ[0]) continue;
    const [ax, bx] = clampX(-260, 260); W.slab('asphalt', ax, z0, bx, z1, Y.road, .15);
    const segs = [[-260, -75], [-66, -31], [-22, 22], [31, 66], [75, 260]];
    for (const [a, b] of segs) { const [sa, sb] = clampX(a, b); if (sb - sa < 4) continue; if (z0 !== -27) for (let x = sa + 2; x < sb - 3; x += 4.5) W.box('lane', x + 1.2, Y.road + .012, (z0 + z1) / 2, 2.4, .02, .16); W.box('lane', (sa + sb) / 2, Y.road + .012, z0 + .55, sb - sa, .02, .1); W.box('lane', (sa + sb) / 2, Y.road + .012, z1 - .55, sb - sa, .02, .1); }
  }
  for (const [x0, x1] of XR) {
    if (x1 <= landX[0]) continue;
    const segs = [[-260, -72], [-63, -27], [-18, 22], [31, 66], [75, 260]];
    for (const [a, b] of segs) { const [sa, sb] = clampZ(a, b); if (sb - sa < 4) continue; W.slab('asphalt', x0, sa, x1, sb, Y.road, .15);
      for (let z = sa + 2; z < sb - 3; z += 4.5) W.box('lane', (x0 + x1) / 2, Y.road + .012, z + 1.2, .16, .02, 2.4); W.box('lane', x0 + .55, Y.road + .012, (sa + sb) / 2, .1, .02, sb - sa); W.box('lane', x1 - .55, Y.road + .012, (sa + sb) / 2, .1, .02, sb - sa); }
  }
  // crosswalks + stop lines at every intersection of the near grid
  for (const [x0, x1] of XR) for (const [z0, z1] of ZR) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; if (cx < landX[0] || cz < landZ[0]) continue;
    K.zebra(W, cx, z0 - 2, x1 - x0 - 1, 3, 'z'); K.zebra(W, cx, z1 + 2, x1 - x0 - 1, 3, 'z');
    K.zebra(W, x0 - 2, cz, z1 - z0 - 1, 3, 'x'); K.zebra(W, x1 + 2, cz, z1 - z0 - 1, 3, 'x');
    W.box('lane', cx, Y.road + .014, z0 - 4.1, (x1 - x0) / 2 - .4, .02, .35); W.box('lane', x1 + 4.1, Y.road + .014, cz, .35, .02, (z1 - z0) / 2 - .4);
    K.manhole(W, cx + 2, cz - 1.5);
  }
  // blocks: sidewalks with curbs + street furniture
  const blocks = [];
  for (const [bx0, bx1] of XC) for (const [bz0, bz1] of ZC) {
    if (bx0 === -22 && bz0 === -18) continue; // the office block
    let x0 = Math.max(bx0, -150), x1 = Math.min(bx1, 150), z0 = Math.max(bz0, -150), z1 = Math.min(bz1, 150);
    if (bz0 < -27) continue; // el mar empieza en z = -27
    const b = {x0, x1, z0, z1, ix0: x0 + (bx0 > -200 && x0 === bx0 ? SW : 0), ix1: x1 - (bx1 < 200 ? SW : 0), iz0: z0 + (bz0 > -200 && z0 === bz0 ? SW : 0), iz1: z1 - (bz1 < 200 ? SW : 0)};
    b.near = Math.max(Math.abs((x0 + x1) / 2), Math.abs((z0 + z1) / 2)) < 60; b.cx = (x0 + x1) / 2; b.cz = (z0 + z1) / 2;
    blocks.push(b);
    if (b.ix0 > x0) K.sidewalk(W, x0, z0, b.ix0, z1, 'w'); if (b.ix1 < x1) K.sidewalk(W, b.ix1, z0, x1, z1, 'e');
    if (b.iz0 > z0) K.sidewalk(W, b.ix0, z0, b.ix1, b.iz0, 'n'); if (b.iz1 < z1) K.sidewalk(W, b.ix0, b.iz1, b.ix1, z1, 's');
  }
  const furnish = (x0, z0, x1, z1, edge, {trees = true, lamps = true, step = 9} = {}) => {
    // edge: side facing road: 'w','e','n','s'; places street trees in pits and lamps near the curb
    const along = edge === 'w' || edge === 'e'; const a0 = along ? z0 : x0, a1 = along ? z1 : x1; let i = 0;
    const off = edge === 'w' ? x0 + 1.2 : edge === 'e' ? x1 - 1.2 : edge === 'n' ? z0 + 1.2 : z1 - 1.2;
    for (let a = a0 + 4; a < a1 - 3; a += step, i++) {
      const [x, z] = along ? [off, a] : [a, off];
      if (Math.hypot(x, z) > 120) continue;
      if (lamps && i % 2 === 0) { const ry = edge === 'w' ? Math.PI : edge === 'e' ? 0 : edge === 'n' ? Math.PI / 2 : -Math.PI / 2; items.lamp.push({x, y: Y.walk, z, ry}); }
      else if (trees) { K.treePit(W, x, z); tree(x, z, .95); }
    }
  };
  // pad ring furniture (outer side of the existing pad), skip the parking entrance front-right
  furnish(-22, -18, 22, -15, 'n', {step: 10}); furnish(-22, -15, -19, 19, 'w', {step: 10}); furnish(19, -15, 22, 14, 'e', {step: 10}); furnish(-22, 19, 8, 22, 's', {step: 10});
  for (const b of blocks) if (b.near) {
    if (b.ix0 > b.x0) furnish(b.x0, b.iz0, b.ix0, b.iz1, 'w'); if (b.ix1 < b.x1) furnish(b.ix1, b.iz0, b.x1, b.iz1, 'e');
    if (b.iz0 > b.z0) furnish(b.ix0, b.z0, b.ix1, b.iz0, 'n'); if (b.iz1 < b.z1) furnish(b.ix0, b.iz1, b.ix1, b.z1, 's');
  }
  // traffic lights at the 4 corners of the office ring
  const T = items.traffic;
  T.push({x: -23.2, y: Y.walk, z: -16.8, ry: Math.PI / 2}, {x: 23.2, y: Y.walk, z: -16.8, ry: Math.PI}, {x: -23.2, y: Y.walk, z: 20.8, ry: 0}, {x: 32.2, y: Y.walk, z: -16.8, ry: Math.PI / 2}, {x: -32.2, y: Y.walk, z: -28.2, ry: -Math.PI / 2}, {x: 21, y: Y.walk, z: -28.2, ry: Math.PI});
  // parked cars along curbs
  const parkRow = (x0, x1, z, ry, n) => { for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * (i + .5) / n + (R() - .5) * 1.2; if (R() < .3) continue; items.car.push({x, y: Y.road, z, ry, tint: {car: CAR_COLORS[R() * CAR_COLORS.length | 0]}}); } };
  const parkCol = (z0, z1, x, ry, n) => { for (let i = 0; i < n; i++) { const z = z0 + (z1 - z0) * (i + .5) / n + (R() - .5) * 1.2; if (R() < .3) continue; items.car.push({x, y: Y.road, z, ry, tint: {car: CAR_COLORS[R() * CAR_COLORS.length | 0]}}); } };
  parkRow(-64, -34, -26, 0, 6); parkRow(-18, 18, -19.1, Math.PI, 6); parkCol(-60, -32, -23.1, -Math.PI / 2, 6); parkCol(-14, 14, -30, Math.PI / 2, 5); parkRow(34, 62, 23.1, 0, 5); parkCol(34, 62, -30, -Math.PI / 2, 5);
  // a few moving-looking cars in lanes
  items.car.push({x: -48, y: Y.road, z: 24.6, ry: 0, tint: {car: 0x9aa6ad}}, {x: 8, y: Y.road, z: -24.4, ry: Math.PI, tint: {car: 0x3b4a55}}, {x: -26.5, y: Y.road, z: -42, ry: Math.PI / 2, tint: {car: 0xd9d5cc}});

  /* ---------- builders ---------- */
  const FH = 3.6;
  function curtainTower(x0, z0, x1, z1, floors, {mull = 'mullion', slab = 'slab', lobby = 5.4, crown = true, seed = 1, setback = 0} = {}) {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, base = Y.walk, r = rng(seed);
    const H = lobby + floors * FH, top = base + H;
    W.beginTower(); // s19: per-building fade
    // lobby: recessed glass, columns, canopy
    const inset = 1.2;
    for (const [fw, fd, ry] of [[w - inset * 2, d / 2 - inset, 0], [w - inset * 2, -(d / 2 - inset), Math.PI], [d - inset * 2, w / 2 - inset, Math.PI / 2], [d - inset * 2, -(w / 2 - inset), -Math.PI / 2]]) {
      const nx = Math.sin(ry), nz = Math.cos(ry), px = cx + nx * Math.abs(fd), pz = cz + nz * Math.abs(fd);
      W.box('lobbyGlass', px, base + lobby / 2, pz, fw, lobby - .2, .08, {ry});
      for (let t = -fw / 2; t <= fw / 2 + .01; t += 3) W.box('mullionDark', px + Math.cos(ry) * t, base + lobby / 2, pz - Math.sin(ry) * t, .12, lobby, .14, {ry});
    }
    for (let t = x0 + .3; t <= x1 - .3 + .01; t += (w - .6) / Math.max(1, Math.round((w - .6) / 6))) { W.box('slab', t, base + lobby / 2, z1 - .3, .6, lobby, .6); W.box('slab', t, base + lobby / 2, z0 + .3, .6, lobby, .6); }
    for (let t = z0 + .3; t <= z1 - .3 + .01; t += (d - .6) / Math.max(1, Math.round((d - .6) / 6))) { W.box('slab', x0 + .3, base + lobby / 2, t, .6, lobby, .6); W.box('slab', x1 - .3, base + lobby / 2, t, .6, lobby, .6); }
    W.box('crown', cx, base + lobby - .1, z1 + 1.4, Math.min(10, w * .5), .35, 3); W.box('accent', cx, base + lobby - .3, z1 + 2.9, Math.min(10, w * .5), .08, .06);
    W.box('pavers', cx, base + .05, z1 + .8, Math.min(8, w * .4), .1, 1.6);
    // tower glass with UV atlas (bays x floors), mullions, slab bands
    const fx0 = x0 + setback, fx1 = x1 - setback, fz0 = z0 + setback, fz1 = z1 - setback, fw = fx1 - fx0, fd = fz1 - fz0;
    const y0 = base + lobby, hF = floors * FH;
    const face = (len, px, pz, ry) => {
      const bays = Math.max(2, Math.round(len / 3.2)); const g = new THREE.PlaneGeometry(len, hF); const uv = g.attributes.uv;
      const u0 = (r() * 8 | 0) / 8, v0 = (r() * 8 | 0) / 8;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * bays / 8, v0 + uv.getY(i) * floors / 8);
      W.add('towerGlass', g, mtx(px, y0 + hF / 2, pz, 0, ry, 0));
      for (let b = 0; b <= bays; b++) { const t = -len / 2 + b * len / bays; W.box(mull, px + Math.cos(ry) * t, y0 + hF / 2, pz - Math.sin(ry) * t, .16, hF, .3, {ry}); }
    };
    face(fw, (fx0 + fx1) / 2, fz1, 0); face(fw, (fx0 + fx1) / 2, fz0, Math.PI); face(fd, fx1, (fz0 + fz1) / 2, Math.PI / 2); face(fd, fx0, (fz0 + fz1) / 2, -Math.PI / 2);
    for (let f = 0; f <= floors; f++) W.box(slab, (fx0 + fx1) / 2, y0 + f * FH, (fz0 + fz1) / 2, fw + .35, .42, fd + .35);
    W.box(slab, cx, y0 - .1, cz, w + .2, .5, d + .2);
    // crown: parapet + accent line + roof gear
    const ty = y0 + hF;
    if (crown) { W.box('crown', (fx0 + fx1) / 2, ty + .9, (fz0 + fz1) / 2, fw + .45, 1.8, fd + .45); W.box('accent', (fx0 + fx1) / 2, ty + .12, (fz0 + fz1) / 2, fw + .5, .1, fd + .5); }
    W.box('roofFlat', (fx0 + fx1) / 2, ty + 1.85, (fz0 + fz1) / 2, fw - .2, .1, fd - .2);
    W.box('metal', (fx0 + fx1) / 2 - fw * .15, ty + 3.0, (fz0 + fz1) / 2, fw * .35, 2.2, fd * .4);
    for (let i = 0; i < 6; i++) W.box('darkMetal', (fx0 + fx1) / 2 - fw * .15 - fw * .175 + .05, ty + 2.2 + i * .32, (fz0 + fz1) / 2, .06, .06, fd * .4 + .02);
    W.cyl('metal', (fx0 + fx1) / 2 + fw * .22, ty + 2.6, (fz0 + fz1) / 2 - fd * .2, .9, .9, 1.5, 12);
    W.endTower();
    return top;
  }
  const door = (P, x, z, ry = 0) => { const nx = Math.sin(ry), nz = Math.cos(ry);
    P.box('frame', x + nx * .02, 1.15, z + nz * .02, 1.3, 2.4, .1, {ry}); P.box('door', x + nx * .06, 1.1, z + nz * .06, 1.05, 2.2, .06, {ry, worldUV: false}); P.box('metal', x + nx * .1 + Math.cos(ry) * .35, 1.1, z + nz * .1, .05, .25, .05, {ry});
    P.box('stone', x + nx * .5, .08, z + nz * .5, 1.8, .16, .9, {ry}); };
  const fountain = (cx, cz, s = 1) => {
    const lathe = (pts, key, y = 0, seg = 36) => W.add(key, new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a * s, b * s)), seg), mtx(cx, Y.walk + y, cz));
    lathe([[4.1, 0], [4.6, 0], [4.65, .55], [4.5, .72], [4.05, .72], [4.0, .2], [0, .2]], 'stone');
    W.cyl('pool', cx, Y.walk + .5 * s, cz, 4.02 * s, 4.02 * s, .04, 36);
    lathe([[0, 0], [.7, 0], [.7, .35], [.4, .55], [.32, 1.45], [1.55, 1.62], [1.65, 1.8], [1.45, 1.86], [.26, 1.95], [.2, 2.7], [.85, 2.78], [.9, 2.92], [.16, 3.0], [.12, 3.45], [.2, 3.6], [0, 3.75]], 'stone', 0, 24);
    W.cyl('pool', cx, Y.walk + 1.8 * s, cz, 1.44 * s, 1.44 * s, .04, 24); W.cyl('pool', cx, Y.walk + 2.9 * s, cz, .8 * s, .8 * s, .03, 18);
    W.add('jet', new THREE.CylinderGeometry(1.5 * s, 1.95 * s, 1.3 * s, 28, 1, true), mtx(cx, Y.walk + 1.15 * s, cz));
    W.add('jet', new THREE.CylinderGeometry(.85 * s, 1.1 * s, 1.0 * s, 20, 1, true), mtx(cx, Y.walk + 2.4 * s, cz));
    W.add('jet', new THREE.ConeGeometry(.12 * s, 1.6 * s, 8, 1, true), mtx(cx, Y.walk + 4.4 * s, cz, Math.PI));
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; W.rod('jet', [cx + Math.cos(a) * 3.8 * s, Y.walk + .55 * s, cz + Math.sin(a) * 3.8 * s], [cx + Math.cos(a) * 2.6 * s, Y.walk + 1.6 * s, cz + Math.sin(a) * 2.6 * s], .05, .03, 5); }
  };
  const kiosk = (cx, cz) => {
    W.cyl('stone', cx, Y.walk + .45, cz, 4.2, 4.4, .9, 8); W.cyl('trim', cx, Y.walk + .93, cz, 4.3, 4.3, .08, 8);
    for (let i = 0; i < 3; i++) W.box('stone', cx, Y.walk + .15 + i * .25, cz + 4.4 + .9 - i * .3, 2.4, .25, .6);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8, x = cx + Math.cos(a) * 3.8, z = cz + Math.sin(a) * 3.8; W.cyl('iron', x, Y.walk + 3.0, z, .1, .12, 4.2, 8);
      const a2 = a + Math.PI / 4, x2 = cx + Math.cos(a2) * 3.8, z2 = cz + Math.sin(a2) * 3.8;
      if (i !== 1) { W.rod('iron', [x, Y.walk + 1.9, z], [x2, Y.walk + 1.9, z2], .04, .04, 5); for (let k = 1; k < 8; k++) { const t = k / 8; W.rod('iron', [x + (x2 - x) * t, Y.walk + 1.0, z + (z2 - z) * t], [x + (x2 - x) * t, Y.walk + 1.9, z + (z2 - z) * t], .025, .025, 4); } }
      W.rod('iron', [x, Y.walk + 4.9, z], [x2, Y.walk + 4.9, z2], .07, .07, 5); }
    W.cyl('trim', cx, Y.walk + 5.15, cz, 4.4, 4.4, .3, 8); W.add('slate', new THREE.ConeGeometry(4.9, 2.4, 8, 1), mtx(cx, Y.walk + 6.5, cz, 0, Math.PI / 8, 0));
    W.cyl('iron', cx, Y.walk + 8.0, cz, .05, .12, .9, 6); W.add('iron', new THREE.SphereGeometry(.16, 8, 6), mtx(cx, Y.walk + 8.5, cz));
  };
  const pathX = (x0, x1, z, w = 3) => { W.slab('pavers', x0, z - w / 2, x1, z + w / 2, Y.walk + .02, .12); W.slab('curb', x0, z - w / 2 - .12, x1, z - w / 2, Y.walk + .06, .2); W.slab('curb', x0, z + w / 2, x1, z + w / 2 + .12, Y.walk + .06, .2); };
  const pathZ = (z0, z1, x, w = 3) => { W.slab('pavers', x - w / 2, z0, x + w / 2, z1, Y.walk + .02, .12); W.slab('curb', x - w / 2 - .12, z0, x - w / 2, z1, Y.walk + .06, .2); W.slab('curb', x + w / 2, z0, x + w / 2 + .12, z1, Y.walk + .06, .2); };
  const flowerBed = (cx, cz, w, d) => { W.box('curb', cx, Y.walk + .12, cz, w + .3, .3, d + .3); W.box('soil', cx, Y.walk + .2, cz, w, .3, d, {worldUV: false});
    for (let i = 0; i < w * d * 1.4; i++) items.flowers.push({x: cx + (R() - .5) * w * .92, y: Y.walk + .35, z: cz + (R() - .5) * d * .92, ry: R() * 6, s: .8 + R() * .5, tint: {flowers: [0xd9a7b4, 0xefe9e0, 0xb9a8cf, 0xd8b98a, 0x9fbf8a][R() * 5 | 0]}}); };
  const parkBlock = (b, {fountainAt = null, kioskAt = null, dense = 1} = {}) => {
    K.lawn(W, b.ix0, b.iz0, b.ix1, b.iz1, Y.grass + .05, b.cx);
    const cx = fountainAt ? fountainAt[0] : b.cx, cz = fountainAt ? fountainAt[1] : b.cz;
    pathX(b.ix0, b.ix1, cz); pathZ(b.iz0, b.iz1, cx);
    if (fountainAt) { W.cyl('pavers', cx, Y.walk - .05, cz, 9, 9, .2, 40); W.add('curb', new THREE.CylinderGeometry(9.12, 9.12, .22, 40, 1, true), mtx(cx, Y.walk - .04, cz)); fountain(cx, cz);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; items.bench.push({x: cx + Math.cos(a) * 7.6, y: Y.walk, z: cz + Math.sin(a) * 7.6, ry: -a - Math.PI / 2}); }
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; items.lampD.push({x: cx + Math.cos(a) * 9.8, y: Y.walk, z: cz + Math.sin(a) * 9.8, ry: a}); } }
    if (kioskAt) { W.cyl('pavers', kioskAt[0], Y.walk - .05, kioskAt[1], 7.5, 7.5, .2, 32); kiosk(kioskAt[0], kioskAt[1]); }
    // benches along paths, lamps, beds, hedges, trees on lawns
    for (let x = b.ix0 + 4; x < b.ix1 - 3; x += 7) { if (Math.abs(x - cx) < 11) continue; items.bench.push({x, y: Y.walk, z: cz - 2.2, ry: 0}); if ((x | 0) % 2) items.lamp.push({x: x + 3.5, y: Y.walk, z: cz + 2.1, ry: Math.PI / 2}); }
    for (let z = b.iz0 + 4; z < b.iz1 - 3; z += 7) { if (Math.abs(z - cz) < 11) continue; items.bench.push({x: cx + 2.2, y: Y.walk, z, ry: -Math.PI / 2}); items.bin.push({x: cx + 2.2, y: Y.walk, z: z + 1.6}); }
    const quads = [[b.ix0, b.iz0, cx - 1.8, cz - 1.8], [cx + 1.8, b.iz0, b.ix1, cz - 1.8], [b.ix0, cz + 1.8, cx - 1.8, b.iz1], [cx + 1.8, cz + 1.8, b.ix1, b.iz1]];
    quads.forEach(([a0, c0, a1, c1], qi) => {
      if (a1 - a0 < 6 || c1 - c0 < 6) return;
      const m = 2.2; const area = (a1 - a0) * (c1 - c0); const nT = Math.round(area / 55 * dense);
      for (let i = 0; i < nT; i++) { const x = a0 + m + R() * (a1 - a0 - 2 * m), z = c0 + m + R() * (c1 - c0 - 2 * m); if (fountainAt && Math.hypot(x - cx, z - cz) < 12) continue; if (kioskAt && Math.hypot(x - kioskAt[0], z - kioskAt[1]) < 9) continue; if (R() < .18) items.cypress.push({x, y: Y.grass, z, ry: R() * 6, s: .9 + R() * .3}); else tree(x, z, 1 + R() * .25); }
      for (let i = 0; i < nT * .8; i++) { const x = a0 + 1 + R() * (a1 - a0 - 2), z = c0 + 1 + R() * (c1 - c0 - 2); items.shrub.push({x, y: Y.grass, z, ry: R() * 6, s: .7 + R() * .6}); }
      if (qi % 2 === 0) flowerBed((a0 + a1) / 2 + (R() - .5) * 4, c0 + 3, Math.min(8, (a1 - a0) * .4), 1.6);
      K.hedge(W, a0 + .4, c0 + .4, a1 - .4, c0 + 1.2, .9, Y.grass, qi);
    });
  };

  /* ---------- proposals ---------- */
  const blockAt = (cx, cz) => blocks.find((b) => cx >= b.x0 && cx <= b.x1 && cz >= b.z0 && cz <= b.z1);
  {
    items.car = items.car.filter((c) => c.z > -27); items.traffic = items.traffic.filter((t) => t.z > -27.5);
    const MX = -200, MZ = -35, X0 = -130; // seawall lines (left: x = MX, back: z = MZ)
    W.slab('grass', MX, MZ, 260, 260, Y.ground + .02, .6);
    // malecón promenade (pavers) between the coastal avenues and the seawall, with a cap and the stone wall face
    W.slab('pavers', MX, MZ, 200, -27, Y.walk, 1.3);
    W.slab('curb', MX, -27.25, 200, -27, Y.walk + .005, .28);
    W.box('concrete', 0, Y.walk + .1, MZ + .25, 400, .2, .5);
    W.box('stone', 0, -1.05, MZ - .35, 400, 1.5, .7);
    for (let x = X0; x < 120; x += 1.6) W.cyl('iron', x, Y.walk + .7, MZ + .3, .045, .045, 1.1, 6);
    W.box('metal', -5, Y.walk + 1.25, MZ + .3, 250, .07, .1); W.box('iron', -5, Y.walk + .75, MZ + .3, 250, .04, .04);
    // planters + palms + benches + lamps on the promenade
    for (let x = X0 + 4; x < 110; x += 8) { W.box('stone', x, Y.walk + .3, MZ + 4.2, 1.8, .6, 1.8); W.box('soil', x, Y.walk + .61, MZ + 4.2, 1.5, .04, 1.5, {worldUV: false}); palm(x, MZ + 4.2, 1.05); items.bench.push({x: x + 4, y: Y.walk, z: MZ + 1.5, ry: Math.PI}); if ((x / 8 | 0) % 2) items.lamp.push({x: x + 4, y: Y.walk, z: MZ + 6.6, ry: -Math.PI / 2}); }
    // beach: sloped sand that dips under the water line, wet-sand band and foam
    const slope = (len, wid, along) => { const g = new THREE.PlaneGeometry(along === 'x' ? len : wid, along === 'x' ? wid : len, along === 'x' ? 60 : 6, along === 'x' ? 6 : 60); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const t = along === 'x' ? (-p.getZ(i) / wid + .5) : (-p.getX(i) / wid + .5); const q = along === 'x' ? p.getX(i) : p.getZ(i); p.setY(i, -1.3 - t * .65 + Math.sin(q * .21) * .04 * t); } g.computeVertexNormals(); return g; };
    W.add('sand', slope(400, 16, 'x'), mtx(0, 0, MZ - 8));
    for (const [off, wd] of [[-11.2, 1.0], [-13.4, .6]]) {
      const g = new THREE.PlaneGeometry(400, wd, 120, 1); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + Math.sin(p.getX(i) * .33) * .45); W.add('foam', g, mtx(0, -1.66, MZ + off)); }
    // stairs from the malecón down to the sand
    for (const sx of [-20, 12, 44]) { for (let i = 0; i < 6; i++) W.box('concrete', sx, Y.walk - .1 - i * .2, MZ - .5 - i * .45, 3, .2, .45); W.box('iron', sx - 1.6, Y.walk + .2, MZ - 1.6, .05, .05, 2.6, {rx: .45}); W.box('iron', sx + 1.6, Y.walk + .2, MZ - 1.6, .05, .05, 2.6, {rx: .45}); }
    // umbrellas + loungers
    for (let x = -90; x < 100; x += 6) if (R() < .65) { const z = MZ - 4 - R() * 4; items.umbrella.push({x, y: -1.45 - (MZ - z) * .03, z, ry: R() * 6, tint: {fabric: [0xbcd9ec, 0xe9e4da, 0xc9b9a6, 0x9fb7c0][R() * 4 | 0]}}); items.lounger.push({x: x + 1.2, y: -1.5, z: z + .4, ry: R() * .4 - .2}, {x: x - 1.2, y: -1.5, z: z + .5, ry: R() * .4 - .2}); }
    // lifeguard tower
    const life = (lx, lz, ry) => { const L = new Proto(mats); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) L.box('wood', dx, 1.4, dz, .18, 2.8, .18, {worldUV: false});
      L.box('wood', 0, 2.85, 0, 2.8, .14, 2.8, {worldUV: false}); L.box('paint', 0, 3.75, 0, 2.2, 1.7, 2.2, {color: 0xe9e6de}); L.box('winGlass', 0, 3.95, 1.12, 1.4, .7, .04); L.box('accent', 0, 3.05, 0, 2.25, .12, 2.25);
      L.box('fabric', 0, 4.75, 0, 2.9, .12, 2.9, {color: 0xbcd9ec}); L.box('wood', 0, 1.3, 2.6, 1, .1, 3.4, {rx: .7, worldUV: false}); W.merge(L, mtx(lx, -1.55, lz, 0, ry, 0)); };
    life(-4, MZ - 7, 0); life(-60, MZ - 7, 0);
    // wooden pier into the sea with railings + 2 sailboats
    { const px = 20; W.slab('wood', px - 1.8, MZ - 34, px + 1.8, MZ - .5, Y.walk - .1, .25, {worldUV: true}); for (let z = MZ - 33; z < MZ; z += 3) for (const sx of [-1.7, 1.7]) { W.cyl('wood', px + sx, -1.2, z, .14, .14, 1.8, 6, {worldUV: false}); W.cyl('iron', px + sx, Y.walk + .45, z, .04, .04, .9, 5); }
      for (const sx of [-1.7, 1.7]) W.box('wood', px + sx, Y.walk + .9, MZ - 17, .08, .08, 33, {worldUV: false}); W.box('paint', px, Y.walk + 1.4, MZ - 32, 3, 2.6, 2.6, {color: 0xe6e2d8}); W.box('roofTile', px, Y.walk + 2.85, MZ - 32, 3.6, .2, 3.2, {worldUV: false}); }
    const boat = (bx, bz, ry, s) => { const B = new Proto(mats); const hull = new THREE.Shape(); hull.moveTo(-2.4, .6); hull.lineTo(2.6, .6); hull.quadraticCurveTo(2.2, -.1, 1.2, -.35); hull.lineTo(-2.0, -.35); hull.closePath();
      B.add('paint', new THREE.ExtrudeGeometry(hull, {depth: 1.4, bevelEnabled: true, bevelSize: .1, bevelThickness: .1, bevelSegments: 2}), mtx(0, 0, -.7), 0xeeeae2, {worldUV: false}); B.box('wood', 0, .66, 0, 4.4, .06, 1.3, {worldUV: false}); B.box('accent', 0, .45, .82, 5, .1, .02); B.box('accent', 0, .45, -.82, 5, .1, .02);
      B.cyl('metal', .3, 3.6, 0, .05, .07, 6, 6); const sail = new THREE.BufferGeometry(); sail.setAttribute('position', new THREE.Float32BufferAttribute([.35, .9, 0, .35, 6.4, 0, -2.2, .95, 0, .25, 1.2, 0, .25, 5.8, 0, 2.3, 1.1, 0], 3)); sail.computeVertexNormals(); B.add('fabric', sail, null, 0xf2f0ea);
      W.merge(B, mtx(bx, -1.75, bz, 0, ry, 0, s, s, s)); };
    boat(48, MZ - 30, .3, 1.1); boat(-12, MZ - 52, -.6, 1); boat(-70, MZ - 40, 1.2, 1); boat(-30, MZ - 80, .2, 1.3); boat(90, MZ - 60, .8, 1.2);
    // escollera (jetty) out at sea behind the building (sin letrero, t429u)
    const JX = -78, JZ = -70; // punta de la escollera (antes llevaba el letrero)
    { const ax = -26, az = MZ - .6, L = Math.hypot(JX - ax, JZ - az), ux = (JX - ax) / L, uz = (JZ - az) / L, ang = Math.atan2(ux, uz);
      W.box('concrete', (ax + JX) / 2, -1.0, (az + JZ) / 2, 3.2, .5, L, {ry: ang});
      for (let t = 0; t < L; t += 1.6) for (const s of [-1, 1]) W.add('stone', new THREE.IcosahedronGeometry(.9 + R() * .7, 1), mtx(ax + ux * t + uz * s * 2.4, -1.5, az + uz * t - ux * s * 2.4, R(), R(), R(), 1, .6, 1), null, {colorFn: (c, x, y) => { c.set(0xb4aea4); c.offsetHSL(0, 0, (y + 1.7) * .08); }});
      for (let t = 6; t < L - 4; t += 12) items.lamp.push({x: ax + ux * t + uz * 1.2, y: -.75, z: az + uz * t - ux * 1.2, ry: ang + Math.PI / 2});
      W.cyl('concrete', JX, -1.1, JZ, 4.5, 5, .9, 16); }
    // camellón with palms on the coastal avenue (z -27..-18)
    const gaps = [[-33, -20], [20, 33], [-77, -64], [64, 77]];
    for (let x0 = -130; x0 < 130; x0 += 1) { /* build median in runs between intersections */ }
    { let runs = [[-130, -77], [-64, -33], [-20, 20], [33, 64], [77, 130]];
      for (const [a, b] of runs) { W.box('curb', (a + b) / 2, Y.road + .15, -22.5, b - a, .3, 1.8); W.box('grass', (a + b) / 2, Y.road + .31, -22.5, b - a - .3, .04, 1.5, {worldUV: true});
        for (let x = a + 4; x < b - 2; x += 9) palm(x, -22.5, .95); } }
    // business district inland, LOWER than the office (4-5 floors), on the sides and front corners, with explanadas toward the sea
    const spot = (cx, cz) => blockAt(cx, cz);
    const explanada = (b, z0, z1) => { W.slab('pavers', b.ix0, z0, b.ix1, z1, Y.walk + .02, .12);
      for (let x = b.ix0 + 4; x < b.ix1 - 2; x += 7) { W.box('stone', x, Y.walk + .3, z0 + 3, 1.8, .6, 1.8); W.box('soil', x, Y.walk + .61, z0 + 3, 1.5, .04, 1.5, {worldUV: false}); palm(x, z0 + 3, .9); items.bench.push({x: x + 3.5, y: Y.walk, z: z0 + 3, ry: Math.PI}); }
      for (let x = b.ix0 + 2; x < b.ix1 - 1; x += 2) items.bollard.push({x, y: Y.walk, z: z1 - .6});
      W.box('stone', b.cx, Y.walk + .25, (z0 + z1) / 2 + 1, 10, .5, 3.2); W.box('pool', b.cx, Y.walk + .5, (z0 + z1) / 2 + 1, 9.4, .04, 2.6); for (let i = -4; i <= 4; i++) W.cyl('jet', b.cx + i, Y.walk + 1.0, (z0 + z1) / 2 + 1, .05, .08, 1, 5);
      items.lamp.push({x: b.ix0 + 1.2, y: Y.walk, z: (z0 + z1) / 2, ry: 0}, {x: b.ix1 - 1.2, y: Y.walk, z: (z0 + z1) / 2, ry: Math.PI}); };
    const plan = [[-48, 2, 4, 'a'], [-48, 48, 5, 'b']];
    for (const [cx, cz, floors, style] of plan) { const b = spot(cx, cz); if (!b) continue;
      const near = b.iz0 < 0; const tz0 = near ? b.iz0 + 15 : b.iz0 + 3, tz1 = b.iz1 - 3;
      if (near) explanada(b, b.iz0, b.iz0 + 13); else W.slab('pavers', b.ix0, b.iz0, b.ix1, b.iz1, Y.walk + .01, .1);
      const tw = Math.min(b.ix1 - b.ix0 - 6, 24), tx = b.cx;
      curtainTower(tx - tw / 2, tz0, tx + tw / 2, tz1, floors, {mull: style === 'b' ? 'mullionDark' : 'mullion', slab: style === 'b' ? 'slabDark' : 'slab', seed: cx * 7 + cz, setback: .8});
      for (const s of [-1, 1]) { const px = tx + s * (tw / 2 + 1.6); W.box('stone', px, Y.walk + .4, tz1 + 1.2, 2.2, .8, 2.2); W.box('soil', px, Y.walk + .81, tz1 + 1.2, 1.9, .04, 1.9, {worldUV: false}); palm(px, tz1 + 1.2, .85); } }
    { const b = spot(0, 48); if (b) parkBlock(b, {dense: .55}); const b2 = spot(48, 48); if (b2) parkBlock(b2, {dense: .5, fountainAt: [b2.cx, b2.cz]}); const b3 = spot(48, 2); if (b3) parkBlock(b3, {dense: .45, kioskAt: [b3.cx + 6, b3.cz - 4]}); }
    for (const [cx, cz, f] of [[-112, 2, 6], [112, 2, 6], [-112, 48, 7], [112, 48, 7], [-48, 112, 8], [48, 112, 8], [0, 112, 6], [-112, 112, 8], [112, 112, 8]]) { const s = 12; curtainTower(cx - s, cz - s * .7, cx + s, cz + s * .7, f, {mull: (cx + cz) % 2 ? 'mullionDark' : 'mullion', slab: 'slab', seed: cx - cz}); W.slab('pavers', cx - s - 3, cz - s, cx + s + 3, cz + s, Y.walk, .25); }
    for (let i = 0; i < 30; i++) { const x = -20 + R() * 180, z = -20 + R() * 180; if (Math.max(Math.abs(x), Math.abs(z)) > 95) palm(x, z, 1); }
  }
  /* ---------- recorte de presupuesto (s17): piezas lejanas y diminutas que en el encuadre del celular no se distinguen ---------- */
  const near = (r) => (it) => Math.hypot(it.x, it.z) <= r;
  items.palmFar = items.palmFar.filter(near(120));
  for (const k of ['lamp', 'bench', 'lounger', 'umbrella', 'bin']) items[k] = items[k].filter(near(85));
  /* ---------- instancing ---------- */
  const treeVars = [0, 1, 2].map((s) => K.treeProto(mats, {seed: s + 1, base: [0x5f7c46, 0x6a8048, 0x557341][s]}));
  const treeFarVar = K.treeProto(mats, {seed: 9, lod: 1});
  for (let v = 0; v < 3; v++) place(root, treeVars[v], items.tree.filter((t) => t.v === v).map((t) => ({...t, y: Y.walk})), {name: 'arbol'});
  place(root, treeFarVar, items.treeFar.map((t) => ({...t, y: Y.walk})), {name: 'arbol-lejano', cast: false});
  place(root, K.treeProto(mats, {seed: 4, lod: 2}), items.treeMid.map((t) => ({...t, y: Y.walk})), {name: 'arbol-medio', cast: false});
  const pools = K.lightPoolMesh([...items.lamp.map((l) => ({...l, off: 1.6})), ...items.lampD.map((l) => ({...l, off: 0}))], Y.walk); if (pools) root.add(pools);
  if (items.palm.length) { const pv = [1, 2, 3].map((s) => K.palmProto(mats, {seed: s})); for (let v = 0; v < 3; v++) place(root, pv[v], items.palm.filter((t) => t.v === v).map((t) => ({...t, y: Y.walk})), {name: 'palmera'}); }
  if (items.palmFar.length) place(root, K.palmProto(mats, {seed: 5, lod: 1}), items.palmFar.map((t) => ({...t, y: Y.walk})), {name: 'palmera-lejana', cast: false});
  place(root, K.cypressProto(mats), items.cypress, {name: 'cipres'});
  place(root, K.shrubProto(mats), items.shrub, {name: 'arbusto'});
  place(root, K.benchProto(mats), items.bench, {name: 'banca'});
  place(root, K.lampProto(mats), items.lamp, {name: 'farola'}); place(root, K.lampProto(mats, {double: true}), items.lampD, {name: 'farola-doble'});
  place(root, K.trafficProto(mats), items.traffic, {name: 'semaforo'});
  place(root, K.bollardProto(mats), items.bollard, {name: 'bolardo'}); place(root, K.binProto(mats), items.bin, {name: 'basurero'});
  place(root, K.carProto(mats), items.car, {name: 'auto'}); place(root, K.shelterProto(mats), items.shelter, {name: 'parabus'});
  if (LOW) items.flowers.length = 0;
  if (items.flowers.length) { const fp = new Proto(mats); fp.add('flowers', new THREE.IcosahedronGeometry(.16, 0), mtx(0, 0, 0, 0, 0, 0, 1, .7, 1)); fp.add('leaf', new THREE.IcosahedronGeometry(.14, 0), mtx(.12, -.12, .05), 0x5c7a45); place(root, fp, items.flowers, {name: 'flores', cast: false}); }
  if (items.umbrella.length) { const up = new Proto(mats); up.cyl('wood', 0, 1.2, 0, .04, .05, 2.4, 6, {worldUV: false}); up.add('fabric', new THREE.ConeGeometry(1.5, .55, 10, 1, true), mtx(0, 2.45, 0)); up.cyl('wood', 0, 2.75, 0, .05, .05, .1, 6); place(root, up, items.umbrella, {name: 'sombrilla'});
    const lp = new Proto(mats); lp.box('wood', 0, .3, 0, .7, .08, 1.8, {worldUV: false}); lp.box('wood', 0, .5, -.75, .7, .08, .55, {rx: -.7, worldUV: false}); for (const x of [-.3, .3]) for (const z of [-.8, .8]) lp.box('wood', x, .15, z, .06, .3, .06, {worldUV: false}); place(root, lp, items.lounger, {name: 'camastro'}); }
  for (const [k, P] of extra) place(root, P, items[k], {name: k});
  place(root, W, [{}], {name: 'mundo', cast: (key) => !['pavers', 'concrete', 'curb', 'grass', 'lane', 'soil', 'water', 'sand', 'foam', 'jet', 'pool'].includes(key)});

  const stats = countMeshes(root); stats.kind = kind; stats.quality = quality;
  stats.byPiece = {}; for (const [k, v] of Object.entries(items)) if (v.length) stats.byPiece[k] = v.length;
  stats.protoTris = {arbolMedio: K.treeProto(mats, {seed: 4, lod: 2}).tris(), arbol: treeVars[0].tris(), arbolLejano: treeFarVar.tris(), banca: K.benchProto(mats).tris(), farola: K.lampProto(mats).tris(), semaforo: K.trafficProto(mats).tris(), auto: K.carProto(mats).tris(), palmera: K.palmProto(mats, {seed: 1}).tris()};
  stats.mundoTris = W.tris();
  root.userData.stats = stats;
  // s19 (Rob t441u): desvanecido estable por edificio, solo lo que de verdad queda entre la cámara y la oficina (después de las estadísticas: los fantasmas no cuentan).
  const occlusion = installOcclusionFade(root, W.towers);
  let lowPower = false;
  // Ajuste en caliente para equipos lentos: sin sombras del entorno y sin piezas pequeñas (flores, camastros, sombrillas, autos).
  const setLowPower = () => { if (lowPower) return false; lowPower = true; root.traverse((o) => { if (o.isMesh) o.castShadow = false; if (['flores', 'camastro', 'sombrilla', 'auto'].includes(String(o.name).split(':')[0])) o.visible = false; }); stats.lowPower = true; return true; };
  return {group: root, stats, kind, quality, occlusion, fogNear: 25, fogFar: SEA ? 2.3 : 2.1, setLowPower, isLowPower: () => lowPower, setNight(v) { mats.setNight(v); if (pools) { pools.visible = !!v; pools.material.opacity = v ? .55 : 0; } if (root.userData.neon) root.userData.neon.emissiveIntensity = v ? 2.2 : .75; }};
}
