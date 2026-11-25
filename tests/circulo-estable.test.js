import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {
  OFFICE_BOX, CIRCLE_CONFIG, GROUND_KEYS, circuloParam, projectOfficeCircle,
} from '../src/entorno-occlusion.js';

const src = readFileSync(new URL('../src/entorno-occlusion.js', import.meta.url), 'utf8');

test('circuloParam: por defecto es C; ?circulo=a/b eligen; ?circulo=0 apaga', () => {
  assert.deepEqual(circuloParam(''), {enabled: true, variant: 'c'});
  assert.deepEqual(circuloParam('?entorno=alta'), {enabled: true, variant: 'c'});
  assert.deepEqual(circuloParam('?circulo=c'), {enabled: true, variant: 'c'});
  assert.deepEqual(circuloParam('?circulo=0'), {enabled: false, variant: 'c'});
  assert.deepEqual(circuloParam('?circulo=off'), {enabled: false, variant: 'c'});
  assert.deepEqual(circuloParam('?circulo=b'), {enabled: true, variant: 'b'});
  assert.deepEqual(circuloParam('?circulo=a'), {enabled: true, variant: 'a'});
  assert.deepEqual(circuloParam('?circulo=A'), {enabled: true, variant: 'a'});
});

test('el tramado de C es el de s18 pero fijo: IGN sobre floor(gl_FragCoord), sin tiempo', () => {
  assert.match(src, /floor\(gl_FragCoord\.xy\)/);
  assert.match(src, /fract\(52\.9829189 \* fract\(dot\(occP/);
  assert.equal(/uOccTime|uTime|iTime/.test(src), false);
  assert.match(src, /fragDist < uOccFar/);
  assert.match(src, /occD <= inner\) discard/);
  assert.ok(GROUND_KEYS.includes('asphalt') && GROUND_KEYS.includes('grass') && GROUND_KEYS.includes('water'));
  assert.ok(CIRCLE_CONFIG.opacity >= 0.15 && CIRCLE_CONFIG.opacity <= 0.25);
  assert.ok(CIRCLE_CONFIG.softness > 0);
  assert.ok(CIRCLE_CONFIG.boxPad >= 8);
  assert.ok(CIRCLE_CONFIG.margin >= 0.25);
  assert.ok(CIRCLE_CONFIG.band >= 0.15 && CIRCLE_CONFIG.band <= 0.35);
});

test('projectOfficeCircle: centro y radio estables y finitos de frente a la oficina', () => {
  const cam = new THREE.PerspectiveCamera(35, 390 / 844, 0.1, 1200);
  cam.position.set(40, 30, 43);
  cam.lookAt(0, 7, 0);
  cam.updateProjectionMatrix();
  const a = projectOfficeCircle(cam, 390, 844);
  const b = projectOfficeCircle(cam, 390, 844);
  assert.equal(a.visible, true);
  assert.equal(a.cx, b.cx); assert.equal(a.cy, b.cy); assert.equal(a.radius, b.radius);
  assert.equal(a.near, b.near); assert.equal(a.far, b.far);
  assert.ok(a.radius > 40);
  assert.ok(a.near > 1 && a.far > a.near);
  assert.ok(a.cx > 0 && a.cx < 390 && a.cy > 0 && a.cy < 844);
  // un poco más cerca: el círculo crece y la profundidad baja
  cam.position.set(24, 18, 26);
  cam.lookAt(0, 7, 0);
  cam.updateProjectionMatrix();
  const c = projectOfficeCircle(cam, 390, 844);
  assert.ok(c.visible && c.radius > a.radius);
  assert.ok(c.near < a.near);
});

test('projectOfficeCircle: la caja de la oficina queda dentro del círculo (con margen)', () => {
  const cam = new THREE.PerspectiveCamera(35, 390 / 844, 0.1, 1200);
  cam.position.set(-30, 22, -35);
  cam.lookAt(1.5, 14, 0);
  cam.updateProjectionMatrix();
  const c = projectOfficeCircle(cam, 390, 844);
  const {min, max} = OFFICE_BOX;
  const corners = [];
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) corners.push(new THREE.Vector3(x, y, z));
  for (const p of corners) {
    p.project(cam);
    const sx = (p.x * 0.5 + 0.5) * 390, sy = (p.y * 0.5 + 0.5) * 844;
    const d = Math.hypot(sx - c.cx, sy - c.cy);
    assert.ok(d <= c.radius + 1e-3, `esquina a ${d.toFixed(1)} px, radio ${c.radius.toFixed(1)}`);
  }
});

test('s21: el círculo acolchado es más grande que la caja pelada y la envuelve', () => {
  const cam = new THREE.PerspectiveCamera(35, 390 / 844, 0.1, 1200);
  cam.position.set(0, 14, 80);
  cam.lookAt(1.5, 14, 0);
  cam.updateProjectionMatrix();
  const tight = projectOfficeCircle(cam, 390, 844, {margin: 0, boxPad: 0, minRadiusPx: 1});
  const wide = projectOfficeCircle(cam, 390, 844); // defaults with pad + margin
  assert.ok(wide.visible && tight.visible);
  assert.ok(wide.radius > tight.radius * 1.15, `wide ${wide.radius} vs tight ${tight.radius}`);
});
