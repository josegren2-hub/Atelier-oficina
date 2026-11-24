import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {floorLabelsShownFor, floorFramesVisible, FLOOR_LABEL_ANCHOR} from '../src/view-layout.js';
import {OFFICE_BOX, OFFICE_CENTER, FADE_OPACITY, FADE_MS, THROTTLE_MS, PAD_ON, PAD_OFF, towerBlockCount, towerOccludes, stepFade, segmentBoxEnter, installOcclusionFade} from '../src/entorno-occlusion.js';

const scene = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');
const labelsSrc = readFileSync(new URL('../src/floor-labels.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const occSrc = readFileSync(new URL('../src/entorno-occlusion.js', import.meta.url), 'utf8');

function withFakeDocument(fn) {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const ctx = new Proxy({}, {get: (o, k) => (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => ({addColorStop() {}}) : k === 'getImageData' ? () => ({data: new Uint8ClampedArray(4)}) : k === 'measureText' ? () => ({width: 10}) : () => {}, set: () => true});
  Object.defineProperty(globalThis, 'document', {value: {createElement: () => ({width: 0, height: 0, getContext: () => ctx})}, configurable: true, writable: true});
  try { return fn(); } finally { if (saved) Object.defineProperty(globalThis, 'document', saved); else delete globalThis.document; }
}
const camAt = (azDeg, dist, polar = Math.acos(.72 / Math.hypot(1, .72, 1))) => { const az = azDeg * Math.PI / 180; return [Math.sin(polar) * Math.sin(az) * dist, 7 + Math.cos(polar) * dist, Math.sin(polar) * Math.cos(az) * dist]; };

/* ---------- C1 + C3: marcos negros ---------- */
test('s19 C1/C3: sin Vidrios no hay marcos en Separación amplia ni en Plantas; Edificio cerrado y plantas sueltas igual que antes', () => {
  assert.equal(floorFramesVisible({floor: -1, mode: 'stacked', walls: false}), false);
  assert.equal(floorFramesVisible({floor: -1, mode: 'spread', walls: false}), false);
  assert.equal(floorFramesVisible({floor: -1, mode: 'stacked', walls: true}), true);
  assert.equal(floorFramesVisible({floor: -1, mode: 'spread', walls: true}), true);
  assert.equal(floorFramesVisible({floor: -1, mode: 'exterior', walls: false}), true, 'Edificio cerrado no cambia');
  assert.equal(floorFramesVisible({floor: -1, mode: 'exterior', walls: true}), true);
  assert.equal(floorFramesVisible({floor: 2, mode: 'stacked', walls: true}), false, 'planta suelta: como antes (sin estructura)');
  // postes de esquina y vigas de arriba van en su propio grupo; la losa, piso, muros y muebles no
  assert.match(scene, /const frame=new THREE\.Group\(\);frame\.userData\.floorFrame=true;g\.add\(frame\);frames\.push\(frame\);/);
  assert.match(scene, /for\(const x of \[-12\.85,9\.3,12\.85\]\)for\(const z of \[-8\.8,8\.8\]\)box\(frame,/);
  assert.match(scene, /box\(frame,0,4\.45,z,26,\.23,\.2,M\.steel\)/);
  assert.match(scene, /for\(const x of \[-12\.85,12\.85\]\)box\(frame,x,4\.45,0,\.2,\.23,18,M\.steel\)/);
  assert.match(scene, /box\(g,0,0,0,26,\.28,18,M\.steel\)/, 'la losa se queda');
  // el switch sigue sincronizado: setWalls y setView recalculan los marcos
  assert.match(scene, /setWalls\(v\)\{walls=Boolean\(v\);facades\.forEach\(g=>g\.visible=walls&&floor<0\);syncFrames\(\);\}/);
  assert.match(scene, /function setView\(f=-1,\{animate=true\}=\{\}\)\{floor=f;[^]*?syncFrames\(\);/);
  assert.match(scene, /frames\.forEach\(g=>batch\(g\)\)/, 'marcos fuera del lote de cada piso');
});

/* ---------- C2 + C4: títulos ---------- */
test('s19 C2/C4: títulos solo en Separación amplia, más chicos y anclados a la esquina frontal izquierda de la losa', () => {
  assert.equal(floorLabelsShownFor('stacked', -1), true);
  assert.equal(floorLabelsShownFor('spread', -1), false, 'Plantas sin nombres');
  assert.equal(floorLabelsShownFor('exterior', -1), false);
  assert.equal(floorLabelsShownFor('stacked', 1), false);
  assert.deepEqual({...FLOOR_LABEL_ANCHOR}, {x: -13, y: -0.14, z: 9});
  assert.match(scene, /tmp\.set\(FLOOR_LABEL_ANCHOR\.x,FLOOR_LABEL_ANCHOR\.y,FLOOR_LABEL_ANCHOR\.z\)/);
  assert.doesNotMatch(scene, /tmp\.set\(4,0,8\.9\)|tmp\.set\(3,0,8\.9\)/);
  assert.match(css, /\.floor-label-pill\{font-size:9px;/);
  assert.match(labelsSrc, /const fits = \(yy\) => yy >= b\.top && yy \+ h <= b\.bottom && !pinBoxes\.some/, 'no se enciman con encabezado, botones de piso, barra de vistas, dock ni pines');
  assert.match(scene, /floorLabels\?\.update\(projectFloorLabels\(\),labelPins\(\)\)/);
  assert.doesNotMatch(labelsSrc, /calc\(-100% - 10px\)/, 'ya no se voltean a la izquierda: todos en la misma orilla');
});

test('s19 C2: la capa de títulos esconde lo que choque con la barra de abajo o el encabezado', async () => {
  const {mountFloorLabels} = await import('../src/floor-labels.js');
  const rect = (top, h) => ({top, bottom: top + h, left: 0, width: 390, height: h});
  const sel = {header: [rect(0, 80)], '#floors': [rect(79, 44)], '#vista-toolbar': [rect(706, 70)], '#dock': [rect(788, 56)]};
  const kids = [];
  const mk = () => ({className: '', textContent: '', hidden: false, style: {}, offsetWidth: 120, offsetHeight: 17, setAttribute() {}, appendChild(c) { kids.push(c); }, remove() {}, getBoundingClientRect: () => ({width: 390})});
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {value: {createElement: mk}, configurable: true, writable: true});
  try {
    const container = {clientWidth: 390, ownerDocument: {querySelectorAll: (s) => (sel[s] || []).map((r) => ({getBoundingClientRect: () => r}))}, getBoundingClientRect: () => rect(0, 844), appendChild() {}};
    const L = mountFloorLabels(container);
    L.update([{visible: true, x: 30, y: 300}, {visible: true, x: 30, y: 720}, {visible: true, x: 30, y: 100}, {visible: true, x: -50, y: 400}, {visible: false}, {visible: false}]);
    assert.equal(kids[0].hidden, false); assert.equal(kids[0].style.transform, 'translate(30px, 301px)');
    assert.equal(kids[1].hidden, true, 'encima de la barra de vistas → oculto');
    assert.equal(kids[2].hidden, true, 'debajo de los botones de piso → oculto');
    assert.equal(kids[3].style.transform, 'translate(4px, 401px)', 'no se sale de la pantalla');
    assert.equal(kids[4].hidden, true);
    // un pin justo debajo de la esquina: el título sube a la orilla de la losa; si hay pin arriba y abajo, se oculta
    L.update([{visible: true, x: 30, y: 300}, {visible: false}, {visible: false}, {visible: false}, {visible: false}, {visible: false}], [{x: 60, y: 345}]);
    assert.equal(kids[0].style.transform, 'translate(30px, 282px)');
    L.update([{visible: true, x: 30, y: 300}, {visible: false}, {visible: false}, {visible: false}, {visible: false}, {visible: false}], [{x: 60, y: 345}, {x: 60, y: 299}]);
    assert.equal(kids[0].hidden, true);
  } finally { if (saved) Object.defineProperty(globalThis, 'document', saved); else delete globalThis.document; }
});

/* ---------- C5: parpadeo y falso positivo del desvanecido ---------- */
test('s19 C5: rayo cámara→oficina contra la caja del edificio (delante sí; detrás o a un lado no)', () => {
  const front = {min: [40, 0, 40], max: [60, 25, 60]};
  const behind = {min: [-60, 0, -60], max: [-40, 25, -40]};
  const side = {min: [80, 0, -60], max: [100, 25, -40]};
  const beside = {min: [22, 0, -10], max: [40, 25, 10]}; // pegado a la oficina, del lado contrario a la cámara de 315°
  const cam = [100, 40, 100];
  assert.ok(towerBlockCount(cam, front) > 0, 'delante → se desvanece');
  assert.equal(towerBlockCount(cam, behind), 0, 'detrás → se ve');
  assert.equal(towerBlockCount(cam, side), 0, 'a un lado → se ve');
  assert.equal(towerBlockCount(camAt(315, 140), beside), 0, 'junto a la oficina pero detrás de ella → se ve');
  assert.equal(segmentBoxEnter([0, 0, 0], [10, 0, 0], [20, -1, -1], [30, 1, 1]), Infinity);
});

test('s19 C5: histeresis en el borde y transición de 250 ms', () => {
  const t = {min: [40, 0, 40], max: [60, 25, 60]};
  // una cámara que roza la caja: con +0.5 m no prende, pero si ya estaba prendido con +2.5 m no se apaga
  let grazing = null;
  for (let x = 0; x < 60 && !grazing; x += .05) { const c = [100 + x, 40, 100 - x]; if (towerBlockCount(c, t, PAD_ON) === 0 && towerBlockCount(c, t, PAD_OFF) > 0) grazing = c; }
  assert.ok(grazing, 'hay banda de histeresis');
  assert.equal(towerOccludes(grazing, t, false), false);
  assert.equal(towerOccludes(grazing, t, true), true);
  assert.equal(FADE_MS, 250); assert.ok(FADE_OPACITY >= .15 && FADE_OPACITY <= .25); assert.equal(THROTTLE_MS, 100);
  let f = 0; for (let i = 0; i < 4; i++) f = stepFade(f, true, 62.5); assert.equal(f, 1);
  assert.equal(stepFade(1, false, 125), .5);
});

test('s19 C5: el shader no tiene ruido, ni tiempo, ni gl_FragCoord; por cuadro solo se escriben floats', () => {
  const code = occSrc.replace(/\/\*[^]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /gl_FragCoord|uTime|frameCount|fract\(52\.98/);
  const upd = occSrc.slice(occSrc.indexOf('function update(camera'), occSrc.indexOf('return {\n    materials'));
  assert.doesNotMatch(upd, /needsUpdate|onBeforeCompile|traverse|new THREE/);
  assert.match(upd, /now - lastCheck >= THROTTLE_MS/);
  assert.match(occSrc, /customProgramCacheKey = \(\) => 'occ-s19-/);
  assert.match(occSrc, /g\.depthWrite = false/);
  assert.match(scene, /if\(entorno\?\.group\.visible\)entorno\.occlusion\?\.update\(camera\);/);
});

test('s19 C5: entorno real — cada torre tiene su id, la oficina nunca queda tapada en 8 ángulos × 3 zooms y nada detrás se desvanece', async () => {
  const {createEntorno} = await import('../src/entorno2.js');
  const env = withFakeDocument(() => createEntorno('fusion', {quality: 'alta'}));
  const occ = env.occlusion;
  assert.ok(occ.towers.length >= 10, `torres: ${occ.towers.length}`);
  assert.ok(occ.ghosts > 0 && occ.materials.includes('towerGlass'));
  env.group.updateMatrixWorld(true);
  const towerMeshes = []; env.group.traverse((o) => { if (o.isMesh && !o.userData.ghost && o.geometry?.attributes?.aTower && !o.isInstancedMesh) towerMeshes.push(o); });
  const ray = new THREE.Raycaster(); const pts = [OFFICE_CENTER, [-13, 3, 0], [16, 3, 0], [1.5, 27, -9], [1.5, 27, 9], [1.5, 6, 9], [1.5, 6, -9]];
  const towerOfHit = (h) => { const a = h.object.geometry.attributes.aTower; const i = h.face ? h.face.a : h.index; return Math.round(a.getX(i)); };
  let blocked = [], falseFades = [], checked = 0;
  for (let az = 0; az < 360; az += 45) for (const dist of [40, 138, 300]) {
    const cam = camAt(az, dist); const camera = {position: new THREE.Vector3(...cam)};
    let now = 0; for (let k = 0; k < 6; k++) { occ.update(camera, now); now += 120; }
    const st = new Map(occ.towers.map((t) => [t.id, t.f]));
    for (const p of pts) {
      const P = new THREE.Vector3(...p), C = new THREE.Vector3(...cam), dir = P.clone().sub(C), len = dir.length(); dir.normalize();
      ray.set(C, dir); ray.far = len - .5; checked++;
      for (const h of ray.intersectObjects(towerMeshes, false)) { const id = towerOfHit(h); if (id > 0 && st.get(id) < 1) blocked.push({az, dist, id}); }
    }
    // falso positivo: una torre desvanecida debe estar entre la cámara y la caja de la oficina
    for (const t of occ.towers) if (t.f > 0) {
      const c = [(t.min[0] + t.max[0]) / 2, (t.min[1] + t.max[1]) / 2, (t.min[2] + t.max[2]) / 2];
      const dT = Math.hypot(c[0] - cam[0], c[1] - cam[1], c[2] - cam[2]), dO = Math.hypot(OFFICE_CENTER[0] - cam[0], OFFICE_CENTER[1] - cam[1], OFFICE_CENTER[2] - cam[2]);
      if (!(towerBlockCount(cam, t, PAD_OFF) > 0) || dT > dO + 20) falseFades.push({az, dist, id: t.id});
    }
  }
  assert.ok(checked >= 160);
  assert.deepEqual(blocked.slice(0, 5), [], `torres que tapan: ${blocked.length}`);
  assert.deepEqual(falseFades, []);
  // cámara quieta: sin nuevas comprobaciones ni cambios
  const camera = {position: new THREE.Vector3(...camAt(45, 300))}; let now = 1e6;
  for (let k = 0; k < 10; k++) { occ.update(camera, now); now += 120; }
  const a = JSON.stringify(occ.state().towers), checks = occ.state().checks;
  for (let k = 0; k < 20; k++) { occ.update(camera, now); now += 16; }
  assert.equal(JSON.stringify(occ.state().towers), a, 'quieta → idéntico');
  assert.equal(occ.state().checks, checks, 'quieta → no recalcula');
});
