import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {bytesToB64} from '../src/crypto-mando.js';
import {createMandoSession, liveTaskText, waitingFromLive, authorizationItems} from '../src/mando-session.js';

const subtle = webcrypto.subtle;

async function makeEnc(pass, payload, saltBytes = null, iter = 310000) {
  const salt = saltBytes || webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const material = await subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle.deriveKey({name:'PBKDF2', salt, iterations:iter, hash:'SHA-256'}, material, {name:'AES-GCM', length:256}, true, ['encrypt','decrypt']);
  const ct = await subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(JSON.stringify(payload)));
  return {enc:{v:1,kdf:'PBKDF2-SHA256',iter,salt:bytesToB64(salt),iv:bytesToB64(iv),ct:bytesToB64(ct)}, salt};
}

test('liveTaskText prefers tareas.enc frase then ultimo then mando', () => {
  assert.equal(liveTaskText({botId:'a',vivoStatus:'working',tareas:{bots:{a:{frase:'Frase viva',desde:'2026-01-01T00:00:00Z'}}},mandoBot:{tarea:'sup'}}).text, 'Frase viva');
  assert.equal(liveTaskText({botId:'a',vivoStatus:'working',tareas:{bots:{a:{ultimo:{txt:'último',t:'2026-01-01T00:00:00Z'}}}},mandoBot:{tarea:'sup'}}).text, 'último');
  assert.equal(liveTaskText({botId:'a',vivoStatus:'working',tareas:{bots:{}},mandoBot:{tarea:'sup'},mandoGenerado:new Date().toISOString()}).text, 'sup');
  assert.equal(liveTaskText({botId:'a',vivoStatus:'working',tareas:{bots:{}},mandoBot:null}).text, 'Trabajando');
});

test('waitingFromLive uses review status', () => {
  assert.deepEqual(waitingFromLive({bots:[{id:'a',status:'review',stale:false},{id:'b',status:'working'}]}).map(b=>b.id), ['a']);
});

test('authorizationItems only while waiting', () => {
  assert.deepEqual(authorizationItems({ok:['x','y']}, 'review'), ['x','y']);
  assert.deepEqual(authorizationItems({ok:['x']}, 'working'), []);
});

test('session unlocks, remembers, enriches, and locks without leaking storage key into snapshot', async () => {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const mandoPayload = {generado:new Date().toISOString(), bots:[{id:'ted',tarea:'Hacer A',pendiente:'OK?',ok:['OK?'],agente:'cursor'}]};
  const tareasPayload = {generado:new Date().toISOString(), bots:{ted:{frase:'Frase de ted',desde:new Date().toISOString()}}};
  const {enc:mandoEnc} = await makeEnc('clave', mandoPayload, salt);
  const {enc:tareasEnc} = await makeEnc('clave', tareasPayload, salt);
  const store = new Map();
  const storage = {getItem:k=>store.has(k)?store.get(k):null, setItem:(k,v)=>store.set(k,v), removeItem:k=>store.delete(k)};
  const fetcher = async url => {
    const body = url.includes('tareas.enc') ? tareasEnc : mandoEnc;
    return {ok:true, status:200, json:async()=>body};
  };
  const session = createMandoSession({fetcher, storage, subtle});
  const snap = await session.unlock('clave', {remember:true});
  assert.equal(snap.unlocked, true);
  assert.ok(store.get('atelierMandoClave'));
  const enriched = session.enrichBot({id:'ted',name:'Ted',status:'working',task:null,stale:false});
  assert.equal(enriched.task, 'Frase de ted');
  assert.equal(enriched.liveTask.source, 'tareas.enc');
  const waiting = session.enrichBot({id:'ted',name:'Ted',status:'review',task:null,stale:false});
  assert.equal(waiting.pendiente, 'OK?');
  assert.deepEqual(waiting.authorization, ['OK?']);
  const resolved = session.enrichBot({id:'ted',name:'Ted',status:'idle',task:null,stale:false});
  assert.equal(resolved.waitingResolved, true);
  session.lock();
  assert.equal(session.unlocked, false);
  assert.equal(store.has('atelierMandoClave'), false);
});
