import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ENTORNO_KIND, entornoParam, entornoQualityFor, entornoVisibleFor, shadowBoxFor, fogFor, createFrameWatch} from '../src/entorno-config.js';

const scene = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');
const ent = readFileSync(new URL('../src/entorno2.js', import.meta.url), 'utf8');

// Canvas 2D de mentira: el entorno dibuja texturas procedurales, en node no hay GPU ni DOM.
function withFakeDocument(fn) {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const ctx = new Proxy({}, {get: (o, k) => (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => ({addColorStop() {}}) : k === 'getImageData' ? () => ({data: new Uint8ClampedArray(4)}) : k === 'measureText' ? () => ({width: 10}) : () => {}, set: () => true});
  Object.defineProperty(globalThis, 'document', {value: {createElement: () => ({width: 0, height: 0, getContext: () => ctx})}, configurable: true, writable: true});
  try { return fn(); } finally { if (saved) Object.defineProperty(globalThis, 'document', saved); else delete globalThis.document; }
}
const {createEntorno} = await import('../src/entorno2.js');
const build = (quality) => withFakeDocument(() => createEntorno(ENTORNO_KIND, {quality}));

test('s17: la app usa la fusión distrito + costa', () => {
  assert.equal(ENTORNO_KIND, 'fusion');
  assert.match(scene, /createEntorno\(ENTORNO_KIND/);
});

test('s17: parámetro ?entorno (apagar o forzar calidad)', () => {
  assert.deepEqual(entornoParam(''), {on: true, quality: null});
  assert.deepEqual(entornoParam('?entorno=0'), {on: false, quality: null});
  assert.deepEqual(entornoParam('?entorno=no'), {on: false, quality: null});
  assert.deepEqual(entornoParam('?entorno=baja'), {on: true, quality: 'baja'});
  assert.deepEqual(entornoParam('?entorno=alta&x=1'), {on: true, quality: 'alta'});
  assert.deepEqual(entornoParam('?entorno=raro'), {on: true, quality: null});
});

test('s17: calidad automática baja en equipos lentos', () => {
  assert.equal(entornoQualityFor({hardwareConcurrency: 8, deviceMemory: 8}), 'alta');
  assert.equal(entornoQualityFor({}), 'alta');
  assert.equal(entornoQualityFor({hardwareConcurrency: 4}), 'baja');
  assert.equal(entornoQualityFor({hardwareConcurrency: 8, deviceMemory: 2}), 'baja');
  assert.equal(entornoQualityFor({hardwareConcurrency: 8, connection: {saveData: true}}), 'baja');
});

test('s17: solo se ve en Edificio cerrado (no en Separación amplia, Plantas ni un piso abierto)', () => {
  assert.equal(entornoVisibleFor(-1, 'exterior'), true);
  assert.equal(entornoVisibleFor(-1, 'spread'), false);
  assert.equal(entornoVisibleFor(-1, 'stacked'), false);
  assert.equal(entornoVisibleFor(2, 'exterior'), false);
  assert.match(scene, /if\(entorno\)entorno\.group\.visible=entornoVisibleFor\(f,mode\)/);
});

test('s17: cámara de sombras amplia solo con entorno; las demás vistas no cambian', () => {
  assert.deepEqual(shadowBoxFor({entorno: true}), {left: -56, right: 56, top: 56, bottom: -50, far: 200});
  assert.deepEqual(shadowBoxFor({}), {left: -34, right: 34, top: 35, bottom: -30, far: 100});
  assert.deepEqual(shadowBoxFor({stacked: true, entorno: true}), {left: -60, right: 60, top: 62, bottom: -56, far: 170});
  assert.deepEqual(shadowBoxFor({spread: true, entorno: true}), {left: -50, right: 50, top: 52, bottom: -48, far: 140});
  assert.match(scene, /envOn\?shadowBoxFor\(\{entorno:true\}\):\{left:-34,right:34,top:35,bottom:-30,far:100\}/);
});

test('s17: la niebla empieza detrás del edificio y se apaga sin entorno', () => {
  const f = fogFor(60, {fogNear: 25, fogFar: 2.3});
  assert.equal(f.near, 85); assert.equal(f.far, 60 * 2.3 + 25);
  assert.ok(f.near > 60 + 20, 'el edificio (±20 del objetivo) queda fuera de la niebla');
  assert.ok(fogFor(60, {visible: false}).near >= 1e6);
});

test('s17: el vigía de cuadros avisa una sola vez cuando el equipo va lento', () => {
  const w = createFrameWatch({frames: 10, limitMs: 45});
  for (let i = 0; i < 10; i++) assert.equal(w(16), false);
  let fired = 0; for (let i = 0; i < 30; i++) if (w(80)) fired++;
  assert.equal(fired, 1);
  const w2 = createFrameWatch({frames: 5}); for (let i = 0; i < 5; i++) assert.equal(w2(5000), false, 'ignora saltos (pestaña oculta)');
  assert.match(scene, /entornoWatch=ep\.quality\?null:createFrameWatch\(\)/);
  assert.match(scene, /entorno\.setLowPower\(\)/);
});

test('s17: el entorno no entra al picking ni lo cambia el interruptor Vidrios', () => {
  assert.match(scene, /const roots=floorGroups\.filter\(g=>g\.visible\);if\(roof\.visible\)roots\.push\(roof\);/);
  const setWalls = scene.match(/setWalls\(v\)\{[^}]*\}/)[0];
  assert.doesNotMatch(setWalls, /entorno/);
});

test('s17: responde a Día/Noche/Auto por applyLighting', () => {
  const body = scene.slice(scene.indexOf('function applyLighting('), scene.indexOf('function setLighting('));
  assert.match(body, /entorno\?\.setNight\?\.\(!!p\.isNight\)/);
});

test('s17: fusión sin letrero «San Junipero» (t429u)', () => {
  assert.doesNotMatch(ent, /fillText|strokeText|'San Junipero'/, 'sin texto del letrero');
  assert.doesNotMatch(ent, /signPanel/);
  const e = build('alta');
  assert.equal(e.group.userData.neon, undefined);
  let signLike = 0; e.group.traverse((o) => { if (o.isMesh && o.material && o.material.fog === false) signLike++; });
  assert.equal(signLike, 0, 'no queda el panel luminoso del letrero (único material sin niebla)');
  assert.ok(!e.stats.byPiece.sign, 'sin pieza de letrero');
  e.setNight(true); e.setNight(false);
});

test('s17: costo del entorno dentro del presupuesto y «baja» más ligera', () => {
  const alta = build('alta'), baja = build('baja');
  assert.equal(alta.kind, 'fusion'); assert.equal(alta.quality, 'alta'); assert.equal(baja.quality, 'baja');
  assert.ok(alta.stats.triangles < 255000, `alta ${alta.stats.triangles}`);
  assert.ok(baja.stats.triangles < alta.stats.triangles * .85, `baja ${baja.stats.triangles} vs alta ${alta.stats.triangles}`);
  assert.ok(alta.stats.meshes < 100, 'pocas mallas (fusionadas por material)');
  assert.ok(alta.stats.instancedMeshes > 20, 'lo repetido va instanciado');
  assert.equal(alta.group.userData.decorative, true);
});

test('s17: modo bajo consumo quita sombras y piezas chicas', () => {
  const e = build('alta');
  assert.equal(e.setLowPower(), true); assert.equal(e.setLowPower(), false); assert.equal(e.isLowPower(), true);
  let cast = 0, hidden = 0; e.group.traverse((o) => { if (o.isMesh && o.castShadow) cast++; if (o.isMesh && !o.visible) hidden++; });
  assert.equal(cast, 0); assert.ok(hidden > 0);
});

test('s17: solo se publica la fusión (sin código muerto de otras variantes)', async () => {
  const {ENTORNO_KINDS} = await import('../src/entorno2.js');
  assert.deepEqual([...ENTORNO_KINDS], ['fusion']);
  for (const k of ['distrito', 'parque', 'barrio', 'costa', 'probe']) assert.doesNotMatch(ent, new RegExp(`kind === '${k}'`));
  assert.doesNotMatch(ent, /San Junipero'/);
  assert.doesNotMatch(ent, /houseRow|houseProtos|midrise\(/);
  assert.throws(() => withFakeDocument(() => createEntorno('costa')), RangeError);
});

test('s17: recorte de presupuesto: nada lejano de más', () => {
  const e = build('alta'); const THREEm = e.group; let far = 0;
  e.group.traverse((o) => { if (!o.isInstancedMesh) return; const n = o.name.split(':')[0]; if (!['farola', 'banca', 'camastro', 'sombrilla'].includes(n)) return;
    const a = o.instanceMatrix.array; for (let i = 0; i < o.count; i++) { const x = a[i * 16 + 12], z = a[i * 16 + 14]; if (Math.hypot(x, z) > 86) far++; } });
  assert.equal(far, 0);
});
