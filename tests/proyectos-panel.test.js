import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProyecto, PROYECTO_STATUSES, loadProyectosEnc} from '../src/proyectos-panel.js';

test('proyecto statuses include the five approved labels', () => {
  for (const s of ['En curso', 'Esperando a Rob', 'En pausa', 'Terminado', 'Descartado']) {
    assert.ok(PROYECTO_STATUSES.includes(s));
  }
});

test('normalizeProyecto drops empty names and maps unknown status', () => {
  assert.equal(normalizeProyecto({}), null);
  assert.equal(normalizeProyecto({nombre: 'Alpha', estado: 'weird'}).estado, 'En curso');
  assert.equal(normalizeProyecto({nombre: 'Beta', estado: 'Esperando a Rob'}).estado, 'Esperando a Rob');
});

test('loadProyectosEnc returns locked without key and missing on 404', async () => {
  const locked = await loadProyectosEnc({key: null});
  assert.equal(locked.state, 'locked');
  const missing = await loadProyectosEnc({
    key: {},
    fetchImpl: async () => ({ok: false, status: 404, json: async () => ({})}),
  });
  assert.equal(missing.state, 'missing');
});

test('source never embeds project names or draft paths', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../src/proyectos-panel.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /proyectos-borrador/);
  assert.doesNotMatch(src, /Proyecto Alpha/);
});
