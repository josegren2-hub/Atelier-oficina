import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {bytesToB64} from '../src/crypto-mando.js';
import {createMandoSession, liveTaskText, waitingFromLive, authorizationItems, previousTaskText, isProcessPhrase, humanProjectName} from '../src/mando-session.js';

const subtle = webcrypto.subtle;

async function makeEnc(pass, payload, saltBytes = null, iter = 310000) {
  const salt = saltBytes || webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const material = await subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle.deriveKey({name:'PBKDF2', salt, iterations:iter, hash:'SHA-256'}, material, {name:'AES-GCM', length:256}, true, ['encrypt','decrypt']);
  const ct = await subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(JSON.stringify(payload)));
  return {enc:{v:1,kdf:'PBKDF2-SHA256',iter,salt:bytesToB64(salt),iv:bytesToB64(iv),ct:bytesToB64(ct)}, salt};
}

test('isProcessPhrase rejects commands and scripts', () => {
  assert.equal(isProcessPhrase('node cli.js · atelier-trabajo'), true);
  assert.equal(isProcessPhrase('Comando en terminal'), true);
  assert.equal(isProcessPhrase('Revisé la ficha de Tadeo'), false);
  assert.equal(humanProjectName('node cli.js · atelier-trabajo'), 'Oficina Atelier');
});

test('liveTaskText prefers the last chat message, then a readable title, then a human project', () => {
  assert.equal(liveTaskText({botId:'a',vivoStatus:'working',tareas:{bots:{a:{frase:'node cli.js · atelier-trabajo',ultimo:{txt:'Revisé la ficha',t:'2026-01-01T00:00:00Z'}}}},mandoBot:{tarea:'sup'}}).text, 'Revisé la ficha');
  assert.equal(liveTaskText({botId:'a',vivoStatus:'idle',tareas:{bots:{a:{ultimo:{txt:'último en pausa',t:'2026-01-01T00:00:00Z'}}}},mandoBot:{tarea:'sup'}}).text, 'último en pausa');
  assert.equal(liveTaskText({botId:'a',vivoStatus:'working',tareas:{bots:{a:{frase:'node cli.js · atelier-trabajo'}}},mandoBot:{}}).text, 'Oficina Atelier');
  assert.equal(liveTaskText({botId:'a',vivoStatus:'working',tareas:{bots:{a:{frase:'Comando en terminal'}}},mandoBot:{}}).text, 'Trabajando');
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
  assert.equal(enriched.task, 'Hacer A');
  assert.equal(enriched.liveTask.source, 'mando.enc');
  const waiting = session.enrichBot({id:'ted',name:'Ted',status:'review',task:null,stale:false});
  assert.equal(waiting.pendiente, 'OK?');
  assert.deepEqual(waiting.authorization, ['OK?']);
  const resolved = session.enrichBot({id:'ted',name:'Ted',status:'idle',task:null,stale:false});
  assert.equal(resolved.waitingResolved, true);
  session.lock();
  assert.equal(session.unlocked, false);
  assert.equal(store.has('atelierMandoClave'), false);
});

test('previousTaskText uses the next historial snippet, not the current one', () => {
  const bot = {
    ultimo: {t: '2026-11-12T20:00:00-06:00', txt: 'Mensaje actual largo'},
    historial: [
      {t: '2026-11-12T20:00:00-06:00', txt: 'Mensaje actual'},
      {t: '2026-11-11T09:30:00-06:00', txt: 'Tarea previa del bot'},
    ],
  };
  const text = previousTaskText(bot, 'Mensaje actual largo');
  assert.match(text, /Tarea previa del bot/);
  assert.match(text, /09:30/);
  assert.equal(previousTaskText({historial: [{t: '2026-11-12T20:00:00-06:00', txt: 'Solo una'}]}, 'Solo una'), null);
  const fromTareas = previousTaskText(bot, 'Mensaje actual largo', {anterior:{txt:'Frase anterior en vivo',t:'2026-11-13T11:00:00-06:00'}});
  assert.match(fromTareas, /Frase anterior en vivo/);
  const skipCmd = previousTaskText(bot, 'Mensaje actual largo', {anterior:{txt:'Comando en terminal',t:'2026-11-13T10:05:00-06:00'}});
  assert.match(skipCmd, /Tarea previa del bot/);
  assert.doesNotMatch(skipCmd || '', /Comando en terminal|cli\.js|node /);
});

test('enrichBot exposes previousTask and mandoUso when unlocked', async () => {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const mandoPayload = {
    generado: new Date().toISOString(),
    bots: [{
      id: 'ted',
      tarea: '',
      historial: [
        {t: '2026-11-12T20:00:00-06:00', txt: 'Frase de ted ahora'},
        {t: '2026-11-11T08:15:00-06:00', txt: 'Lo que hizo ayer'},
      ],
      uso: {hoy: {mensajes: 3}, '7d': {mensajes: 21}},
    }],
  };
  const tareasPayload = {generado: new Date().toISOString(), bots: {ted: {frase: 'Frase de ted ahora', desde: '2026-11-12T20:00:00-06:00'}}};
  const {enc: mandoEnc} = await makeEnc('clave', mandoPayload, salt);
  const {enc: tareasEnc} = await makeEnc('clave', tareasPayload, salt);
  const fetcher = async url => {
    const body = url.includes('tareas.enc') ? tareasEnc : mandoEnc;
    return {ok: true, status: 200, json: async () => body};
  };
  const session = createMandoSession({fetcher, storage: null, subtle});
  await session.unlock('clave', {remember: false});
  const enriched = session.enrichBot({id: 'ted', name: 'Ted', status: 'working', task: null, stale: false});
  assert.match(enriched.previousTask, /Lo que hizo ayer/);
  assert.equal(enriched.mandoUso['7d'].mensajes, 21);
  session.lock();
  const locked = session.enrichBot({id: 'ted', name: 'Ted', status: 'working', task: 'x', stale: false, previousTask: null});
  assert.equal(locked.previousTask, null);
  assert.equal(locked.mandoUso, null);
});
