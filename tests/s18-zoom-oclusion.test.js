import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createFrameWatch} from '../src/entorno-config.js';

const scene = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');
const labels = readFileSync(new URL('../src/selection-labels.js', import.meta.url), 'utf8');
const ent = readFileSync(new URL('../src/entorno2.js', import.meta.url), 'utf8');
const cfg = readFileSync(new URL('../src/entorno-config.js', import.meta.url), 'utf8');

function withFakeDocument(fn) {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const ctx = new Proxy({}, {get: (o, k) => (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => ({addColorStop() {}}) : k === 'getImageData' ? () => ({data: new Uint8ClampedArray(4)}) : k === 'measureText' ? () => ({width: 10}) : () => {}, set: () => true});
  Object.defineProperty(globalThis, 'document', {value: {createElement: () => ({width: 0, height: 0, getContext: () => ctx})}, configurable: true, writable: true});
  try { return fn(); } finally { if (saved) Object.defineProperty(globalThis, 'document', saved); else delete globalThis.document; }
}

/* ---------- Bug 1: zoom en Edificio cerrado ---------- */
test('s18: límites de zoom de siempre (12…700) y zoom habilitado en Edificio cerrado', () => {
  assert.match(scene, /controls\.minDistance=12;controls\.maxDistance=700;/);
  assert.match(scene, /function syncStackControls\(\)\{[^}]*controls\.enableZoom=true;/);
  assert.match(scene, /o\.setLength\(THREE\.MathUtils\.clamp\(o\.length\(\)\*s,12,700\)\)/, 'botones + y − con el mismo tope');
  for (const src of [ent, cfg]) assert.doesNotMatch(src, /minDistance|maxDistance|enableZoom/, 'el entorno no toca los límites de la cámara');
  assert.match(scene, /getCameraInfo\(\)\{/);
});

test('s18: los pines ocultos en Edificio cerrado lejos ya no se comen el pellizco ni la rueda', () => {
  assert.match(labels, /const lejos = typeof document !== 'undefined' && document\.body\.classList\.contains\('v17lejos'\);/);
  assert.match(labels, /rec\.el\.style\.pointerEvents = \(blocked \|\| lejos\) \? 'none' : 'auto';/);
  assert.match(labels, /rec\.el\.style\.visibility = \(blocked \|\| lejos\) \? 'hidden' : '';/);
  assert.match(labels, /addEventListener\('wheel', e => \{[^}]*cv\.dispatchEvent\(new WheelEvent\('wheel', e\)\)/, 'la rueda sobre un pin visible pasa al 3D');
  // la regla lejos sigue en el CSS
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /body\.v17lejos \.v17pin\{opacity:0;pointer-events:none\}/);
});

test('s18: el vigía de rendimiento acepta cuadros de hasta 3 s', () => {
  const w = createFrameWatch({frames: 5, limitMs: 45});
  let fired = false; for (let i = 0; i < 5; i++) fired = w(1600) || fired;
  assert.equal(fired, true, 'a 0.6 fps ahora sí baja el detalle');
  const w2 = createFrameWatch({frames: 5}); for (let i = 0; i < 10; i++) assert.equal(w2(5000), false, 'pestaña oculta: se ignora');
});

/* ---------- Bug 2: oclusión — reemplazado en s19 por el desvanecido por edificio (ver s19-correcciones.test.js) ---------- */
