import test from 'node:test';
import assert from 'node:assert/strict';
import {createDeskProp} from '../src/desk-props.js';

test('each known bot id builds a desk prop group', async () => {
  const ids = ['ted','luna','julian','ines','mateo','tr-editor','tr-cm','tadeo','vale','emiliano','ceo','apps','libro','rulo','director','luca'];
  for (const id of ids) {
    const g = createDeskProp(id);
    assert.ok(g.children.length >= 1, id);
  }
});
