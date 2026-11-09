import test from 'node:test';
import assert from 'node:assert/strict';
import {mapOficinaEstado, validateSnapshot} from '../src/adapter.js';
import {bots} from '../src/data.js';

test('mapOficinaEstado passes public salud without topic', () => {
  const known = bots.map(b => b.id);
  const payload = {
    actualizado: '2026-11-09T12:00:00-06:00',
    bots: known.map(id => ({id, estado: 'pausa', frase: ''})),
    salud: {
      latido: '2026-11-09T12:00:00-06:00',
      mando: '2026-11-07T20:25:01-06:00',
      avisos_ok: '2026-11-07T16:51:28-06:00',
      avisos_error: null,
      avisos_config: true,
      tema: 'NO-DEBE-PASAR',
    },
  };
  const mapped = mapOficinaEstado(payload, known);
  assert.equal(mapped.salud.avisos_config, true);
  assert.equal(mapped.salud.avisos_ok, '2026-11-07T16:51:28-06:00');
  assert.equal(mapped.salud.tema, undefined);
  const live = validateSnapshot(mapped, known, Date.parse('2026-11-09T12:30:00-06:00'));
  assert.equal(live.salud.avisos_config, true);
});
