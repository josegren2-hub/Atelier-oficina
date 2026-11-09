import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('bootstrap routes lista without importing main/three eagerly', () => {
  const boot = readFileSync(new URL('../src/bootstrap.js', import.meta.url), 'utf8');
  assert.match(boot, /lista-app/);
  assert.match(boot, /main\.js/);
  assert.doesNotMatch(boot, /from 'three'/);
});

test('lista-app does not import three or scene', () => {
  const src = readFileSync(new URL('../src/lista-app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /three/);
  assert.doesNotMatch(src, /createOffice|from '\.\/scene/);
  assert.match(src, /Solo lista/);
});
