import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PIN, pinBox, rectsOverlap, pinBlockedByChrome, CHROME_SELECTORS, shouldPaintPins} from '../src/selection-labels.js';

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../src/selection-labels.js', import.meta.url), 'utf8');

test('s16: PIN es la opción B del boceto (foto 20.5, letra 9, etiqueta 13×47, puntito 5, toque 44)', () => {
  assert.equal(PIN.size, 20.5);
  assert.equal(PIN.fontPx, 9);
  assert.equal(PIN.labelH, 13);
  assert.equal(PIN.labelMaxW, 47);
  assert.equal(PIN.labelPadX, 7);
  assert.equal(PIN.dotR, 2.5);
  assert.equal(PIN.border, 1.75);
  assert.equal(PIN.nameGap, 14);
  assert.equal(PIN.nameW, 48);
  assert.equal(PIN.nameHBox, 17);
  assert.equal(PIN.touchMin, 44);
  assert.ok(PIN.fontPx >= 9, 'la letra no baja del piso de 9 px');
  assert.equal(PIN.dotR * 2, 5);
});

test('s16: pinBox incluye la zona de toque mínima de 44 px', () => {
  const box = pinBox({x: 200, y: 400});
  assert.equal(box.w, Math.max(PIN.size, PIN.nameW, PIN.touchMin));
  assert.equal(box.h, Math.max(PIN.size + PIN.nameHBox, PIN.touchMin));
  assert.equal(box.w, 48);
  assert.equal(box.h, 44);
  assert.equal(box.x, 200 - 48 / 2);
  assert.equal(box.y, 400 - 44);
  const menu = {x: 40, y: 700, w: 310, h: 90};
  const under = pinBox({x: 120, y: 760});
  const open = pinBox({x: 200, y: 400});
  assert.equal(rectsOverlap(under, menu), true);
  assert.equal(pinBlockedByChrome(under, [menu]), true);
  assert.equal(pinBlockedByChrome(open, [menu]), false);
  assert.ok(CHROME_SELECTORS.includes('#vista-toolbar'));
  assert.ok(CHROME_SELECTORS.includes('#dock'));
});

test('s16: al abrir un menú se pinta una vez para ocultar pines; luego se congela', () => {
  assert.equal(shouldPaintPins(false, false), true);
  assert.equal(shouldPaintPins(true, false), true);
  assert.equal(shouldPaintPins(true, true), false);
  assert.equal(shouldPaintPins(false, true), true);
});

test('s16: con el menú abierto se reusa la posición y se sigue ocultando bajo el chrome', () => {
  assert.match(js, /opts\.reuse && lastProjected\.length/);
  assert.match(js, /startHideLoop/);
  assert.match(js, /paint\(\{ reuse: true \}\)/);
});

test('s16: el canvas pinta con las medidas B y no deja los 34/10 px de s15', () => {
  assert.match(js, /const size = PIN\.size/);
  assert.match(js, /700 \$\{PIN\.fontPx\}px/);
  assert.match(js, /PIN\.labelMaxW/);
  assert.match(js, /PIN\.labelH/);
  assert.match(js, /PIN\.dotR/);
  assert.match(js, /PIN\.border/);
  assert.equal(/const size = 34/.test(js), false);
  assert.equal(/700 10px Inter/.test(js), false);
  assert.equal(/size = 34, nameW = 80/.test(js), false);
  assert.equal(/Math\.min\(78,/.test(js), false);
  assert.equal(/arc\([^)]+4\.5,/.test(js), false);
});

test('s16: CSS de la foto, letra, etiqueta, puntito y toque mínimo 44×44', () => {
  assert.match(css, /s16 \(Rob t424u\)/);
  assert.match(css, /\.v17pin\.v21\{min-width:44px;min-height:44px/);
  assert.match(css, /\.v17pin\.v21 img\{width:20\.5px!important;height:20\.5px!important;border:1\.75px solid/);
  assert.match(css, /\.v17pin\.v21 em\{display:block!important;font:700 9px\/1\.2 Inter/);
  assert.match(css, /\.v17pin\.v21 em\{[^}]*max-width:47px/);
  assert.match(css, /\.v17pin\.v21 \.sd\{top:14px;right:-1px;width:5px;height:5px\}/);
  // no se quedan las medidas de s15 en las reglas v21
  assert.equal(/\.v17pin\.v21 img\{width:34px!important/.test(css), false);
  assert.equal(/font:700 10px\/1\.2 Inter,system-ui,sans-serif!important/.test(css), false);
  assert.equal(/\.v17pin\.v21 em\{[^}]*max-width:78px/.test(css), false);
  assert.equal(/\.v17pin\.v21 \.sd\{top:24px;right:-1px;width:9px;height:9px\}/.test(css), false);
});

test('s16: los pines siguen debajo del menú de vistas, el encabezado y el dock', () => {
  assert.match(css, /\.capa-sel\{[^}]*z-index:18/);
  assert.match(css, /\.capa-sel-draw\{[^}]*z-index:19/);
  assert.match(css, /#canvas-container #vista-toolbar\.vista-toolbar\{[^}]*z-index:30/);
  assert.match(css, /#dock\.dock\{[^}]*z-index:50/);
  assert.match(css, /#app>header\.chrome-top,#app>header\{[^}]*z-index:40/);
  const pinZ = 19;
  assert.ok(30 > pinZ && 40 > pinZ && 50 > pinZ);
});
