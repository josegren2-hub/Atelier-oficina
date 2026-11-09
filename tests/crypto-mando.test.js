import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {assertEncEnvelope, deriveMandoKey, decryptEncJson, exportRawKey, importRawKey, bytesToB64} from '../src/crypto-mando.js';

const subtle = webcrypto.subtle;

async function makeEnc(pass, payload, iter = 310000) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const material = await subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle.deriveKey({name:'PBKDF2', salt, iterations:iter, hash:'SHA-256'}, material, {name:'AES-GCM', length:256}, true, ['encrypt','decrypt']);
  const ct = await subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(JSON.stringify(payload)));
  return {v:1, kdf:'PBKDF2-SHA256', iter, salt:bytesToB64(salt), iv:bytesToB64(iv), ct:bytesToB64(ct)};
}

test('assertEncEnvelope rejects weak envelopes', () => {
  assert.throws(() => assertEncEnvelope({v:1,kdf:'PBKDF2-SHA256',iter:1000,salt:'a',iv:'b',ct:'c'}));
});

test('derive + decrypt roundtrip matches Oficina-bots scheme', async () => {
  const enc = await makeEnc('frase-prueba', {bots:[{id:'ted',tarea:'x'}]});
  const key = await deriveMandoKey('frase-prueba', enc, subtle);
  const data = await decryptEncJson(key, enc, subtle);
  assert.equal(data.bots[0].id, 'ted');
  const raw = await exportRawKey(key, subtle);
  const again = await importRawKey(raw, subtle);
  const data2 = await decryptEncJson(again, enc, subtle);
  assert.equal(data2.bots[0].tarea, 'x');
});

test('wrong passphrase fails', async () => {
  const enc = await makeEnc('buena', {ok:true});
  const key = await deriveMandoKey('mala', enc, subtle);
  await assert.rejects(() => decryptEncJson(key, enc, subtle));
});
