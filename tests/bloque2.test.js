import test from 'node:test';
import assert from 'node:assert/strict';
import {clipPhrase, dedupeFactRows} from '../src/text-clip.js';
import {assignLanes} from '../src/pizarron.js';
import {normalizeProyecto, responsableIds} from '../src/proyectos-panel.js';

test('clipPhrase never cuts mid-word and keeps short text', () => {
  assert.equal(clipPhrase('Hola Rob.'), 'Hola Rob.');
  const long = 'Ya quedó lista la nota de hoy con fotos y fuentes verificadas. Después sigo con la portada y el resto de detalles pendientes del número.';
  const c = clipPhrase(long, 80);
  assert.ok(c.length <= 81);
  assert.equal(c, 'Ya quedó lista la nota de hoy con fotos y fuentes verificadas.');
  const nosent = 'palabra '.repeat(40);
  assert.match(clipPhrase(nosent, 60), /palabra…$/);
});

test('dedupeFactRows keeps one row when activity equals current task', () => {
  const rows = [['Actividad ahora', 'Va a revisar', 'activity'], ['Tarea actual', 'Va a revisar ', 'current']];
  assert.deepEqual(dedupeFactRows(rows).map(r => r[2]), ['activity']);
  const diff = [['A', 'x', 'activity'], ['T', 'Haciendo correcciones', 'current']];
  assert.equal(dedupeFactRows(diff).length, 2);
});

test('assignLanes puts overlapping events side by side', () => {
  const ev = [{start: 540, dur: 60}, {start: 540, dur: 60}, {start: 570, dur: 30}, {start: 660, dur: 60}];
  assignLanes(ev);
  assert.equal(ev[0].lanes, 3); assert.equal(ev[1].lanes, 3); assert.equal(ev[2].lanes, 3);
  assert.deepEqual(new Set(ev.slice(0, 3).map(e => e.lane)), new Set([0, 1, 2]));
  assert.equal(ev[3].lanes, 1); assert.equal(ev[3].lane, 0);
});

test('proyectos keep responsables and map only real office bots', () => {
  const p = normalizeProyecto({nombre: 'X', bots: ['Mateo', 'Apps (Charly)', 'por confirmar', 'Rob', 'Tommy · CEO Digital']});
  const office = [{id: 'mateo', name: 'Mateo'}, {id: 'apps', name: 'Charly'}, {id: 'ceo', name: 'Tommy'}];
  assert.deepEqual(responsableIds(p.bots, office), ['mateo', 'apps', 'ceo']);
});
