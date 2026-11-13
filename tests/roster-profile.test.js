import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bots,demoSnapshot,disconnectedSnapshot} from '../src/data.js';
import {filterRoster,botProfile} from '../src/roster.js';
import {readNightPreference,saveNightPreference} from '../src/theme-state.js';

test('roster combines explicit floor and accent-insensitive search without a camera dependency',()=>{
 assert.equal(filterRoster(bots).length,16);
 assert.deepEqual(filterRoster(bots,{query:'JULIAN'}).map(b=>b.id),['julian']);
 assert.equal(filterRoster(bots,{floor:2}).length,4);
 assert.equal(filterRoster(bots,{floor:3}).length,3);
 assert.equal(filterRoster(bots,{floor:2,query:'desarrollo'}).length,1);
 assert.equal(filterRoster(bots,{floor:4,query:'luna'}).length,0);
 assert.equal(filterRoster(bots,{floor:-1,query:''}).length,16);
});
test('all demo profiles have explicit local examples; idle does not pretend to work',()=>{
 for(const preset of ['mixed','working','idle']){
  const s=demoSnapshot(preset);
  for(const b of s.bots){
   const p=botProfile(s,b,{label:'Leyendo · ejemplo'});
   assert.match(p.source,/DEMO.*ficticios.*simulados/);
   assert.match(p.previousTask,/^Ejemplo:/);
   assert.equal(p.lastSignal,'Ninguna señal real recibida.');
   assert.match(p.activity,/Movimiento de ejemplo/);
   if(b.status==='idle')assert.equal(p.currentTask,'Sin tarea asignada en este ejemplo.');
   else assert.match(p.currentTask,/^Ejemplo:/);
  }
 }
});
test('disconnected and stale profiles suppress tasks/history, even with stale fields and scene motion',()=>{
 const disconnected=disconnectedSnapshot();
 assert.ok(disconnected.bots.every(b=>b.task===null&&b.previousTask===null&&b.activity===null));
 for(const mode of ['disconnected','live']){
  const b={...bots[0],status:'working',stale:true,task:'CACHED SECRET TASK',previousTask:'CACHED HISTORY',activity:'CACHED ACTIVITY'};
  const profile=botProfile({mode},b,{label:'Moving scene'});
  assert.equal(profile.status,'Desconocido · sin señal');
  assert.equal(profile.active,'No se puede verificar');
  assert.doesNotMatch(JSON.stringify(profile),/CACHED|Moving scene/);
 }
});
test('future live profiles never manufacture history from a status',()=>{
 const profile=botProfile({mode:'live',source:'Test source'},{...bots[0],status:'working',task:'Received task'});
 assert.equal(profile.currentTask,'Received task');
 assert.equal(profile.previousTask,'No se ha recibido una tarea anterior.');
 assert.equal(profile.activity,'No se ha recibido una descripción de actividad.');
 assert.doesNotMatch(profile.source,/DEMO/);
});
test('night preference survives navigation/reload and storage failures are harmless',()=>{
 const values=new Map();const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 assert.equal(readNightPreference(storage),false);
 assert.equal(saveNightPreference(true,storage),true);
 assert.equal(values.get('atelier.theme'),'night');
 assert.equal(readNightPreference(storage),true);
 assert.equal(saveNightPreference(false,storage),true);
 assert.equal(readNightPreference(storage),false);
 const blocked={getItem(){throw Error('Disabled');},setItem(){throw Error('Quota');}};
 assert.equal(readNightPreference(blocked),false);
 assert.equal(saveNightPreference(true,blocked),false);
});
test('profile markup is a modal read-only detail with two routes back to all sixteen',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(html,/<dialog id="detail" aria-labelledby="detail-title" aria-describedby="detail-source">/);
 assert.match(html,/id="show-all"[^>]*>Ver todos \(16\)/);
 assert.match(html,/id="detail-all"[^>]*>Ver todos \(16\)/);
 assert.match(html,/<div id="detail-facts"><\/div>/);
 assert.match(main,/detail\.showModal\(\)/);
 assert.match(main,/detail\.addEventListener\('cancel'/);
 assert.match(main,/setFloor\(b.floor,\{syncRoster:false\}\)/);
 assert.doesNotMatch(main,/office\.setNight\(false\)/);
});
test('2×2 pager explicitly exposes the fifth floor and a return to the four-floor page',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.doesNotMatch(html,/las 6 en una página/);
 assert.doesNotMatch(main,/las 6 en una página/);
 assert.match(html,/id="spread-page-label"[^>]*hidden/);
 assert.match(main,/for\(const f of floors\)/);
});
