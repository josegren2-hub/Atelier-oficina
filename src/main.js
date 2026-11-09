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
import {createMandoSession} from './mando-session.js';
import {mountEquipoPanel} from './equipo-panel.js';
import {mountSelectionLabels} from './selection-labels.js';
import {mountHistoryBack} from './history-back.js';
import {mountAvisosPanel} from './avisos-panel.js';
import {mountPizarron, buildPizarronModel} from './pizarron.js';
import {avatarPhotoUrl} from './avatar-photo.js';
const $=s=>document.querySelector(s);
mountReleaseNotice();
let snapshot=disconnectedSnapshot(),floor=-1,rosterFloor=-1,viewMode='exterior',selected=null,office,detailReturn=null,liveTimer=null,wantLive=true;
let nightMode=readNightPreference();
$('#night').checked=nightMode;
document.documentElement.dataset.theme=nightMode?'night':'day';
function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
const mandoSession=createMandoSession({onChange:()=>{if(snapshot.mode==='live')applySnapshot(enrichSnapshot(snapshot),{demoMotion:false});else paintMando();}});
const command=mountCommandCenter({getSnapshot:()=>snapshot,onChoose:id=>choose(id)});
const avisosPanel=mountAvisosPanel({getSnapshot:()=>snapshot,onChoose:id=>choose(id),container:document.body});

const nav=$('#floors'),detail=$('#detail');
const mandoDialog=$('#mando-dialog');
const equipo=mountEquipoPanel({
 getSnapshot:()=>snapshot,
 getSelected:()=>selected,
 onSelect:id=>choose(id,{fromEquipo:true}),
});
const pizarron=mountPizarron({
 getModel:()=>buildPizarronModel({
  mando:mandoSession.unlocked?mandoSession.mando:null,
  waiting:(snapshot.bots||[]).filter(b=>b.status==='review'&&!b.stale),
  bots:snapshot.bots||[],
 }),
 onSelect:id=>choose(id),
});
let selectionLabels=null;
const historyBack=mountHistoryBack({
 isDetailOpen:()=>detail.open,
 closeDetail:()=>closeDetail(),
 isPizarronOpen:()=>pizarron.isOpen(),
 closePizarron:()=>pizarron.close(),
 isEquipoOpen:()=>equipo.isOpen(),
 foldEquipo:()=>equipo.fold(),
 isZoomedOrFloor:()=>{const v=office?.getViewState?.();return !!(v&&(v.floor>=0||v.selected));},
 resetView:()=>{selected=null;office?.select(null);setFloor(-1,{syncRoster:false});office?.setMode(viewMode==='spread'?'exterior':viewMode);},
 isCommandOpen:()=>!!document.querySelector('.cc-dialog[open]'),
 closeCommand:()=>command.close(),
 isMandoOpen:()=>!!mandoDialog?.open,
 closeMando:()=>mandoDialog?.close(),
});
function paintMando(){
 const unlocked=mandoSession.unlocked;
 const btn=$('#mando-unlock');
 const status=$('#mando-status');
 if(btn){btn.textContent=unlocked?'Mando desbloqueado':'Desbloquear mando';btn.setAttribute('aria-pressed',String(unlocked));}
 if(status){status.textContent=unlocked?'Mando desbloqueado · cifrado local':'Mando bloqueado';status.classList.toggle('unlocked',unlocked);}
}
function tasksFromMando(liveBots){
 if(!mandoSession.unlocked||!mandoSession.mando)return null;
 const tasks=[];
 for(const bot of liveBots){
  const m=mandoSession.botRecord(bot.id);
  if(!m)continue;
  if(bot.status==='working'&&(bot.task||m.tarea)){
   tasks.push({id:`live-work-${bot.id}`,title:bot.task||m.tarea,status:'in_progress',botId:bot.id,description:bot.liveTask?.detail||'',dueAt:'',urgent:false});
  }
  if(bot.status==='review'){
   const title=m.pendiente||bot.pendiente||`Te espera · ${bot.name}`;
   tasks.push({id:`live-wait-${bot.id}`,title,status:'authorization',botId:bot.id,description:'Estado en vivo: te espera',dueAt:bot.waitingSince||'',urgent:false});
   for(const item of (m.ok||[])){
    if(!item)continue;
    tasks.push({id:`live-auth-${bot.id}-${tasks.length}`,title:item,status:'authorization',botId:bot.id,description:'Pendiente de autorización',dueAt:'',urgent:false});
   }
  }else if(m.tarea&&bot.status!=='working'){
   tasks.push({id:`live-task-${bot.id}`,title:m.tarea,status:'pending',botId:bot.id,description:'Tarea del mando',dueAt:'',urgent:false});
  }
 }
 return tasks;
}
function enrichSnapshot(base){
 const bots=base.bots.map(b=>mandoSession.enrichBot(b));
 const tasks=tasksFromMando(bots);
 return {...base,bots,mandoUnlocked:mandoSession.unlocked,tasks:tasks??base.tasks,notifications:base.notifications,salud:base.salud??null};
}
for(const f of floors){
 const title=`${f.id===0?'PB':f.id} · ${f.name}`;
 for(const selector of ['#floor-jump','#roster-floor']){const option=el('option',title);option.value=f.id;$(selector).append(option);}
}
$('#floor-jump').addEventListener('change',e=>setFloor(Number(e.target.value)));
$('#roster-floor').addEventListener('change',e=>{rosterFloor=Number(e.target.value);renderRoster();});
$('#command-open').addEventListener('click',()=>command.open());
$('#pending-open').addEventListener('click',()=>command.open('waiting'));
$('#notifications-open').addEventListener('click',()=>avisosPanel.open());
$('#avisos-open')?.addEventListener('click',()=>avisosPanel.open());
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
function choose(id,{fromEquipo=false}={}){
 const b=snapshot.bots.find(b=>b.id===id);if(!b)return;
 if(!detail.open){const focus=document.activeElement;detailReturn={floor,focus,botId:focus?.dataset.botId};}
 selected=id;
 if(floor!==b.floor)setFloor(b.floor,{syncRoster:false});
 if(office?.focusBot)office.focusBot(id,{openFloor:false});
 else office?.select(id);
 render();
 equipo.refresh();
 historyBack.push();
 if(!detail.open)detail.showModal();
 $('#detail-close').focus();
}
function closeDetail({all=false}={}){
 const context=detailReturn;detailReturn=null;selected=null;office?.select(null);
 equipo.refresh();
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
  const avatar=el('span','','avatar');
  const photo=document.createElement('img');photo.src=avatarPhotoUrl(b.id);photo.alt='';photo.width=32;photo.height=32;photo.loading='lazy';photo.decoding='async';
  const indicator=el('span','',`status-dot status-${b.status}`);indicator.setAttribute('aria-label',statusLabels[b.status]||'Sin señal');indicator.title=statusLabels[b.status]||'Sin señal';
  avatar.append(photo,indicator);
  const text=el('span','');text.append(el('strong',b.name),el('small',b.role));
  button.append(avatar,text,el('em',snapshot.mode==='demo'?'DEMO':snapshot.mode==='live'?'EN VIVO':'SIN SEÑAL'));
  button.addEventListener('click',()=>choose(b.id));holder.append(button);
 }
 if(!list.length)holder.append(el('p','No hay bots que coincidan. Usa «Ver todos» para quitar los filtros.','muted'));
}
function renderDetail(){
 if(!selected)return;
 const b=snapshot.bots.find(b=>b.id===selected);if(!b)return;
 const profile=botProfile(snapshot,b,office?.getActivity?.(selected));
 $('#detail-title').textContent=b.name;$('#detail-role').textContent=b.role;$('#detail-source').textContent=profile.source;
 const headPhoto=$('#detail-photo');
 if(headPhoto){headPhoto.src=avatarPhotoUrl(b.id);headPhoto.hidden=false;}
 const facts=$('#detail-facts');facts.replaceChildren();
 const rows=[
  ['Planta',`${b.floor===0?'PB':`Piso ${b.floor}`} · ${floors[b.floor].name}`,'floor'],
  ['Estado',profile.status,'status'],['¿Está activo?',profile.active,'active'],
  ['Actividad ahora',profile.activity,'activity'],['Tarea actual',profile.currentTask,'current'],
 ];
 if(profile.waitingNote)rows.push(['Te espera',profile.waitingNote,'waiting']);
 if(profile.authorization)rows.push(['Autorización',profile.authorization,'authorization']);
 if(profile.agente)rows.push(['Subagente',profile.agente,'agente']);
 rows.push(['Tarea anterior',profile.previousTask,'previous'],['Última señal real',profile.lastSignal,'signal']);
 for(const [label,value,key] of rows){const row=el('div',undefined,'detail-fact'),valueNode=el('dd',value);valueNode.dataset.profileField=key;row.append(el('dt',label),valueNode);facts.append(row);}
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
  salud:result.salud??null,
  bots:bots.map(base=>{
   const live=byId.get(base.id);
   if(!live)return {...base,status:'unknown',task:null,previousTask:null,activity:null,lastSignal:null,stale:true,waitingSince:null};
   return {...base,status:live.status,task:live.task,previousTask:null,activity:live.task,lastSignal:live.lastSignal,stale:live.stale,waitingSince:live.waitingSince||null};
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
 const foot=$('#team-disclaimer');
 if(foot){
  foot.textContent=demo?'Ejemplos simulados. Sin actividad real.'
   :live?'Identidades reales. Actividad en vivo desde estado.json.'
   :'Identidades reales. Sin conexión a estado.json.';
 }
}

function applySnapshot(next,{demoMotion=false}={}){
 snapshot=next.mode==='live'?enrichSnapshot(next):{...next,mandoUnlocked:false};
 office?.setDemo(demoMotion);
 office?.setStatuses(snapshot);
 command.refresh();
 avisosPanel?.refresh?.();
 paintSource();
 paintMando();
 equipo.refresh();
 pizarron.refresh();
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
 selectionLabels=mountSelectionLabels({
  getSnapshot:()=>snapshot,
  getSelected:()=>selected,
  projectBots:()=>office?.projectBots?.()||[],
  getActivity:id=>office?.getActivity?.(id)||null,
  onSelect:id=>choose(id),
  container:$('#viewport')||document.body,
 });
}catch(error){$('#fallback').hidden=false;console.error('WebGL no disponible:',error);}
$('#pizarron-open')?.addEventListener('click',()=>{pizarron.open();historyBack.push();});
paintSource();
paintMando();
$('#mando-unlock')?.addEventListener('click',()=>{
 if(mandoSession.unlocked){
  mandoSession.lock();
  if(snapshot.mode==='live')applySnapshot({mode:snapshot.mode,source:snapshot.source,lastSignal:snapshot.lastSignal,salud:snapshot.salud??null,bots:snapshot.bots.map(b=>({...b}))});
  else paintMando();
  $('#refresh-feedback').textContent='Mando bloqueado en este navegador.';
  return;
 }
 $('#mando-error').textContent='';
 $('#mando-pass').value='';
 if(!mandoDialog.open)mandoDialog.showModal();
 $('#mando-pass').focus();
});
$('#mando-dialog-close')?.addEventListener('click',()=>mandoDialog.close());
$('#mando-lock')?.addEventListener('click',()=>{
 mandoSession.lock();
 mandoDialog.close();
 if(snapshot.mode==='live')applySnapshot({mode:snapshot.mode,source:snapshot.source,lastSignal:snapshot.lastSignal,salud:snapshot.salud??null,bots:snapshot.bots.map(b=>({...b}))});
 else paintMando();
 $('#refresh-feedback').textContent='Mando bloqueado y clave olvidada.';
});
$('#mando-form')?.addEventListener('submit',async e=>{
 e.preventDefault();
 const pass=$('#mando-pass').value;
 const remember=$('#mando-remember').checked;
 $('#mando-error').textContent='Desbloqueando…';
 try{
  await mandoSession.unlock(pass,{remember});
  $('#mando-pass').value='';
  mandoDialog.close();
  if(snapshot.mode==='live')applySnapshot({mode:snapshot.mode,source:snapshot.source,lastSignal:snapshot.lastSignal,salud:snapshot.salud??null,bots:snapshot.bots.map(b=>({...b}))});
  else paintMando();
  $('#refresh-feedback').textContent='Mando desbloqueado. Las frases cifradas se leen solo en este navegador.';
 }catch(err){
  $('#mando-error').textContent=err?.message||'No se pudo desbloquear';
 }
});
mandoSession.tryRestore().then(()=>{if(snapshot.mode==='live')applySnapshot({mode:snapshot.mode,source:snapshot.source,lastSignal:snapshot.lastSignal,salud:snapshot.salud??null,bots:snapshot.bots.map(b=>({...b}))});else paintMando();});
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
setInterval(()=>{const node=$('#movement-overview');if(!node)return;const agents=office?.getMovementStats?.().agents??[];if(snapshot.mode==='live'){node.textContent=`En vivo: ${agents.filter(a=>a.seated).length} en puesto · ${agents.filter(a=>a.moving).length} en tránsito · ${agents.filter(a=>!a.seated&&!a.moving).length} en pausa o juntas`;return;}if(snapshot.mode!=='demo'){node.textContent='Sin movimiento (sin conexión).';return;}node.textContent=`Solo ejemplo: ${agents.filter(a=>a.seated).length} sentados · ${agents.filter(a=>a.moving).length} caminando · ${agents.filter(a=>!a.seated&&!a.moving).length} en espera o descanso`;},1000);

function consumeDeepLink(){
  try{
    const q=new URLSearchParams(location.search);
    const bot=q.get('bot');
    const abrir=q.get('abrir');
    if(abrir==='avisos'||abrir==='notificaciones')avisosPanel.open();
    else if(abrir==='esperan'||abrir==='waiting')command.open('waiting');
    else if(abrir==='mando')command.open('stats');
    if(bot&&bots.some(b=>b.id===bot)){
      let tries=0;
      const go=()=>{
        tries+=1;
        try{choose(bot);}catch(e){/* office may still be wiring */}
        if(detail?.open)return;
        if(tries<12)setTimeout(go,250);
      };
      setTimeout(go, snapshot.mode==='live'||snapshot.mode==='demo' ? 300 : 700);
    }
    if(bot||abrir){
      const clean=new URL(location.href);clean.searchParams.delete('bot');clean.searchParams.delete('abrir');
      history.replaceState({},'',clean.pathname+clean.search+clean.hash);
    }
  }catch(e){console.warn('deep link',e);}
}
addEventListener('load',()=>setTimeout(consumeDeepLink,500));
