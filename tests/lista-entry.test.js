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

test('lista has a clear Atrás control and does not use location.replace to leave', () => {
  const src = readFileSync(new URL('../src/lista-app.js', import.meta.url), 'utf8');
  assert.match(src, /lista-back/);
  assert.match(src, /← Atrás/);
  assert.match(src, /history\.pushState/);
  assert.match(src, /popstate/);
  assert.doesNotMatch(src, /location\.replace/);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /location\.assign/);
  assert.doesNotMatch(main, /location\.replace\(location\.pathname\+'\?abrir=lista'\)/);
});

test('scene view and floor changes animate the camera instead of copying instantly', () => {
  const src = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');
  assert.match(src, /VIEW_ANIM_MS\s*=\s*1050/);
  assert.match(src, /startCamTween/);
  assert.match(src, /easeInOutCubic/);
  assert.match(src, /fitCamera\(\{animate/);
  assert.match(src, /setView\(f=-1,\{animate=true\}=\{\}\)/);
});
