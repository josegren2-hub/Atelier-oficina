import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPizarronModel} from '../src/pizarron.js';

test('pizarrón locked without mando', () => {
  const m = buildPizarronModel({mando: null, waiting: [{id:'ted',name:'Ted'}], bots:[]});
  assert.equal(m.unlocked, false);
});

test('pizarrón unlocked aggregates audiencias, waiting and pendientes', () => {
  const mando = {
    generado: '2026-11-09T12:00:00Z',
    audiencias: {estado:'ok', items:[{hora:'10:00', titulo:'Junta', lugar:'Sala'}]},
    bots: [{id:'ted', pendientes:['Revisar A', {texto:'B'}]}, {id:'luna', pendientes:[]}],
  };
  const m = buildPizarronModel({
    mando,
    waiting: [{id:'luna', name:'Luna', status:'review', stale:false}],
    bots: [{id:'ted', name:'Ted'}, {id:'luna', name:'Luna'}],
  });
  assert.equal(m.unlocked, true);
  assert.equal(m.aud.length, 1);
  assert.equal(m.esp.length, 1);
  assert.equal(m.esp[0].nombre, 'Luna');
  assert.equal(m.pend.length, 2);
  assert.equal(m.pend[0].n, 'Ted');
});

test('pizarrón never invents audiencias when estado not ok', () => {
  const m = buildPizarronModel({
    mando: {generado:'x', audiencias:{estado:'error'}, bots:[]},
    waiting: [],
    bots: [],
  });
  assert.equal(m.aud.length, 0);
  assert.equal(m.audEstado, 'error');
});
