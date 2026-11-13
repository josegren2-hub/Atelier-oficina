import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const piz=readFileSync(new URL('../src/pizarron.js',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
test('C46c: Julián board is work-only, same calendar, non-modal; agenda options route to it',()=>{
 assert.match(piz,/Pizarrón de Julián/);assert.match(piz,/Solo agenda de trabajo/);
 assert.match(piz,/if \(!jul\) \{\n      h \+= '<h4>Te esperan<\/h4>'/);
 assert.doesNotMatch(piz,/showModal/);
 assert.match(main,/pizarronWho=id==='julian'\?'julian':'ted'/);
 assert.match(main,/bindPizarronOutsideTap/);
});
test('t301: opens in 2 días when the agenda data is for tomorrow',()=>{
 assert.match(piz,/d\.audFecha > buildCalendar\(\[\], \{days: 1\}\)\.todayYmd \? 2 : 1/);
 assert.match(piz,/if \(!dialog\.open\) days = defaultDays\(\)/);
});
import {buildPizarronModel, buildCalendar} from '../src/pizarron.js';
test('t302: Ted board merges audiencias + Google agenda; Julián uses only audiencias',()=>{
 const m=buildPizarronModel({mando:{audiencias:{estado:'ok',fecha:'2026-11-12',items:[{hora:'10:00',titulo:'A'}]},agenda:{estado:'ok',eventos:[{fecha:'2026-11-12',hora_inicio:'17:00',hora_fin:'19:00',titulo:'B',lugar:''}]}}});
 assert.equal(m.aud[0].fecha,'2026-11-12');assert.equal(m.agenda.length,1);
 const now=new Date('2026-11-11T18:00:00Z');
 const c=buildCalendar([...m.aud,...m.agenda],{days:2,now});
 assert.equal(c.cols[1].events.length,2);assert.equal(c.cols[1].events.find(e=>e.titulo==='B').dur,120);
 assert.match(piz,/jul \? d\.aud : \[\.\.\.d\.aud, \.\.\.\(d\.agenda \|\| \[\]\)\]/);
});
