import test from 'node:test';
import assert from 'node:assert/strict';
import {chatHref, copyAndOpenChat, QUICK_REPLIES} from '../src/quick-replies.js';

test('chatHref builds grokbot deep link', () => {
  assert.match(chatHref('abc-123'), /^grokbot:\/\/app\/v1\/agent\?id=abc-123$/);
  assert.equal(chatHref(null), null);
});

test('copyAndOpenChat copies then opens', async () => {
  const writes = [];
  const opens = [];
  const r = await copyAndOpenChat({
    agente: 'x',
    text: 'OK, adelante',
    clipboard: {writeText: async (t) => writes.push(t)},
    open: (u) => opens.push(u),
  });
  assert.equal(r.ok, true);
  assert.deepEqual(writes, ['OK, adelante']);
  assert.match(opens[0], /grokbot:/);
  assert.equal(QUICK_REPLIES.length, 3);
});
