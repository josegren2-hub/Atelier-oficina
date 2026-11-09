import './style.css';
import {mountReleaseNotice} from './release-notice.js';
import './command-center.css';
import {bots,floors,disconnectedSnapshot,demoSnapshot,statusLabels} from './data.js';
import {readSnapshot} from './adapter.js';
import {SOURCE_CONTRACT} from './source-contract.js';
import {createOffice} from './scene.js';
import {mountCommandCenter} from './command-center.js';
import {filterRoster,botProfile} from './roster.js';
import {readNightPreference,saveNightPreference} from './theme-state.js';
const $=s=>document.querySelector(s);
mountReleaseNotice();
let snapshot=disconnectedSnapshot(),floor=-1,rosterFloor=-1,viewMode='exterior',selected=null,office,detailReturn=null,liveTimer=null,wantLive=true;
let nightMode=readNightPreference();
$('#night').checked=nightMode;
document.documentElement.dataset.theme=nightMode?'night':'day';
function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
const command=mountCommandCenter({getSnapshot:()=>snapshot,onChoose:id=>choose(id)});
const nav=$('#floors'),detail=$('#detail');
for(const f of floors){
 const title=`${f.id===0?'PB':f.id} · ${f.name}`;
 for(const selector of ['#floor-jump','#roster-floor']){const option=el('option',title);option.value=f.id;$(selector).append(option);}
}
$('#floor-jump').addEventListener('change',e=>setFloor(Number(e.target.value)));
$('#roster-floor').addEventListener('change',e=>{rosterFloor=Number(e.target.value);renderRoster();});
$('#command-open').addEventListener('click',()=>command.open());
$('#pending-open').addEventListener('click',()=>command.open('tasks'));
$('#notifications-open').addEventListener('click',()=>command.open('notifications'));
$('#refresh-office').addEventListener('click',()=>{command.refresh();if(wantLive&&snapshot.mode!=='demo'){refreshLive({manual:true});}else{$('#refresh-feedback').textContent=snapshot.mode==='demo'?'Vista demo actualizada. Sin consulta a la fuente en vivo.':'Vista actualizada. Sin fuente en vivo activa.';}});
function toggleAvatars(open){$('#avatar-dropdown').hidden=!open;$('#avatars-toggle').setAttribute('aria-expanded',String(open));if(open){const frame=$('#avatar-dropdown iframe');if(!frame.getAttribute('src'))frame.src=frame.dataset.src;$('#avatars-close').focus();}else $('#avatars-toggle').focus();}
$('#avatars-toggle').addEventListener('click',()=>toggleAvatars($('#avatar-dropdown').hidden));
$('#avatars-close').addEventListener('click',()=>toggleAvatars(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]')&&!$('#avatar-dropdown').hidden)toggleAvatars(false);});
for(const f of [{id:-1,name:'Todo el edificio'},...floors]){
 const button=el('button','');button.dataset.floor=f.id;button.setAttribute('aria-pressed',String(f.id===floor));
 button.append(el('b',f.id<0?'◎':f.id===0?'PB':`0${f.id}`),el('span',f.name));button.addEventListener('click',()=>setFloor(f.id));nav.append(button);
}
for(const f of floors.filter(f=>f.id<4)){
 const b=el('button',`${f.id===0?'PB':String(f.id).padStart(2,'0')} · ${f.name}`);b.addEventListener('click',()=>setFloor(f.id));$('#spread-floors').append(b);
}
$('#spread-next').addEventListener('click',()=>{setFloor(4,{syncRoster:false});$('#spread-previous').focus();});
$('#spread-previous').addEventListener('click',()=>{setFloor(-1,{syncRoster:false});$('#spread-next').focus();});
function setFloor(id,{syncRoster=true}={}){
 if(id!==-1&&!floors.some(f=>f.id===id))return;
 $('#floor-jump').value=String(id);
 // Only a deliberate floor filter changes the roster. Opening a profile does not.
 if(syncRoster){rosterFloor=id;$('#roster-floor').value=String(id);}
 floor=id;
 const spreadPageTwo=viewMode==='spread'&&id===4;
 const spread=viewMode==='spread'&&(id<0||spreadPageTwo);
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String((id<0||spreadPageTwo)&&b.dataset.view===viewMode)));
 nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.floor)===id)));
 $('#view-title').textContent=id<0?({exterior:'Atelier',stacked:'Cinco niveles abiertos',spread:'Plantas 2×2'}[viewMode]):floors[id].name;
 $('#view-kicker').textContent=spread?`PLANTAS 2×2 · PÁGINA ${spreadPageTwo?'2':'1'} DE 2`:id<0?({exterior:'EDIFICIO CERRADO',stacked:'PLANTAS ABIERTAS · SEPARACIÓN CERCANA'}[viewMode]):`PLANTA ${id===0?'BAJA':id}`;
 $('#viewport').classList.toggle('spread-view',spread);
 $('#spread-picker').hidden=!spread;
 $('#spread-floors').hidden=spreadPageTwo;
 $('#spread-next').hidden=spreadPageTwo;
 $('#spread-previous').hidden=!spreadPageTwo;
 $('#spread-page-label').textContent=spreadPageTwo?'Página 2 de 2 · Piso 4 · Penthouse':'Página 1 de 2 · PB a piso 3';
 $('.gesture').textContent=spread?'Toca un avatar para ver su ficha · usa las páginas para recorrer los cinco pisos':'Toca un avatar para ver su ficha · arrastra para girar · pellizca para acercar';
 office?.setView(id);renderRoster();
 const active=nav.querySelector('[aria-pressed=true]');
 if(active){const left=active.offsetLeft-nav.offsetLeft-(nav.clientWidth-active.offsetWidth)/2;nav.scrollTo({left:Math.max(0,left),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
}
function choose(id){
 const b=snapshot.bots.find(b=>b.id===id);if(!b)return;
 if(!detail.open){const focus=document.activeElement;detailReturn={floor,focus,botId:focus?.dataset.botId};}
 selected=id;
 if(floor!==b.floor)setFloor(b.floor,{syncRoster:false});
 office?.select(id);render();
 if(!detail.open)detail.showModal();
 $('#detail-close').focus();
}
function closeDetail({all=false}={}){
 const context=detailReturn;detailReturn=null;selected=null;office?.select(null);
 if(detail.open)detail.close();
 if(all){$('#search').value='';setFloor(-1);}
 else if(context)setFloor(context.floor,{syncRoster:false});
 else renderRoster();
 // Roster buttons are regenerated, so recover the original by its stable identity.
 const previousBot=context?.botId?document.querySelector(`[data-bot-id="${context.botId}"]`):null;
 const target=all?$('#show-all'):previousBot||(context?.focus?.isConnected&&context.focus!==document.body?context.focus:$('#canvas-container'));
 target?.focus({preventScroll:!all});
 if(all)$('#show-all').scrollIntoView({block:'nearest'});
}
$('#detail-close').addEventListener('click',()=>closeDetail());
$('#detail-all').addEventListener('click',()=>closeDetail({all:true}));
$('#show-all').addEventListener('click',()=>closeDetail({all:true}));
detail.addEventListener('cancel',event=>{event.preventDefault();closeDetail();});
$('#detail-agenda').addEventListener('click',()=>{if(selected)command.openAgenda(selected);});
function renderRoster(){
 const list=filterRoster(snapshot.bots,{floor:rosterFloor,query:$('#search').value});
 $('#roster-floor').value=String(rosterFloor);
 $('#bot-count').textContent=`${list.length} de ${snapshot.bots.length} bots`;
 $('#roster-scope').textContent=`${list.length} de ${snapshot.bots.length} bots · ${rosterFloor<0?'Todos los pisos':floors[rosterFloor].name}${$('#search').value.trim()?' · búsqueda activa':''}`;
 for(const selector of ['#show-all','#detail-all'])$(selector).textContent=`Ver todos (${snapshot.bots.length})`;
 const holder=$('#bot-list');holder.replaceChildren();
 for(const b of list){
  const button=el('button','',`bot ${b.id===selected?'selected':''}`);button.dataset.botId=b.id;
  button.setAttribute('aria-label',`${b.name}, ${b.role}, ${statusLabels[b.status]||'Sin señal'}`);button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','detail');
  const avatar=el('span','••','avatar');avatar.style.setProperty('--bot',b.color);
  const text=el('span','');text.append(el('strong',b.name),el('small',b.role));
  const indicator=el('span','',`status-dot status-${b.status}`);indicator.setAttribute('aria-label',statusLabels[b.status]||'Sin señal');indicator.title=statusLabels[b.status]||'Sin señal';
  avatar.append(indicator);button.append(avatar,text,el('em',snapshot.mode==='demo'?'DEMO':snapshot.mode==='live'?'EN VIVO':'SIN SEÑAL'));
  button.addEventListener('click',()=>choose(b.id));holder.append(button);
 }
 if(!list.length)holder.append(el('p','No hay bots que coincidan. Usa «Ver todos» para quitar los filtros.','muted'));
}
function renderDetail(){
 if(!selected)return;
 const b=snapshot.bots.find(b=>b.id===selected);if(!b)return;
 const profile=botProfile(snapshot,b,office?.getActivity?.(selected));
 $('#detail-title').textContent=b.name;$('#detail-role').textContent=b.role;$('#detail-source').textContent=profile.source;
 const facts=$('#detail-facts');facts.replaceChildren();
 for(const [label,value,key] of [
  ['Planta',`${b.floor===0?'PB':`Piso ${b.floor}`} · ${floors[b.floor].name}`,'floor'],
  ['Estado',profile.status,'status'],['¿Está activo?',profile.active,'active'],
  ['Actividad ahora',profile.activity,'activity'],['Tarea actual',profile.currentTask,'current'],
  ['Tarea anterior',profile.previousTask,'previous'],['Última señal real',profile.lastSignal,'signal']
 ]){const row=el('div',undefined,'detail-fact'),valueNode=el('dd',value);valueNode.dataset.profileField=key;row.append(el('dt',label),valueNode);facts.append(row);}
 $('#detail-agenda').hidden=!['ted','julian'].includes(b.id);
}
function render(){renderRoster();renderDetail();}
$('#search').addEventListener('input',renderRoster);
function setDemoPreset(preset){snapshot=demoSnapshot(preset);office?.setDemo(true);office?.setStatuses(snapshot);command.refresh();render();$('#demo-preset-result').textContent=preset==='working'?'Ejemplo: todos van a su puesto para trabajar sentados.':preset==='idle'?'Ejemplo: paseo, lectura y descanso sin trabajo real.':'Ejemplo mixto: trabajando, esperando revisión y descansando.';}
document.querySelectorAll('[data-demo-preset]').forEach(button=>button.addEventListener('click',()=>setDemoPreset(button.dataset.demoPreset)));

function mergeLive(result){
 const byId=new Map(result.bots.map(b=>[b.id,b]));
 return {
  mode:'live',
  source:result.source,
  lastSignal:result.lastSignal,
  bots:bots.map(base=>{
   const live=byId.get(base.id);
   if(!live)return {...base,status:'unknown',task:null,previousTask:null,activity:null,lastSignal:null,stale:true};
   return {...base,status:live.status,task:live.task,previousTask:null,activity:live.task,lastSignal:live.lastSignal,stale:live.stale};
  }),
 };
}

function paintSource(){
 const live=snapshot.mode==='live';
 const demo=snapshot.mode==='demo';
 const label=demo?'Ejemplos simulados · sin fuente real':live?`En vivo · ${snapshot.source}`:'Sin conexión · reintentando';
 $('#source-label').textContent=label;
 $('#last-signal').textContent=snapshot.lastSignal?new Date(snapshot.lastSignal).toLocaleString('es-MX',{timeZone:'America/Chihuahua'}):'ninguna';
 document.querySelector('.source')?.classList.toggle('live',live);
 document.querySelector('.source')?.classList.toggle('offline',!live&&!demo);
 $('#demo').textContent=demo?'Salir de demostración':'Ver demostración';
 $('#demo').setAttribute('aria-pressed',String(demo));
 $('#demo-actions').hidden=!demo;
 $('#demo-banner').hidden=!demo;
}

function applySnapshot(next,{demoMotion=false}={}){
 snapshot=next;
 office?.setDemo(demoMotion);
 office?.setStatuses(snapshot);
 command.refresh();
 paintSource();
 render();
}

async function refreshLive({manual=false}={}){
 if(!wantLive)return;
 try{
  const result=await readSnapshot({knownIds:bots.map(b=>b.id)});
  applySnapshot(mergeLive(result),{demoMotion:false});
  $('#refresh-feedback').textContent=manual?'Estado en vivo actualizado.':'';
 }catch(error){
  if(snapshot.mode==='demo')return;
  applySnapshot(disconnectedSnapshot(),{demoMotion:false});
  $('#source-label').textContent='Sin conexión · no se pudo leer estado.json';
  $('#refresh-feedback').textContent=manual?`No se pudo actualizar: ${error.message}`:`Sin conexión: ${error.message}`;
 }
}

function startLivePolling(){
 if(liveTimer)clearInterval(liveTimer);
 liveTimer=setInterval(()=>{if(wantLive&&snapshot.mode!=='demo'&&!document.hidden)refreshLive();},SOURCE_CONTRACT.pollIntervalMs);
}

$('#demo').addEventListener('click',()=>{
 const entering=snapshot.mode!=='demo';
 if(entering){
  wantLive=false;
  applySnapshot(demoSnapshot(),{demoMotion:true});
 }else{
  wantLive=true;
  applySnapshot(disconnectedSnapshot(),{demoMotion:false});
  refreshLive({manual:true});
  startLivePolling();
 }
});

try{
 office=createOffice($('#canvas-container'),choose,stats=>{$('#model-status').textContent=`Avatares: ${stats.loaded}/16${stats.failed?' · No se pudieron cargar '+stats.failed:''}`;},id=>command.openAgenda(id),id=>setFloor(id));
 office.setNight(nightMode);
 office.setDemo(false);
 office.setStatuses(snapshot);
}catch(error){$('#fallback').hidden=false;console.error('WebGL no disponible:',error);}
paintSource();
refreshLive();
startLivePolling();
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
 viewMode=button.dataset.view;selected=null;office?.select(null);office?.setMode(viewMode);if(viewMode==='exterior')$('#walls').checked=true;setFloor(-1);
}));
$('#walls').addEventListener('change',e=>office?.setWalls(e.target.checked));
$('#night').addEventListener('change',e=>{nightMode=e.target.checked;saveNightPreference(nightMode);document.documentElement.dataset.theme=nightMode?'night':'day';office?.setNight(nightMode);});
$('#rotate-left').addEventListener('click',()=>office?.rotate(-.25));$('#rotate-right').addEventListener('click',()=>office?.rotate(.25));$('#zoom-in').addEventListener('click',()=>office?.zoom(.84));$('#zoom-out').addEventListener('click',()=>office?.zoom(1.18));$('#reset').addEventListener('click',()=>office?.reset());
render();
setInterval(()=>{
 if(!selected)return;const b=snapshot.bots.find(b=>b.id===selected);if(!b)return;
 const node=detail.querySelector('[data-profile-field="activity"]');if(node)node.textContent=botProfile(snapshot,b,office?.getActivity?.(selected)).activity;
},1000);
setInterval(()=>{const node=$('#movement-overview');if(!node)return;const agents=office?.getMovementStats?.().agents??[];if(snapshot.mode!=='demo'){node.textContent='Sin movimiento de trabajo real.';return;}node.textContent=`Solo ejemplo: ${agents.filter(a=>a.seated).length} sentados · ${agents.filter(a=>a.moving).length} caminando · ${agents.filter(a=>!a.seated&&!a.moving).length} en espera o descanso`;},1000);
