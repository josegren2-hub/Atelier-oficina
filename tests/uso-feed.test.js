import test from 'node:test';
import assert from 'node:assert/strict';
import {mapBotName, normalizeUso, usoLine, formatActualizado, formatMandoUso, displayUsoLine} from '../src/uso-feed.js';
import {encryptEncJson, deriveMandoKey, decryptEncJson, assertEncEnvelope} from '../src/crypto-mando.js';

test('mapBotName matches id and accent-insensitive names, drops unknowns', () => {
  assert.equal(mapBotName('ted')?.id, 'ted');
  assert.equal(mapBotName('Julián')?.id, 'julian');
  assert.equal(mapBotName('Julian')?.id, 'julian');
  assert.equal(mapBotName('no-existe'), null);
});

test('normalizeUso keeps percentages only, sorts, never invents rows', () => {
  const uso = normalizeUso({
    semana_pct: 37.4,
    actualizado: '2026-11-09T12:00:00-06:00',
    bots: [
      {nombre: 'Ted', pct: 12},
      {nombre: 'Luna', pct: 40},
      {nombre: 'Inventado', pct: 99},
      {nombre: 'Ted', pct: 3},
    ],
  });
  assert.equal(uso.semana_pct, 37.4);
  assert.deepEqual(uso.bots.map(b => b.id), ['luna', 'ted']);
  assert.equal(uso.bots[0].pct, 40);
  assert.equal(uso.bots[1].pct, 12);
});

test('usoLine states never invent a number', () => {
  assert.equal(usoLine({state: 'locked'}, 'ted'), 'Solo con el mando desbloqueado');
  assert.equal(usoLine({state: 'missing'}, 'ted'), 'Aún sin datos');
  assert.equal(usoLine({state: 'ok', uso: {bots: [{id: 'luna', pct: 10}]}}, 'ted'), 'Aún sin datos');
  assert.equal(usoLine({state: 'ok', uso: {bots: [{id: 'ted', pct: 12}]}}, 'ted'), 'Uso esta semana: 12 %');
});

test('formatActualizado uses Mexico/Chihuahua style when it can', () => {
  const text = formatActualizado('2026-11-09T12:00:00-06:00');
  assert.ok(text);
  assert.equal(formatActualizado('no-es-fecha'), '');
});

test('encryptEncJson roundtrip shares salt and is decryptable', async () => {
  const salt = Buffer.from('atelier-uso-test-salt-32b!!').toString('base64');
  const meta = {v: 1, kdf: 'PBKDF2-SHA256', iter: 100000, salt, iv: 'AAAA', ct: 'AAAA'};
  // assertEncEnvelope needs real-looking iv/ct strings; we only need salt+iter for derive
  const envelope = {v: 1, kdf: 'PBKDF2-SHA256', iter: 100000, salt, iv: Buffer.alloc(12).toString('base64'), ct: Buffer.alloc(16).toString('base64')};
  const key = await deriveMandoKey('frase-de-prueba-local', envelope, globalThis.crypto.subtle, ['encrypt', 'decrypt']);
  const enc = await encryptEncJson(key, {semana_pct: 10, actualizado: 'x', bots: [{nombre: 'Ted', pct: 4}]}, {salt, iter: 100000});
  assertEncEnvelope(enc);
  assert.equal(enc.salt, salt);
  const plain = await decryptEncJson(key, enc);
  assert.equal(plain.semana_pct, 10);
  assert.equal(plain.bots[0].nombre, 'Ted');
});

test('formatMandoUso reports counts and never invents a percentage', () => {
  assert.equal(formatMandoUso(null), null);
  assert.equal(formatMandoUso({hoy: {mensajes: 0}, '7d': {mensajes: 5}}), 'Hoy: 0 mensajes · 7 días: 5');
  assert.equal(formatMandoUso({hoy: {mensajes: 19}, '7d': {mensajes: 395}}), 'Hoy: 19 mensajes · 7 días: 395');
  assert.ok(!String(formatMandoUso({hoy: {mensajes: 19}, '7d': {mensajes: 395}})).includes('%'));
});

test('displayUsoLine prefers uso.enc share, else mando counts, else the empty label', () => {
  const enc = {state: 'ok', uso: {bots: [{id: 'ted', pct: 12}]}};
  assert.equal(displayUsoLine(enc, 'ted', {hoy: {mensajes: 1}, '7d': {mensajes: 2}}), 'Uso esta semana: 12 %');
  assert.equal(displayUsoLine({state: 'missing'}, 'ted', {hoy: {mensajes: 0}, '7d': {mensajes: 5}}), 'Hoy: 0 mensajes · 7 días: 5');
  assert.equal(displayUsoLine({state: 'missing'}, 'ted', null), 'Aún sin datos');
  assert.equal(displayUsoLine({state: 'locked'}, 'ted', null), 'Solo con el mando desbloqueado');
});
