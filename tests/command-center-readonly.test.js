import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {commandCenterModel,filterTasks} from '../src/command-center.js';
import {demoSnapshot,disconnectedSnapshot} from '../src/data.js';
const js=fs.readFileSync(new URL('../src/command-center.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/command-center.css',import.meta.url),'utf8');
const variables=Object.fromEntries([...css.matchAll(/--(cc-[\w-]+):\s*(#[\da-f]{6});/g)].map(([,key,value])=>[key,value]));
function luminance(color){const rgb=color.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(a,b){const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return(values[0]+.05)/(values[1]+.05);}

test('every consultation surface is dark with accessible main, muted, accent and control text',()=>{
  for(const background of ['cc-bg','cc-surface','cc-control','cc-selected']){
    assert.ok(luminance(variables[background])<.09,`${background} remains a subdued dark surface`);
    for(const foreground of ['cc-ink','cc-muted','cc-accent'])assert.ok(contrast(variables[foreground],variables[background])>=4.5,`${foreground} on ${background} is WCAG AA`);
  }
  for(const background of ['cc-bg','cc-control','cc-surface']){
    assert.ok(contrast(variables['cc-control-border'],variables[background])>=3,`control border on ${background}`);
    assert.ok(contrast(variables['cc-focus'],variables[background])>=3,`focus on ${background}`);
  }
  assert.ok(contrast('#f3dfbd','#342d23')>=4.5,'DEMO disclosure');
  assert.ok(contrast('#f1c9d5','#3c2630')>=4.5,'read-error disclosure');
  assert.match(css,/color-scheme:dark/);
  assert.doesNotMatch(css,/background:\s*(?:white|#fff\b|#fffefb|#faf9f5|#f4f5ef)/);
});

test('activities lead with an information summary and optional collapsed search, not a form',()=>{
  assert.ok(js.indexOf("heading('Resumen de actividades'")<js.indexOf("const panel=el('details'"));
  assert.match(js,/filtersOpen=false/);
  assert.match(js,/if\(model\.hasTasks&&model\.tasks\.length\)/);
  assert.match(js,/Buscar o filtrar actividades/);
  assert.match(js,/input\.type='search'/);
  assert.doesNotMatch(js,/<form|el\('form'|el\('textarea'|contenteditable|type=['"]submit/);
  assert.doesNotMatch(js,/fetch\(|localStorage|sessionStorage|XMLHttpRequest/);
  assert.match(js,/Solo consulta · no modifica tareas ni calendarios/);
});

test('agenda is a read-only combined view of appointments and that assistant’s open tasks',()=>{
  assert.match(js,/Agenda y pendientes de/);
  assert.match(js,/task\.botId===agendaId&&task\.status!=='completed'/);
  assert.match(js,/cc-agenda-events/);
  assert.match(js,/cc-agenda-tasks/);
  assert.match(js,/openAgenda\(id='ted'\)/);
  assert.match(js,/No se puede confirmar si hay pendientes/);
});

test('consultation counts distinguish missing from zero and no example data leaks while disconnected',()=>{
  const model=commandCenterModel(disconnectedSnapshot());
  assert.equal(model.hasTasks,false);
  assert.equal(model.hasNotifications,false);
  assert.deepEqual(model.agenda,{});
  for(const count of Object.values(model.counts))assert.equal(count,null);
  const empty=commandCenterModel({mode:'live',tasks:[],notifications:[]});
  assert.equal(empty.hasTasks,true);
  assert.equal(empty.hasNotifications,true);
  for(const count of Object.values(empty.counts))assert.equal(count,0);
  assert.match(js,/DEMO · SIMULACIÓN · Ejemplos ficticios/);
});

test('filtering and rendering helpers preserve source data and explicit fictional provenance',()=>{
  const source=demoSnapshot();const copy=structuredClone(source);const model=commandCenterModel(source);
  const ted=filterTasks(model.tasks,{botId:'ted'});const julian=filterTasks(model.tasks,{botId:'julian'});
  assert.equal(ted.length,1);assert.equal(julian.length,1);
  assert.ok(ted.every(task=>task.botId==='ted'&&task.title.startsWith('Ejemplo:')));
  assert.ok(julian.every(task=>task.botId==='julian'&&task.title.startsWith('Ejemplo:')));
  assert.deepEqual(source,copy);
});
