import test from 'node:test';import assert from 'node:assert/strict';
import {bots,floors,disconnectedSnapshot,demoSnapshot} from '../src/data.js';import {validateSnapshot,readSnapshot} from '../src/adapter.js';
test('16 identidades únicas y cinco plantas según archivo',()=>{assert.equal(bots.length,16);assert.equal(new Set(bots.map(b=>b.id)).size,16);assert.deepEqual(floors.map(f=>bots.filter(b=>b.floor===f.id).length),[3,2,6,4,1]);});
test('inicio sin señal, tareas ni fuente inventada',()=>{const s=disconnectedSnapshot();assert.equal(s.source,null);assert.equal(s.lastSignal,null);assert.ok(s.bots.every(b=>b.status==='unknown'&&b.task===null&&b.lastSignal===null));});
test('demo explícita no produce timestamps reales',()=>{const s=demoSnapshot();assert.equal(s.mode,'demo');assert.equal(s.source,'Ejemplos ficticios locales');assert.ok(s.bots.every(b=>b.lastSignal===null));assert.equal(disconnectedSnapshot().bots[0].status,'unknown');});
const now=Date.now();const payload=()=>({schemaVersion:1,source:'Proveedor de prueba',bots:[{id:bots[0].id,status:'working',task:'Prueba',lastSignal:new Date(now-1000).toISOString()}]});const ids=bots.map(b=>b.id);
test('adaptador valida snapshot y conserva procedencia',()=>{assert.equal(validateSnapshot(payload(),ids,now).mode,'live');});
test('señal caducada pasa a desconocida',()=>{const p=payload();p.bots[0].lastSignal=new Date(now-46*60*1000).toISOString();assert.equal(validateSnapshot(p,ids,now).bots[0].status,'unknown');});
test('rechaza ID desconocido, duplicado y futuro',()=>{for(const kind of ['unknown','duplicate','future']){const p=payload();if(kind==='unknown')p.bots[0].id='not-real';if(kind==='duplicate')p.bots.push(p.bots[0]);if(kind==='future')p.bots[0].lastSignal=new Date(now+120000).toISOString();assert.throws(()=>validateSnapshot(p,ids,now));}});
test('lectura HTTP fallida no se transforma en actividad',async()=>{await assert.rejects(readSnapshot({knownIds:ids,fetcher:async()=>({ok:false,status:503})}));});
test('IDs canónicos, sin sustituciones por nombres o índices',()=>{assert.deepEqual([...bots.map(b=>b.id)].sort(),['ted','luna','vale','emiliano','julian','ines','ceo','apps','libro','rulo','director','luca','mateo','tadeo','tr-editor','tr-cm'].sort());});
import {readFileSync} from 'node:fs';
test('interfaz neutral y cinco niveles confirmados',()=>{const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(!/\bRob\b/i.test(html),'nunca el nombre de Rob');assert.ok(!/rob-referencia|fotos-realistas|foto.?de.?rob/i.test(html),'nunca foto de Rob');assert.match(html,/id="detail-photo"/);assert.equal(floors.length,5);assert.ok(bots.every(b=>b.floor>=0&&b.floor<5));});

test('asignación explícita de equipo-bots-rob.docx',()=>{
 const expected=[['luna','emiliano','vale'],['julian','ines'],['libro','apps','ceo','luca','rulo','director'],['mateo','tr-editor','tadeo','tr-cm'],['ted']];
 expected.forEach((ids,n)=>assert.deepEqual(bots.filter(b=>b.floor===n).map(b=>b.id).sort(),ids.sort()));
});
