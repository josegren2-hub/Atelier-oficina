import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VERSION_RE} from '../src/release-notice.js';
import {wallsFacadeApplies, wallsShouldBeOnAfterViewChange, syncWalls} from '../src/walls-sync.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'src/style.css'), 'utf8');
const main = readFileSync(join(root, 'src/main.js'), 'utf8');

test('VERSION_RE reconoce 0.22.7s15-prueba', () => {
  assert.equal(VERSION_RE.test('0.22.7s15-prueba'), true);
  assert.equal(VERSION_RE.test('0.22.7s14-prueba'), true);
  assert.equal(VERSION_RE.test('0.22.7'), true);
  assert.equal(VERSION_RE.test('0.22.8'), true);
});

test('Vidrios está en la hilera de vistas como interruptor, no como una cuarta vista', () => {
  const modes = html.slice(html.indexOf('id="view-modes"'), html.indexOf('class="controls"'));
  assert.match(modes, /id="vidrios-toggle"/);
  assert.match(modes, /role="switch"/);
  assert.match(modes, />Vidrios</);
  assert.match(modes, /class="vidrios-sep"/);
  assert.equal(/data-view="vidrios"/.test(modes), false);
  assert.equal((modes.match(/data-view="/g) || []).length, 3);
});

test('la fachada aplica solo con el edificio completo', () => {
  assert.equal(wallsFacadeApplies(-1), true);
  assert.equal(wallsFacadeApplies(0), false);
  assert.equal(wallsFacadeApplies(3), false);
});

test('el arreglo s14 de Edificio cerrado se mantiene', () => {
  assert.equal(wallsShouldBeOnAfterViewChange('exterior', false), true);
  assert.equal(wallsShouldBeOnAfterViewChange('stacked', false), false);
  assert.equal(main.includes("$('#walls').checked=true"), false);
  assert.match(main, /applyWallsFromUi/);
  assert.match(main, /syncVidriosUi/);
  assert.match(main, /#vidrios-toggle/);
});

test('CSS s15: grupo bajado con safe-area, mismo formato de pastilla, mando #bcd9ec, sin agrandar', () => {
  assert.match(css, /bottom:calc\(39px \+ env\(safe-area-inset-bottom,0px\)\)!important/);
  assert.match(css, /#canvas-container #vista-toolbar \.controls\{order:2!important\}/);
  assert.match(css, /#vidrios-toggle\[aria-checked="true"\] \.knob::after\{/);
  assert.match(css, /background:#bcd9ec/);
  // no se agrandan los botones de vista en s15 (el boceto rechazado subía a 14px / 29-34px)
  const s15 = css.slice(css.indexOf('/* s15:'));
  assert.equal(/font:\s*500 14px/.test(s15), false);
  assert.equal(/min-height:\s*34px/.test(s15), false);
  assert.equal(/min-height:\s*29px/.test(s15), false);
  // el interruptor sí usa 24 px, el tamaño actual de las vistas
  assert.match(s15, /#vidrios-toggle\{[\s\S]*min-height:24px!important/);
});

test('syncWalls sigue escribiendo casilla y modelo a la vez', () => {
  const seen = {};
  syncWalls({on: true, setChecked: v => { seen.c = v; }, setWalls: v => { seen.w = v; }});
  assert.deepEqual(seen, {c: true, w: true});
});
