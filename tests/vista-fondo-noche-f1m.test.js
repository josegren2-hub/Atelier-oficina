import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {LIGHTING} from '../src/view-layout.js';

const sceneSrc = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const apply = sceneSrc.slice(sceneSrc.indexOf('function aplicarFondoEscena('), sceneSrc.indexOf('function setLighting('));
const setView = sceneSrc.slice(sceneSrc.indexOf('function setView('), sceneSrc.indexOf('function setMode('));

test('F1m: en noche, el fondo, la niebla y el clearColor se pintan juntos y son oscuros', () => {
  assert.match(apply, /function aplicarFondoEscena\(/);
  assert.match(apply, /renderer\.setClearColor\(color,1\)/);
  assert.match(apply, /scene\.fog\.color\.copy\(color\)/);
  assert.equal(LIGHTING.night.background, 0x080f20);
  const scene = {fog: {color: new THREE.Color(0xffffff)}};
  const calls = [];
  const renderer = {setClearColor: (c, a) => calls.push([c.getHex(), a])};
  const fn = new Function('THREE', 'LIGHTING', 'scene', 'renderer', `${apply}; return aplicarFondoEscena;`);
  const run = fn(THREE, LIGHTING, scene, renderer);
  const color = run(LIGHTING.night.background);
  assert.equal(color.getHex(), LIGHTING.night.background);
  assert.equal(scene.background.getHex(), LIGHTING.night.background);
  assert.equal(scene.fog.color.getHex(), LIGHTING.night.background);
  assert.deepEqual(calls, [[LIGHTING.night.background, 1]]);
});

test('F1m: en día el fondo se queda claro, y al cambiar de vista no se fuerza el día', () => {
  const scene = {fog: {color: new THREE.Color(0x000000)}};
  const calls = [];
  const renderer = {setClearColor: (c, a) => calls.push([c.getHex(), a])};
  const fn = new Function('THREE', 'LIGHTING', 'scene', 'renderer', `${apply}; return aplicarFondoEscena;`);
  const run = fn(THREE, LIGHTING, scene, renderer);
  run(LIGHTING.day.background);
  assert.equal(scene.background.getHex(), LIGHTING.day.background);
  assert.ok(scene.background.getHex() !== LIGHTING.night.background);
  run(LIGHTING.dusk.background);
  assert.equal(scene.background.getHex(), LIGHTING.dusk.background);
  assert.match(setView, /if\(scene\.background\)aplicarFondoEscena\(scene\.background\);if\(animate!==false\)flushView\(\)/);
  assert.doesNotMatch(setView, /setNight\(false\)|isNight:\s*false/);
});

test('F1m: el CSS de noche cubre el lienzo sin depender de :has(#night:checked)', () => {
  assert.match(css, /html\[data-theme="night"\] #viewport,html\[data-theme="night"\] #canvas-container\{background:#080f20!important\}/);
  const dayRule = css.slice(css.indexOf('html[data-theme="day"] #viewport{'));
  assert.match(dayRule, /#e7f0f8,#c5d6e8/);
});
