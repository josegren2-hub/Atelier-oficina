import test from 'node:test';
import assert from 'node:assert/strict';
import {horaChihuahua, isNightHour, luzHora, resolveLighting, cycleLightPref, readLightPref, saveLightPref} from '../src/daylight.js';

test('isNightHour covers 19–7', () => {
  assert.equal(isNightHour(19), true);
  assert.equal(isNightHour(2), true);
  assert.equal(isNightHour(12), false);
});

test('luzHora interpolates morning to midday', () => {
  const a = luzHora(7);
  const b = luzHora(11);
  assert.equal(a.fase, 'mañana');
  assert.equal(b.fase, 'mediodía');
  assert.ok(a.sun > 0 && b.sun > 0);
});

test('resolveLighting respects manual noche/dia/auto', () => {
  assert.equal(resolveLighting('noche', new Date('2026-11-09T12:00:00Z')).isNight, true);
  assert.equal(resolveLighting('dia', new Date('2026-11-09T03:00:00Z')).isNight, false);
  assert.equal(cycleLightPref('auto'), 'noche');
});

test('light pref storage', () => {
  const s = {store: {}, getItem(k){return this.store[k]??null;}, setItem(k,v){this.store[k]=String(v);}};
  saveLightPref('noche', s);
  assert.equal(readLightPref(s), 'noche');
});
