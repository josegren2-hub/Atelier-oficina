import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('ficha-flotante module exports mountFichaFlotante and keeps card compact', () => {
  const src = fs.readFileSync(new URL('../src/ficha-flotante.js', import.meta.url), 'utf8');
  assert.match(src, /export function mountFichaFlotante/);
  assert.match(src, /ficha-flotante/);
  assert.match(src, /getProjected/);
  assert.doesNotMatch(src, /showModal/);
});

test('css keeps ficha flotante as compact frosted card', () => {
  const css = fs.readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.ficha-flotante\{/);
  assert.match(css, /max-height:min\(60dvh/);
  assert.match(css, /--glass-blur:blur\(20px\)/);
});
