import test from 'node:test';
import assert from 'node:assert/strict';
import {readSnapshot,validateSnapshot,mapOficinaEstado,isOficinaEstado} from '../src/adapter.js';
import {assertLiveEnvelope,SOURCE_CONTRACT} from '../src/source-contract.js';
const now=Date.now();
const payload=()=>({schemaVersion:1,source:'Synthetic test provider',mode:'live',provenance:{kind:'runtime-observation'},bots:[{id:'example',status:'working',lastSignal:new Date(now).toISOString()}]});

test('phase 1 enables the public Oficina-bots estado.json source',()=>{
 assert.equal(SOURCE_CONTRACT.enabled,true);
 assert.match(SOURCE_CONTRACT.endpoint,/Oficina-bots\/estado\.json$/);
 assert.equal(SOURCE_CONTRACT.maxSignalAgeMs,45*60*1000);
});

test('demo and unmarked envelopes still cannot pretend to be live',()=>{
 for(const p of [{...payload(),mode:'demo'},{...payload(),provenance:{kind:'public-export'}},{...payload(),simulated:true}])assert.throws(()=>assertLiveEnvelope(p));
});

test('raw oficina estado.json is not a live envelope until mapped',()=>{
 assert.throws(()=>assertLiveEnvelope({actualizado:new Date().toISOString(),bots:[]}));
 assert.equal(isOficinaEstado({actualizado:new Date().toISOString(),bots:[]}),true);
});

test('live read hits the public estado URL without credentials or cache',async()=>{
 const result=await readSnapshot({knownIds:['example'],fetcher:async(url,options)=>{
  assert.match(String(url),/estado\.json\?t=/);
  assert.equal(options.cache,'no-store');
  assert.equal(options.credentials,'omit');
  return{ok:true,json:async()=>payload()};
 }});
 assert.equal(result.mode,'live');
});

test('stale feed (>45 min) clears status and public task text',()=>{
 const p=payload();
 p.bots[0].task='Synthetic task';
 p.bots[0].lastSignal=new Date(now-46*60*1000).toISOString();
 const b=validateSnapshot(p,['example'],now).bots[0];
 assert.equal(b.status,'unknown');
 assert.equal(b.task,null);
 assert.equal(b.stale,true);
});

test('fresh feed within 45 min keeps working status even if older than 120 s',()=>{
 const p=payload();
 p.bots[0].lastSignal=new Date(now-10*60*1000).toISOString();
 const b=validateSnapshot(p,['example'],now).bots[0];
 assert.equal(b.status,'working');
 assert.equal(b.stale,false);
});
