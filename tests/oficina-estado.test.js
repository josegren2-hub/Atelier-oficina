import test from 'node:test';
import assert from 'node:assert/strict';
import {bots} from '../src/data.js';
import {mapOficinaEstado,readSnapshot,OFICINA_STATUS_MAP,oficinaFeedTime} from '../src/adapter.js';

const ids=bots.map(b=>b.id);
const now=Date.now();

function sampleEstado({latidoOffsetMs=60_000,actualizadoOffsetMs=120_000,estado='pausa'}={}){
 return {
  actualizado:new Date(now-actualizadoOffsetMs).toISOString(),
  bots:ids.map((id,i)=>({
   id,
   nombre:id,
   area:'x',
   estado:i===0?'trabajando':i===1?'esperando':estado,
   frase:i===0?'Public phrase':i===1?'Waiting phrase':'Descansando',
  })),
  salud:{latido:new Date(now-latidoOffsetMs).toISOString(),mando:null,avisos_ok:null,avisos_error:null,avisos_config:true},
  racha:{dias:1,hoy_cero:false},
 };
}

test('oficina status vocabulary maps to Atelier statuses',()=>{
 assert.deepEqual(OFICINA_STATUS_MAP,{trabajando:'working',esperando:'review',pausa:'idle'});
});

test('mapOficinaEstado preserves 1:1 ids and public frases only',()=>{
 const mapped=mapOficinaEstado(sampleEstado(),ids,now);
 assert.equal(mapped.schemaVersion,1);
 assert.equal(mapped.mode,'live');
 assert.equal(mapped.bots.length,16);
 assert.equal(mapped.bots.find(b=>b.id===ids[0]).status,'working');
 assert.equal(mapped.bots.find(b=>b.id===ids[0]).task,'Public phrase');
 assert.equal(mapped.bots.find(b=>b.id===ids[1]).status,'review');
 assert.equal(mapped.bots.find(b=>b.id===ids[2]).status,'idle');
 assert.equal(new Set(mapped.bots.map(b=>b.id)).size,16);
});

test('feed clock prefers the newer of actualizado and salud.latido',()=>{
 const raw=sampleEstado({latidoOffsetMs:30_000,actualizadoOffsetMs:600_000});
 const feed=oficinaFeedTime(raw);
 assert.equal(feed,Date.parse(raw.salud.latido));
});

test('stale latido+actualizado (>45 min) yields unknown after validate via readSnapshot',async()=>{
 const raw=sampleEstado({latidoOffsetMs:50*60*1000,actualizadoOffsetMs:50*60*1000});
 const result=await readSnapshot({knownIds:ids,now,fetcher:async()=>({ok:true,json:async()=>raw})});
 assert.ok(result.bots.every(b=>b.status==='unknown'&&b.task===null&&b.stale));
});

test('fresh latido keeps statuses even when actualizado is older than 120 s',async()=>{
 const raw=sampleEstado({latidoOffsetMs:60_000,actualizadoOffsetMs:10*60*1000});
 const result=await readSnapshot({knownIds:ids,now,fetcher:async()=>({ok:true,json:async()=>raw})});
 assert.equal(result.bots.find(b=>b.id===ids[0]).status,'working');
 assert.equal(result.bots.find(b=>b.id===ids[1]).status,'review');
 assert.equal(result.bots.find(b=>b.id===ids[2]).status,'idle');
 assert.ok(result.bots.every(b=>b.stale===false));
});

test('unknown oficina id is rejected',()=>{
 const raw=sampleEstado();
 raw.bots[0].id='not-a-bot';
 assert.throws(()=>mapOficinaEstado(raw,ids,now)/*,/desconocido/*/);
});
