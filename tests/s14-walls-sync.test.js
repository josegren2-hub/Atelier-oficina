import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {wallsShouldBeOnAfterViewChange, syncWalls} from '../src/walls-sync.js';

const src = join(dirname(fileURLToPath(import.meta.url)), '../src/main.js');

test('pasar a Edificio cerrado enciende la fachada aunque la casilla estuviera apagada', () => {
  assert.equal(wallsShouldBeOnAfterViewChange('exterior', false), true);
  assert.equal(wallsShouldBeOnAfterViewChange('exterior', true), true);
});

test('Separación amplia y Plantas respetan la casilla (no la fuerzan)', () => {
  assert.equal(wallsShouldBeOnAfterViewChange('stacked', false), false);
  assert.equal(wallsShouldBeOnAfterViewChange('stacked', true), true);
  assert.equal(wallsShouldBeOnAfterViewChange('spread', false), false);
  assert.equal(wallsShouldBeOnAfterViewChange('spread', true), true);
});

test('syncWalls escribe el mismo valor en la casilla y en setWalls', () => {
  const seen = {};
  const on = syncWalls({
    on: true,
    setChecked: v => { seen.checked = v; },
    setWalls: v => { seen.walls = v; },
  });
  assert.equal(on, true);
  assert.equal(seen.checked, true);
  assert.equal(seen.walls, true);
  syncWalls({on: false, setChecked: v => { seen.checked = v; }, setWalls: v => { seen.walls = v; }});
  assert.equal(seen.checked, false);
  assert.equal(seen.walls, false);
});

test('al tocar Edificio cerrado, main.js sincroniza casilla y setWalls (no solo .checked)', () => {
  const text = readFileSync(src, 'utf8');
  assert.equal(text.includes("$('#walls').checked=true"), false);
  assert.match(text, /wallsShouldBeOnAfterViewChange/);
  assert.match(text, /syncWalls\(/);
  assert.match(text, /setWalls:v=>office\?\.setWalls\(v\)/);
});
