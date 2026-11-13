import test from 'node:test';
import assert from 'node:assert/strict';
import {createMainHarness,createMemoryStorage} from './helpers/main-harness.js';

// These tests execute actual main.js event handlers with a minimal DOM double.
// They are not browser, visual, pointer/raycast or native-dialog accessibility QA.
const teamSize=h=>h.all('#bot-list .bot').length;
const field=(h,name)=>h.get(`[data-profile-field="${name}"]`).textContent;

test('main: roster click focuses camera and opens ficha (D12); close restores sixteen and keeps the camera on the bot floor (C28b)',()=>{
 const h=createMainHarness();
 assert.equal(teamSize(h),16);
 h.click('#demo'); // phase 1 defaults to live/offline; enter demo for example tasks
 assert.equal(teamSize(h),16);
 h.click('[data-bot-id="ted"]');
 assert.equal(h.get('#detail').open,true);
 assert.equal(h.get('#detail').showModalCalls,1);
 assert.equal(h.get('#detail-title').textContent,'Ted');
 // D12 (Bloque 2): roster opens the floating ficha + camera, not the modal; no forced focus to detail-close.
 assert.equal(h.scene.floor,5);
 assert.equal(h.scene.selected,'ted');
 assert.equal(teamSize(h),16);
 assert.equal(h.get('#roster-floor').value,'-1');
 assert.match(field(h,'current'),/^Ejemplo:/);
 assert.match(field(h,'previous'),/^Ejemplo:/);
 h.click('#detail-close');
 assert.equal(h.get('#detail').open,false);
 assert.equal(h.scene.floor,5); // C28b: closing keeps the camera where it is
 assert.equal(h.scene.selected,null);
 assert.equal(teamSize(h),16);
 assert.equal(h.document.activeElement.dataset.botId,'ted');
 assert.equal(h.document.activeElement.isConnected,true);
});

test('main: filtered roster and search survive repeated profile open/cancel, with stable return focus',()=>{
 const h=createMainHarness();
 h.change('#floor-jump',2);
 h.input('#search','Charly');
 assert.equal(teamSize(h),1);
 for(let attempt=0;attempt<3;attempt++){
  h.click('[data-bot-id="apps"]');
  assert.equal(h.get('#detail').open,true);
  const cancel=h.cancelDetail();
  assert.equal(cancel.defaultPrevented,true);
  assert.equal(h.get('#detail').open,false);
  assert.equal(h.get('#search').value,'Charly');
  assert.equal(h.get('#roster-floor').value,'2');
  assert.equal(h.scene.floor,2);
  assert.equal(teamSize(h),1);
  assert.equal(h.document.activeElement.dataset.botId,'apps');
 }
});

test('main: both Ver todos actions clear search/floor filters and restore sixteen',()=>{
 const h=createMainHarness();
 h.change('#floor-jump',5);
 h.input('#search','Ted');
 h.click('[data-bot-id="ted"]');
 h.click('#detail-all');
 assert.equal(h.get('#detail').open,false);
 assert.equal(h.get('#search').value,'');
 assert.equal(h.get('#roster-floor').value,'-1');
 assert.equal(h.get('#floor-jump').value,'-1');
 assert.equal(h.scene.floor,-1);
 assert.equal(teamSize(h),16);
 assert.equal(h.document.activeElement.id,'show-all');
 assert.equal(h.get('#show-all').lastScrollIntoView.block,'nearest');
 h.change('#roster-floor',1);
 h.input('#search','Not found');
 assert.equal(teamSize(h),0);
 h.click('#show-all');
 assert.equal(teamSize(h),16);
 assert.equal(h.get('#search').value,'');
 assert.equal(h.get('#roster-floor').value,'-1');
});

test('main: scene and command callbacks share immediate profile opening without narrowing the roster',()=>{
 const h=createMainHarness();
 h.get('#canvas-container').focus();
 h.pickAvatar('julian');
 assert.equal(h.get('#detail').open,true);
 assert.equal(h.get('#detail-title').textContent,'Julián');
 assert.equal(h.scene.floor,1);
 assert.equal(teamSize(h),16);
 h.click('#detail-agenda'); // C46a: opens the Pizarrón calendar and closes the ficha
 assert.equal(h.get('#detail').open,false);
 assert.equal(h.scene.floor,1); // C28b
 h.chooseFromCommand('ted');
 assert.equal(h.get('#detail').open,true);
 assert.equal(h.get('#detail-title').textContent,'Ted');
 h.cancelDetail();
 assert.equal(teamSize(h),16);
});

test('main: Plantas shows all six floors on one page, including the penthouse',()=>{
 const h=createMainHarness();
 h.click('[data-view="spread"]');
 assert.equal(h.scene.mode,'spread');
 assert.equal(h.scene.floor,-1);
 assert.equal(h.get('#spread-picker').hidden,false);
 assert.equal(h.all('#spread-floors button').length,6);
 assert.equal(h.get('#spread-page-label').textContent.trim(),'');assert.ok(h.get('#spread-page-label').hidden);
 assert.equal(h.get('#spread-next').hidden,true);
 assert.equal(h.get('#spread-previous').hidden,true);
 assert.equal(teamSize(h),16);
 h.click('[data-bot-id="ted"]');
 assert.equal(h.scene.floor,5);
 h.click('#detail-close');
 assert.equal(h.scene.floor,5); // C28b: stays on the bot floor
 h.click('[data-view="spread"]');
 assert.equal(h.scene.floor,-1);
 assert.equal(h.get('#spread-picker').hidden,false);
 assert.equal(teamSize(h),16);
 h.all('#spread-floors button')[3].click();
 assert.equal(h.scene.floor,3);
 assert.equal(teamSize(h),3); // roster follows the isolated floor
 h.click('[data-view="spread"]');
 assert.equal(h.scene.floor,-1);
 assert.equal(teamSize(h),16);
});

test('main: stored night theme reaches checkbox and scene, survives flows and a new application instance',()=>{
 const storage=createMemoryStorage({'atelier.theme':'night'}); // migrates to atelierModo=noche
 const h=createMainHarness({storage});
 assert.equal(h.get('#night').checked,true);
 assert.equal(h.document.documentElement.dataset.theme,'night');
 assert.equal(h.scene.night,true);
 assert.ok(h.sceneCalls.some(([method,p])=>method==='setLighting'&&p&&p.isNight===true));
 h.change('#floor-jump',2);
 h.click('[data-bot-id="apps"]');h.cancelDetail();
 h.click('#command-open');
 h.click('#avatars-toggle');h.click('#avatars-close');
 h.click('[data-view="spread"]');
 h.click('#show-all');h.click('#reset');
 assert.equal(h.get('#night').checked,true);
 assert.equal(h.scene.night,true);
 const reloaded=createMainHarness({storage});
 assert.equal(reloaded.get('#night').checked,true);
 assert.equal(reloaded.scene.night,true);
 reloaded.change('#night',false);
 assert.equal(storage.getItem('atelierModo'),'dia');
 assert.equal(reloaded.scene.night,false);
 assert.equal(reloaded.document.documentElement.dataset.theme,'day');
 const daylightReload=createMainHarness({storage});
 assert.equal(daylightReload.get('#night').checked,false);
 assert.equal(daylightReload.scene.night,false);
 daylightReload.change('#night',true);
 assert.equal(storage.getItem('atelierModo'),'noche');
 const nightReload=createMainHarness({storage});
 assert.equal(nightReload.get('#night').checked,true);
 assert.equal(nightReload.scene.night,true);
});

test('main: source disconnected profile has no fake current/history or scene-activity claim',()=>{
 const h=createMainHarness();
 // Default starts disconnected; harness stubs live fetch so it stays offline.
 h.click('[data-bot-id="ted"]');
 assert.match(h.get('#detail-source').textContent,/Fuente no conectada/);
 assert.match(field(h,'status'),/Desconocido/);
 assert.match(field(h,'active'),/No se puede verificar/);
 assert.match(field(h,'current'),/No disponible/);
 assert.match(field(h,'previous'),/No disponible/);
 h.tick();
 assert.equal(field(h,'activity'),'No hay actividad real recibida.');
 assert.doesNotMatch(h.get('#detail-facts').textContent,/Ejemplo:|Postura de prueba/);
});
