import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSheetManager} from '../src/ui-sheets.js';
import {todayMessageRows, horaCorta} from '../src/resumen-panel.js';
import {viewVolumes, viewDirection} from '../src/view-layout.js';
import {fitVolumes} from '../src/camera-fit.js';
import * as THREE from 'three';

test('sheet manager keeps a single sheet open', () => {
  const open = {a: false, b: false};
  const sheets = createSheetManager();
  sheets.register('a', {open: () => { open.a = true; }, close: () => { open.a = false; }, isOpen: () => open.a});
  sheets.register('b', {open: () => { open.b = true; }, close: () => { open.b = false; }, isOpen: () => open.b});
  sheets.open('a');
  assert.equal(open.a, true);
  sheets.open('b');
  assert.equal(open.a, false);
  assert.equal(open.b, true);
  assert.equal(sheets.toggle('b'), false);
  assert.equal(open.b, false);
});

test('today messages are plain language, sorted, no hour squares', () => {
  assert.equal(horaCorta(19), '7 pm');
  assert.equal(horaCorta(7), '7 am');
  const mando = {bots: [
    {id: 'luna', horas_hoy: Array.from({length: 24}, (_, i) => i === 10 ? 2 : 0)},
    {id: 'ted', horas_hoy: Array.from({length: 24}, (_, i) => i === 19 ? 7 : 0)},
    {id: 'mateo', horas_hoy: Array.from({length: 24}, () => 0)},
  ]};
  const rows = todayMessageRows(mando, {ted: {name: 'Ted'}, luna: {name: 'Luna'}, mateo: {name: 'Mateo'}});
  assert.equal(rows[0].name, 'Ted');
  assert.equal(rows[0].total, 7);
  assert.equal(rows[0].lastLabel, '7 pm');
  assert.ok(rows[0].bar >= rows[1].bar);
  const src = readFileSync(new URL('../src/resumen-panel.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /Cada cuadro es una hora/);
  assert.doesNotMatch(src, /v16tl/);
});

test('header keeps a single Resumen access on the dock', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /id="resumen-open"/);
  assert.match(html, /id="dock-resumen"/);
  assert.match(html, /id="racha-open"/);
  assert.match(html, /id="demo-salir"/);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /\$\('#racha-open'\)\?\.addEventListener\('click'/);
  assert.match(main, /bindChromeNow/);
  assert.match(main, /from '\.\/ui-chrome\.js'/);
  assert.match(main, /equipo-abierto/);
});

test('Lista uses the compact glass card, not a green modal', () => {
  const js = readFileSync(new URL('../src/lista-app.js', import.meta.url), 'utf8');
  assert.match(js, /lista-ficha-card/);
  assert.match(js, /glass-card/);
  assert.doesNotMatch(js, /showModal/);
  assert.match(js, /closeListaFicha/);
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /\.lista-ficha\{[^}]*#13201d/);
});

test('Consulta tabs are a compact scrollable chip row', () => {
  const css = readFileSync(new URL('../src/command-center.css', import.meta.url), 'utf8');
  assert.match(css, /\.cc-dialog \.cc-nav\{[^}]*flex-wrap:nowrap/);
  assert.match(css, /overflow-x:auto/);
  assert.doesNotMatch(css, /\.cc-nav\{[^}]*grid-template-columns:repeat\(2/);
});

test('demo exit is in the banner and demo is not persisted', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /function exitDemo/);
  assert.match(main, /demo-salir/);
  assert.doesNotMatch(main, /localStorage\.setItem\(['"]atelierDemo/);
  assert.match(main, /let snapshot=disconnectedSnapshot\(\)/);
});

for (const [w, h] of [[390, 500], [1280, 700]]) test(`isolated floor fills most of the canvas ${w}x${h}`, () => {
  const volumes = viewVolumes('exterior', 0);
  const fit = fitVolumes(volumes, w / h, h, 35, viewDirection('exterior', 0));
  const c = new THREE.PerspectiveCamera(35, w / h, .1, 1200);
  c.position.copy(fit.position); c.lookAt(fit.center); c.updateProjectionMatrix(); c.updateMatrixWorld();
  const points = [];
  for (const [min, max] of volumes) for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
    const p = new THREE.Vector3(x, y, z).project(c);
    assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && p.z < 1, `corner out of view ${p.x},${p.y}`);
    points.push(p);
  }
  const slab = [];
  for (const [min, max] of volumes) for (const x of [min[0], max[0]]) for (const z of [min[2], max[2]]) {
    slab.push(new THREE.Vector3(x, min[1], z).project(c));
  }
  const span = Math.max(...slab.map(p => p.x)) - Math.min(...slab.map(p => p.x));
  assert.ok(span >= 1.70, `width span ${span} should be >= 85%`);
  assert.ok(span <= 1.98, `width span ${span} should stay inside the frame`);
});


test('C16 view controls stay at the bottom of the canvas, not under the floor tabs', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  const floors = html.indexOf('id="floors"');
  const canvas = html.indexOf('id="canvas-container"');
  const bar = html.indexOf('id="vista-toolbar"');
  const modes = html.indexOf('id="view-modes"');
  const navClose = html.indexOf('</aside>', floors);
  assert.ok(canvas >= 0 && bar > canvas && modes > bar, 'view controls should live in the canvas toolbar');
  assert.ok(navClose > 0 && bar > navClose, 'toolbar must not sit in the top navigation under the floor tabs');
  assert.match(css, /#canvas-container #vista-toolbar\.vista-toolbar\{[\s\S]*bottom:calc\(var\(--dock-h\)/);
  assert.match(css, /Nothing new in the top area/);
});

test('C17 floor pins are always the compact chico size', () => {
  const js = readFileSync(new URL('../src/selection-labels.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(js, /v17pin chico/);
  assert.doesNotMatch(js, /item\.small \? ' chico'/);
  assert.match(css, /\.v17pin img,\s*\.v17pin\.chico img\{width:24px!important/);
});

test('C18 textual Consulta values stay normal size', () => {
  const js = readFileSync(new URL('../src/command-center.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/command-center.css', import.meta.url), 'utf8');
  assert.match(js, /cc-summary-word/);
  assert.match(css, /dd\.cc-summary-word\{[\s\S]*font-size:13px/);
});

test('C19 ficha source is a compact muted line', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /#detail #detail-source[\s\S]*padding:0!important/);
  assert.match(css, /#detail #detail-source[\s\S]*background:transparent!important/);
  assert.match(css, /#detail #detail-source[\s\S]*font-size:10px!important/);
});

test('s9d pins stay on each avatar: no +N cluster, overlay on the canvas, same-frame projection', () => {
  const js = readFileSync(new URL('../src/selection-labels.js', import.meta.url), 'utf8');
  const scene = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.doesNotMatch(js, /groups\.find/);
  assert.doesNotMatch(js, /class="mas"/);
  assert.match(css, /\.capa-sel\{position:absolute;/);
  assert.match(main, /container:\$\('#canvas-container'\)/);
  assert.match(scene, /rect\.left-crect\.left/);
  assert.match(scene, /applyStackDeltaY\(world,true\)/);
});

test('s9e pins keep moving during touch: 2D canvas layer, no contain:strict, SW reload', () => {
  const js = readFileSync(new URL('../src/selection-labels.js', import.meta.url), 'utf8');
  const scene = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');
  const boot = readFileSync(new URL('../src/bootstrap.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(js, /capa-sel-draw/);
  assert.match(js, /paintCanvas\(/);
  assert.match(css, /contain:size layout/);
  assert.doesNotMatch(css, /#canvas-container[^{]*contain:strict/);
  assert.match(boot, /controllerchange/);
});

test('s9f: no heavy touch paint, v17lejos hides pin canvas, stack pan does not flush sync', () => {
  const js = readFileSync(new URL('../src/selection-labels.js', import.meta.url), 'utf8');
  const scene = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.doesNotMatch(scene, /touchGuard/);
  assert.doesNotMatch(scene, /addEventListener\('change'/);
  assert.doesNotMatch(scene, /addEventListener\('touchstart'/);
  assert.doesNotMatch(scene, /addEventListener\('touchmove'/);
  assert.match(css, /body\.v17lejos \.capa-sel-draw/);
  assert.match(css, /\.capa-sel-draw\{[^}]*pointer-events:none/);
  assert.match(js, /classList\.contains\('v17lejos'\)/);
  const pm = scene.slice(scene.indexOf("addEventListener('pointermove'"));
  const block = pm.slice(0, pm.indexOf("addEventListener('pointerup'"));
  assert.match(block, /applyStackDeltaY\(world\)/);
  assert.doesNotMatch(block, /applyStackDeltaY\(world,true\)/);
});
