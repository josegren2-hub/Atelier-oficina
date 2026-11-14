import './style.css';
import {mountReleaseNotice} from './release-notice.js';
import './command-center.css';
import {bots,floors,disconnectedSnapshot,demoSnapshot,statusLabels} from './data.js';
import {readSnapshot} from './adapter.js';
import {SOURCE_CONTRACT} from './source-contract.js';
import {mountCommandCenter} from './command-center.js';
import {filterRoster,botProfile} from './roster.js';
import {readNightPreference,saveNightPreference} from './theme-state.js';
import {createMandoSession} from './mando-session.js';
import {openArchivero, resetArchiveroCache} from './archivero-ui.js';
import {mountEquipoPanel} from './equipo-panel.js';
import {mountSelectionLabels} from './selection-labels.js';
import {mountHistoryBack} from './history-back.js';
import {mountAvisosPanel} from './avisos-panel.js';
import {mountPizarron, buildPizarronModel} from './pizarron.js';
import {avatarPhotoUrl} from './avatar-photo.js';
import {DEPARTMENTS, departmentOf} from './departments.js';
import {mountQuickReplies} from './quick-replies.js';
import {mountFichaLocal} from './ficha-local.js';
import {mountResumenPanel, rachaText} from './resumen-panel.js';
import {mountStaleBanner} from './stale-banner.js';
import {readLightPref, saveLightPref, resolveLighting, cycleLightPref} from './daylight.js';
import {isPostponed} from './local-waiting.js';
import {ICON, iconHtml} from './icons.js';
import {mountProyectosPanel} from './proyectos-panel.js';
import {mountFichaFlotante} from './ficha-flotante.js';
import {bindSwipeToClose} from './ui-sheets.js';
import {sheets, bindChromeNow} from './ui-chrome.js';
import {dedupeFactRows} from './text-clip.js';
import {copyAndOpenChat} from './quick-replies.js';
import {loadUsoEnc, getUsoState, setUsoState, displayUsoLine, onUsoChange} from './uso-feed.js';

const $=s=>document.querySelector(s);
mountReleaseNotice();
if(typeof matchMedia==='function'&&matchMedia('(max-width: 760px)').matches)document.body.classList.add('equipo-cerrado');
let snapshot=disconnectedSnapshot(),floor=-1,rosterFloor=-1,viewMode='exterior',selected=null,office,detailReturn=null,liveTimer=null,wantLive=true;
let lightPref=readLightPref();
let nightMode=resolveLighting(lightPref).isNight;
if($('#night'))$('#night').checked=nightMode;
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
const quickReplies=mountQuickReplies(document.querySelector('#detail .detail-content')||document.querySelector('#detail'),{
 getBot:()=>snapshot.bots.find(b=>b.id===selected),
 onToast:msg=>{$('#refresh-feedback').textContent=msg;},
});
const fichaLocal=mountFichaLocal(document.querySelector('#detail .detail-content')||document.querySelector('#detail'),{
 getBot:()=>snapshot.bots.find(b=>b.id===selected),
 onChange:()=>{render();command.refresh();},
 onToast:msg=>{$('#refresh-feedback').textContent=msg;},
});
const resumenPanel=mountResumenPanel({
 getSnapshot:()=>snapshot,
 getMando:()=>mandoSession.unlocked?mandoSession.mando:null,
 onChoose:id=>choose(id),
});
const staleBanner=mountStaleBanner(document.body);
const proyectosPanel=mountProyectosPanel({
  getKey:()=>mandoSession.key||null,
  onClose:()=>$('#dock-proyectos')?.setAttribute('aria-pressed','false'),
  getBots:()=>snapshot.bots,
  onChoose:id=>{sheets.close('proyectos');choose(id);},
});
bindChromeNow();
const fichaFlotante=mountFichaFlotante({
  container:$('#viewport')||document.body,
  getProjected:(id)=>{
    const list=office?.projectBots?.()||[];
    const hit=list.find(p=>p.id===id);
    if(!hit||hit.hidden)return null;
    const rect=($('#canvas-container')||$('#viewport')||document.body).getBoundingClientRect();
    return {x:rect.left+hit.x, y:rect.top+hit.y};
  },
  onClose:()=>{
    const context=detailReturn;detailReturn=null;selected=null;office?.select(null);equipo.refresh();
    // C28 (Rob t288): closing the ficha keeps the camera where it is.
    renderRoster();
  },
  onOpenFull:(id)=>{fichaFlotante.close();openFullDetail(id);},
});
// Inject line icons into chrome buttons that declare data-ico
document.querySelectorAll('[data-ico]').forEach(node=>{
  const name=node.getAttribute('data-ico');
  if(ICON[name]) node.innerHTML=ICON[name];
});
// Fill ico placeholders inside buttons

function openMas(open){
  const panel=$('#mas-panel'); const btn=$('#mas-open');
  if(!panel)return;
  if(open){panel.hidden=false;requestAnimationFrame(()=>panel.classList.add('open'));btn?.setAttribute('aria-expanded','true');if(typeof historyBack!=='undefined')historyBack.push();}
  else{panel.classList.remove('open');btn?.setAttribute('aria-expanded','false');setTimeout(()=>{if(!panel.classList.contains('open'))panel.hidden=true;},380);}
}

/* D7 (Rob 13/11): an option opened from Paneles or Más returns there when closed. Choosing a bot clears it. */
let returnTo=null;
function backToOrigin(){const o=returnTo;returnTo=null;if(!o)return;setTimeout(()=>{if(!document.querySelector('dialog[open]')&&!fichaFlotante.isOpen()&&!detail.open)sheets.open(o);},0);}
function togglePaneles(){sheets.toggle('paneles');}
let panelesOpen=false; /* B4: estado propio; no depende de que el rAF ya haya puesto la clase .open */
function setPanelesOpen(open){
  panelesOpen=!!open;
  const sheet=$('#paneles-sheet');
  document.body.classList.toggle('paneles-cerrados',!open);
  if(!sheet)return;
  if(open){const dk=$('#dock');if(dk&&isPhone()){const top=dk.getBoundingClientRect().top;if(top>0)sheet.style.setProperty('bottom',`${Math.max(0,Math.round(innerHeight-top))}px`,'important');}sheet.hidden=false;void sheet.offsetWidth;sheet.classList.add('open');}
  else{sheet.classList.remove('open');setTimeout(()=>{if(sheet&&!panelesOpen)sheet.hidden=true;},380);}
  $('#dock-paneles')?.setAttribute('aria-pressed',String(!!open));
}
(function ensurePanelesSheet(){
  if($('#paneles-sheet'))return;
  const s=document.createElement('div');
  s.id='paneles-sheet';s.className='glass-sheet';s.hidden=true;
  const top=document.createElement('div');top.className='sheet-top';
  const left=document.createElement('div');
  const ey=document.createElement('p');ey.className='eyebrow';ey.textContent='PANELES';
  const h2=document.createElement('h2');h2.textContent='Accesos';
  left.append(ey,h2);
  const close=document.createElement('button');close.type='button';close.className='icon-btn';close.setAttribute('aria-label','Cerrar');close.textContent='×';
  top.append(left,close);
  const box=document.createElement('div');box.className='paneles-actions';
  /* B4 tanda 1 (D6, boceto aprobado t336u): una hilera; Notificaciones + Avisos = «Avisos»; «Celular» = configurar avisos al teléfono. */
  const ICO={lista:'<path d="M5 6h14M5 12h14M5 18h9"/>',campana:'<path d="M6 17h12l-1.5-2V11a4.5 4.5 0 0 0-9 0v4z M10 20h4"/>',cel:'<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',cal:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',ref:'<path d="M19 12a7 7 0 1 1-2-4.9M19 4v4h-4"/>'};
  box.className='paneles-actions sj-row1';
  for(const [id,label,ico] of [['pending-open','Pendientes','lista'],['notifications-open','Avisos','campana'],['avisos-open','Celular','cel'],['pizarron-open','Pizarrón','cal'],['refresh-office','Actualizar','ref']]){
    const src=document.getElementById(id);
    if(!src)continue;
    const b=document.createElement('button');
    b.type='button';b.className='sj-ic';b.dataset.panel=id;
    b.innerHTML=`<span class="sj-ic-g"><svg viewBox="0 0 24 24" aria-hidden="true">${ICO[ico]}</svg>${id==='pending-open'?'<em class="sj-badge" hidden></em>':''}</span><span>${label}</span>`;
    b.addEventListener('click',()=>{if(id==='refresh-office'){src.click();return;}returnTo='paneles';src.click();if(id==='avisos-open')setTimeout(()=>document.querySelector('.avisos-dialog [data-topic-form]')?.scrollIntoView({block:'center'}),120);});
    box.append(b);
  }
  const fb=document.createElement('p');fb.className='paneles-feedback small muted';fb.setAttribute('role','status');
  const rf=document.getElementById('refresh-feedback');
  if(rf&&typeof MutationObserver==='function')new MutationObserver(()=>{fb.textContent=rf.textContent;}).observe(rf,{childList:true,characterData:true,subtree:true});
  s.append(top,box,fb);
  document.body.append(s);
  close.addEventListener('click',()=>sheets.close('paneles'));
})();

function isPhone(){return typeof matchMedia==='function'&&matchMedia('(max-width: 760px)').matches;}
function setEquipoSheet(open){
  document.body.classList.toggle('equipo-cerrado',!open);
  document.body.classList.toggle('equipo-abierto',!!open);
  $('#dock-equipo')?.setAttribute('aria-pressed',String(!!open));
  if(open)historyBack.push();
}
function isEquipoSheetOpen(){
  return isPhone()?document.body.classList.contains('equipo-abierto'):equipo.isOpen();
}
function openEquipoNow(){
  if(isPhone())setEquipoSheet(true);
  else{equipo.open();$('#dock-equipo')?.setAttribute('aria-pressed','true');historyBack.push();}
}
function closeEquipoNow(){
  equipo.fold();
  setEquipoSheet(false);
  $('#dock-equipo')?.setAttribute('aria-pressed','false');
}
function paintDockLight(){
  const btn=$('#dock-noche');if(!btn)return;
  const lit=resolveLighting(lightPref);
  const lab=lightPref==='auto'?'Auto':lightPref==='noche'?'Noche':'Día';
  const ico=lightPref==='auto'?ICON.auto:(lit.isNight||lightPref==='noche'?ICON.noche:ICON.dia);
  btn.innerHTML=`<span class="ico">${ico}</span><span class="lbl">${lab}</span>`;
  btn.setAttribute('aria-pressed',String(lightPref!=='auto'));
  btn.title=lightPref==='auto'?'Luz automática (noche 19:00–07:00, Chihuahua). Toca para Noche, Día o Auto.':lightPref==='noche'?'Noche fija. Toca para pasar a Día.':'Día fijo. Toca para volver a Auto.';
}
$('#dock-noche')?.addEventListener('click',()=>{
  lightPref=cycleLightPref(lightPref);
  saveLightPref(lightPref);
  applyDaylight();
});


const historyBack=mountHistoryBack({
 isDetailOpen:()=>detail.open||fichaFlotante.isOpen(),
 closeDetail:()=>{if(fichaFlotante.isOpen())fichaFlotante.close({notify:true});else closeDetail();},
 isPizarronOpen:()=>pizarron.isOpen(),
 closePizarron:()=>pizarron.close(),
 isEquipoOpen:()=>equipo.isOpen()||(isPhone()&&document.body.classList.contains('equipo-abierto')),
 foldEquipo:()=>{equipo.fold();if(isPhone())setEquipoSheet(false);},
 isZoomedOrFloor:()=>{const v=office?.getViewState?.();return !!(v&&(v.floor>=0||v.selected));},
 resetView:()=>{selected=null;office?.select(null);setFloor(-1,{syncRoster:false});office?.setMode(viewMode==='spread'?'exterior':viewMode);},
 isCommandOpen:()=>!!document.querySelector('.cc-dialog[open]'),
 closeCommand:()=>command.close(),
 isMandoOpen:()=>!!mandoDialog?.open,
 closeMando:()=>mandoDialog?.close(),
 isResumenOpen:()=>resumenPanel?.isOpen?.(),
 closeResumen:()=>resumenPanel?.close?.(),
 isAnySheet:()=>sheets.anyOpen(),
 closeAnySheet:()=>sheets.closeAll(),
});
function paintMando(){
 const unlocked=mandoSession.unlocked;
 const btn=$('#mando-unlock');
 const status=$('#mando-status');
 if(btn){
  btn.innerHTML=`<span class="ico">${ICON.mando}</span><span class="lbl">${unlocked?'Desbloqueado':'Mando'}</span>`;
  btn.setAttribute('aria-pressed',String(unlocked));
  btn.title=unlocked?'Mando desbloqueado':'Desbloquear mando';
 }
 const dockM=$('#dock-mando');
 if(dockM){dockM.setAttribute('aria-pressed',String(unlocked));dockM.title=unlocked?'Mando desbloqueado':'Desbloquear mando';}
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
if($('#roster-dept')){
 for(const name of Object.keys(DEPARTMENTS)){const o=el('option',name);o.value=name;$('#roster-dept').append(o);}
}
$('#floor-jump').addEventListener('change',e=>setFloor(Number(e.target.value)));
$('#roster-floor').addEventListener('change',e=>{rosterFloor=Number(e.target.value);renderRoster();});
$('#pending-open').addEventListener('click',()=>{sheets.closeAll('consulta');command.open('waiting');historyBack.push();});
$('#refresh-office').addEventListener('click',()=>{command.refresh();if(wantLive&&snapshot.mode!=='demo'){refreshLive({manual:true});}else{$('#refresh-feedback').textContent=snapshot.mode==='demo'?'Vista demo actualizada. Sin consulta a la fuente en vivo.':'Vista actualizada. Sin fuente en vivo activa.';}});
function toggleAvatars(open){$('#avatar-dropdown').hidden=!open;$('#avatars-toggle').setAttribute('aria-expanded',String(open));if(open){const frame=$('#avatar-dropdown iframe');if(!frame.getAttribute('src'))frame.src=frame.dataset.src;$('#avatars-close').focus();historyBack.push();}else $('#avatars-toggle').focus();}
$('#avatars-close').addEventListener('click',()=>sheets.close('avatares'));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]')&&!$('#avatar-dropdown').hidden)toggleAvatars(false);});
for(const f of [{id:-1,name:'Todo el edificio'},...floors]){
 const button=el('button','');button.dataset.floor=f.id;button.setAttribute('aria-pressed',String(f.id===floor));
 button.append(el('b',f.id<0?'◎':f.id===0?'PB':`0${f.id}`),el('span',f.name));button.addEventListener('click',()=>setFloor(f.id));nav.append(button);
}
for(const f of floors){
 const b=el('button',f.id===0?'PB':String(f.id).padStart(2,'0'));b.title=b.ariaLabel=`${f.id===0?'PB':String(f.id).padStart(2,'0')} · ${f.name}`;b.setAttribute('aria-label',b.title);b.addEventListener('click',()=>setFloor(f.id));$('#spread-floors').append(b);
}
function setFloor(id,{syncRoster=true}={}){
 if(id!==-1&&!floors.some(f=>f.id===id))return;
 $('#floor-jump').value=String(id);
 // Only a deliberate floor filter changes the roster. Opening a profile does not.
 if(syncRoster){rosterFloor=id;$('#roster-floor').value=String(id);}
 floor=id;
 const spread=viewMode==='spread'&&id<0;
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(id<0&&b.dataset.view===viewMode)));
 nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.floor)===id)));
 $('#view-title').textContent=id<0?({exterior:'San Junipero Corp',stacked:'Columna de plantas',spread:'Plantas'}[viewMode]):floors[id].name;
 $('#view-kicker').textContent=spread?'PLANTAS · LAS 6':id<0?({exterior:'EDIFICIO CERRADO',stacked:'SEPARACIÓN AMPLIA'}[viewMode]):`PLANTA ${id===0?'BAJA':id}`;
 $('#viewport').classList.toggle('spread-view',spread);
 $('#spread-picker').hidden=!spread;
 if($('#spread-floors'))$('#spread-floors').hidden=false;
 if($('#spread-next'))$('#spread-next').hidden=true;
 if($('#spread-previous'))$('#spread-previous').hidden=true;
 if($('#spread-page-label')){$('#spread-page-label').hidden=true;$('#spread-page-label').textContent='';}
 $('.gesture').textContent=spread?'Toca un avatar para ver su ficha · las seis plantas en una página':'Toca un avatar para ver su ficha · arrastra para girar · pellizca para acercar';
 office?.setView(id);renderRoster();
 const active=nav.querySelector('[aria-pressed=true]');
 if(active){const left=active.offsetLeft-nav.offsetLeft-(nav.clientWidth-active.offsetWidth)/2;nav.scrollTo({left:Math.max(0,left),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
}
function openFullDetail(id){
 const b=snapshot.bots.find(b=>b.id===id);if(!b)return;
 selected=id;office?.select(id);render();equipo.refresh();
 if(!detail.open)detail.showModal();
 $('#detail-close').focus();
}
function choose(id,{fromEquipo=false,full=false}={}){
 const b=snapshot.bots.find(b=>b.id===id);if(!b)return;
 returnTo=null;
 // Capture return context BEFORE changing floor (restores previous vista on close).
 // Always remember previous floor/focus before flying to the bot's planta.
 if(!detail.open&&!fichaFlotante.isOpen()){const focus=document.activeElement;detailReturn={floor,focus,botId:focus?.dataset.botId||id};}
 selected=id;
 if(floor!==b.floor)setFloor(b.floor,{syncRoster:false});
 if(office?.focusBot)office.focusBot(id,{openFloor:false});
 else office?.select(id);
 render();
 equipo.refresh();
 historyBack.push();
 if(full){openFullDetail(id);return;}
 const task=b.task||b.liveTask?.text||'';
 sheets.closeAll('ficha');
 fichaFlotante.open(b,{taskText:task,resumen:b.resumen||''});
}
function closeDetail({all=false}={}){
 const context=detailReturn;detailReturn=null;selected=null;office?.select(null);
 equipo.refresh();
 if(detail.open)detail.close();
 if(fichaFlotante.isOpen())fichaFlotante.close();
 if(all){$('#search').value='';setFloor(-1);}
 else renderRoster(); // C28b (Rob t295): closing the full ficha keeps the camera/floor where it is
 // Roster buttons are regenerated, so recover the original by its stable identity.
 const previousBot=context?.botId?document.querySelector(`[data-bot-id="${context.botId}"]`):null;
 const target=all?$('#show-all'):previousBot||(context?.focus?.isConnected&&context.focus!==document.body?context.focus:$('#canvas-container'));
 target?.focus({preventScroll:!all});
 if(all)$('#show-all').scrollIntoView({block:'nearest'});
}
$('#detail-close').addEventListener('click',()=>closeDetail());
$('#detail-chat')?.addEventListener('click',()=>{const b=snapshot.bots.find(x=>x.id===selected);if(b?.agente)copyAndOpenChat({agente:b.agente});});
/* Ir al avatar: cierra la ficha completa y abre la flotante junto al avatar (la cámara solo se mueve porque Rob lo pidió con el botón). */
$('#detail-goto')?.addEventListener('click',()=>{const id=selected;if(!id)return;closeDetail();choose(id);});
$('#detail-all').addEventListener('click',()=>closeDetail({all:true}));
$('#show-all').addEventListener('click',()=>closeDetail({all:true}));
detail.addEventListener('cancel',event=>{event.preventDefault();closeDetail();});
let pizarronWho='ted';
function openAgendaCalendar(id){/* C46a/b/c: every agenda option opens the calendar; Julián gets his work-only board */pizarronWho=id==='julian'?'julian':'ted';sheets.closeAll('pizarron');if(detail.open)detail.close();if(pizarron.isOpen())pizarron.open({who:pizarronWho});else sheets.open('pizarron');}
$('#detail-agenda').addEventListener('click',()=>{if(selected)openAgendaCalendar(selected);});
function renderRoster(){
 const list=filterRoster(snapshot.bots,{floor:rosterFloor,query:$('#search').value,department:$('#roster-dept')?.value||''});
 $('#roster-floor').value=String(rosterFloor);
 $('#bot-count').textContent=`${list.length} de ${snapshot.bots.length} bots`;
 $('#roster-scope').textContent=`${list.length} de ${snapshot.bots.length} bots · ${rosterFloor<0?'Todos los pisos':floors[rosterFloor].name}${$('#search').value.trim()?' · búsqueda activa':''}`;
 for(const selector of ['#show-all','#detail-all'])$(selector).textContent=`Ver todos (${snapshot.bots.length})`;
 const holder=$('#bot-list');holder.replaceChildren();
 for(const b of list){
  const button=el('button','',`bot ${b.id===selected?'selected':''}`);button.dataset.botId=b.id;
  button.setAttribute('aria-label',`${b.name}, ${b.role}, ${statusLabels[b.status]||'Sin señal'}`);button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','detail');
  const avatar=el('span','','avatar');
  const photo=document.createElement('img');photo.dataset.st=b.status||'unknown';photo.src=avatarPhotoUrl(b.id);photo.alt='';photo.width=32;photo.height=32;photo.loading='lazy';photo.decoding='async';
  const callado=b.callado&&b.callado.dias;const indicator=el('span','',`status-dot status-${b.status}${callado?' callado':''}${b.id==='ted'&&b.rutina&&(b.rutina.fallo||b.rutina.no_corrio)?' rutina-mal':''}`);indicator.setAttribute('aria-label',callado?`Callado ${Math.floor(b.callado.dias)} d`:statusLabels[b.status]||'Sin señal');indicator.title=callado?`Callado ${Math.floor(b.callado.dias)} d`:statusLabels[b.status]||'Sin señal';
  avatar.append(photo,indicator);
  const text=el('span','');text.append(el('strong',b.name),el('small',b.role),el('small',displayUsoLine(getUsoState(),b.id,b.mandoUso),'uso-line'));
  button.append(avatar,text,el('em',snapshot.mode==='demo'?'DEMO':snapshot.mode==='live'?'EN VIVO':'SIN SEÑAL'));
  button.addEventListener('click',()=>{if(isPhone())closeEquipoNow();choose(b.id);});holder.append(button);
 }
 if(!list.length)holder.append(el('p','No hay bots que coincidan. Usa «Ver todos» para quitar los filtros.','muted'));
}
function renderDetail(){
 if(!selected)return;
 const b=snapshot.bots.find(b=>b.id===selected);if(!b)return;
 const profile=botProfile(snapshot,b,office?.getActivity?.(selected));
 $('#detail-title').textContent=b.name;$('#detail-role').textContent=b.role;$('#detail-source').textContent=profile.source;const usoEl=$('#detail-uso');if(usoEl)usoEl.textContent=displayUsoLine(getUsoState(),b.id,b.mandoUso);
 const headPhoto=$('#detail-photo');
 if(headPhoto){headPhoto.src=avatarPhotoUrl(b.id);headPhoto.dataset.st=b.status||'unknown';headPhoto.hidden=false;}
 let stChip=$('#detail-st');
 if(stChip){const s=b.stale?'unknown':(b.status||'unknown');stChip.className=`ficha-st st-${s}`;stChip.dataset.st=s;stChip.textContent=b.stale?'Sin señal':(statusLabels[b.status]||'Sin señal');}
 const facts=$('#detail-facts');facts.replaceChildren();
 /* B4 tanda 1 (boceto D8): chips + secciones Ahora / Antes / Uso. Los nodos data-profile-field se conservan. */
 const live=snapshot.mode==='live'?'En vivo':snapshot.mode==='demo'?'Demo':'Sin señal';
 const fl=`${b.floor===0?'PB':`Piso ${b.floor}`} · ${floors[b.floor].name}`;
 $('#detail-eyebrow').textContent=`Ficha · ${b.floor===0?'PB':`Piso ${b.floor}`}`;
 $('#detail-floor-chip').textContent=fl;$('#detail-floor-chip').dataset.profileField='floor';
 $('#detail-live-chip').textContent=live;
 const rows=[
  ['Planta',`${b.floor===0?'PB':`Piso ${b.floor}`} · ${floors[b.floor].name}`,'floor'],
  ['Estado',profile.status,'status'],['¿Está activo?',profile.active,'active'],
  ['Actividad ahora',profile.activity,'activity'],['Tarea actual',profile.currentTask,'current'],
 ];
 if(profile.waitingNote)rows.push(['Te espera',profile.waitingNote,'waiting']);
 if(profile.authorization)rows.push(['Autorización',profile.authorization,'authorization']);
  rows.push(['Tarea anterior',profile.previousTask,'previous'],['Última señal real',profile.lastSignal,'signal']);
 const kept=dedupeFactRows(rows);const pick=k=>kept.find(r=>r[2]===k);
 const LBL={activity:'Actividad',current:'Tarea',active:'¿Activo?',waiting:'Te espera',authorization:'Autorización',previous:'Tarea'};
 const section=(title,keys,extra)=>{const s=el('section',undefined,'sj-sec');s.append(el('h4',title));const dl=el('dl','', 'sj-kv');
  for(const k of keys){const r=pick(k);if(!r)continue;const dd=el('dd',r[1]);dd.dataset.profileField=k;dl.append(el('dt',LBL[k]||r[0]),dd);}
  s.append(dl);if(extra)s.append(extra);return s;};
 facts.append(section('Ahora',['current','activity',...(b.status==='review'&&!b.stale?['waiting','authorization']:[])]));
 {const a=el('span',profile.active);a.dataset.profileField='active';a.hidden=true;facts.append(a);}
 facts.append(section('Antes',['previous']));
 const uso=el('p',displayUsoLine(getUsoState(),b.id,b.mandoUso),'sj-uso');facts.append(section('Uso',[],uso));
 const hid=el('span',profile.status);hid.dataset.profileField='status';hid.hidden=true;facts.append(hid);
 const sig=pick('signal');if(sig){const f=$('#detail-source');f.replaceChildren();const s=el('span',`Última señal ${sig[1]}`);s.dataset.profileField='signal';f.title=profile.source;f.append(s,el('span',snapshot.mode==='live'?` · Fuente estado.json${b.mandoUnlocked?' · mando':''}`:` · ${profile.source}`));}
 const chat=$('#detail-chat');if(chat){const ok=b.mandoUnlocked===true&&!!b.agente;chat.disabled=!ok;chat.title=ok?'Abre el chat del bot':'Disponible con el mando desbloqueado';}
 $('#detail-agenda').hidden=!['ted','julian'].includes(b.id);
 quickReplies.refresh(b);
 fichaLocal.refresh(b);
}
function render(){renderRoster();renderDetail();}
$('#search').addEventListener('input',renderRoster);
function setSearchOpen(open){
 const input=$('#search');const btn=$('#search-toggle');const tools=$('.roster-tools');
 if(!input||!btn)return;
 input.hidden=!open;
 btn.setAttribute('aria-expanded',String(open));
 tools?.classList.toggle('search-open',open);
 if(open){input.focus();input.select?.();}
}
$('#search-toggle')?.addEventListener('click',()=>{
 const willOpen=$('#search')?.hidden!==false?true:!($('.roster-tools')?.classList.contains('search-open'));
 // if already open and empty, close; if closed, open
 if($('#search')?.hidden){setSearchOpen(true);}
 else{setSearchOpen(false);}
});
function setDemoPreset(preset){snapshot=demoSnapshot(preset);office?.setDemo(true);office?.setStatuses(snapshot);command.refresh();render();$('#demo-preset-result').textContent=preset==='working'?'Ejemplo: todos van a su puesto para trabajar sentados.':preset==='idle'?'Ejemplo: paseo, lectura y descanso sin trabajo real.':'Ejemplo mixto: trabajando, esperando revisión y descansando.';}
document.querySelectorAll('[data-demo-preset]').forEach(button=>button.addEventListener('click',()=>setDemoPreset(button.dataset.demoPreset)));

function mergeLive(result){
 const byId=new Map(result.bots.map(b=>[b.id,b]));
 return {
  mode:'live',
  source:result.source,
  lastSignal:result.lastSignal,
  salud:result.salud??null,
  racha:result.racha??null,
  bots:bots.map(base=>{
   const live=byId.get(base.id);
   if(!live)return {...base,status:'unknown',task:null,previousTask:null,activity:null,lastSignal:null,stale:true,waitingSince:null};
   return {...base,status:live.status,task:live.task,previousTask:null,activity:live.task,lastSignal:live.lastSignal,stale:live.stale,waitingSince:live.waitingSince||null};
  }),
 };
}


function applyDaylight(){
 lightPref=readLightPref();
 const lit=resolveLighting(lightPref);
 nightMode=lit.isNight;
 if($('#night'))$('#night').checked=nightMode;
 document.documentElement.dataset.theme=nightMode?'night':'day';
 office?.setLighting?.(lit);
 const btn=$('#light-mode');
 if(btn){const lab=lightPref==='auto'?(nightMode?'Auto noche':'Auto día'):lightPref==='noche'?'Noche':'Día';btn.innerHTML=`<span class="ico">${lightPref==='auto'?ICON.auto:(nightMode||lightPref==='noche'?ICON.noche:ICON.dia)}</span><span class="lbl">${lab}</span>`;btn.title='Modo luz: Auto → Noche → Día (hora Chihuahua)';}
 paintDockLight();
 const r=$('#racha-open');
 if(r){r.innerHTML=`<span class="ico">${ICON.racha}</span><span class="lbl">${snapshot.racha?.dias??'–'}</span>`;r.title=rachaText(snapshot.racha);}
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
 staleBanner?.refresh?.(snapshot);
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
 applyDaylight();
 paintMando();
 equipo.refresh();
 pizarron.refresh();
 render();
 {const bd=document.querySelector('#paneles-sheet .sj-badge');if(bd){const n=snapshot.bots.filter(x=>x.status==='review'&&!x.stale).length;bd.textContent=String(n);bd.hidden=!n;}}
 const fid=fichaFlotante.getCurrentId?.();
 if(fid){const fb=snapshot.bots.find(x=>x.id===fid);if(fb)fichaFlotante.open(fb,{taskText:fb.task||fb.liveTask?.text||'',resumen:fb.resumen||''});}
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

function enterDemo(){
 wantLive=false;
 applySnapshot(demoSnapshot(),{demoMotion:true});
}
function exitDemo(){
 wantLive=true;
 applySnapshot(disconnectedSnapshot(),{demoMotion:false});
 refreshLive({manual:true});
 startLivePolling();
}
function toggleDemo(){if(snapshot.mode!=='demo')enterDemo();else exitDemo();}
$('#demo')?.addEventListener('click',()=>toggleDemo());
$('#demo-salir')?.addEventListener('click',e=>{e.preventDefault?.();e.stopPropagation?.();exitDemo();});

async function bootOffice(){
 if(office||bootOffice.busy)return;
 bootOffice.busy=true;
 try{
  const create=globalThis.__createOffice||(await import('./scene.js')).createOffice;
  office=create($('#canvas-container'),choose,stats=>{$('#model-status').textContent=`Avatares: ${stats.loaded}/16${stats.failed?' · No se pudieron cargar '+stats.failed:''}`;},id=>openAgendaCalendar(id),id=>{if(id!==floor)setFloor(id);},id=>openArchivero(id,mandoSession));
  globalThis.__atelierOffice=office;
  applyDaylight();
  office.setDemo(false);
  office.setStatuses(snapshot);
  selectionLabels=mountSelectionLabels({
   getSnapshot:()=>snapshot,
   getSelected:()=>selected,
   projectBots:()=>office?.projectBots?.()||[],
   getActivity:id=>office?.getActivity?.(id)||null,
   onSelect:id=>choose(id),
   container:$('#canvas-container')||$('#viewport')||document.body,
  });
 }catch(error){$('#fallback').hidden=false;console.error('WebGL no disponible:',error);}
 finally{bootOffice.busy=false;}
}
(function scheduleOfficeBoot(){
 let ran=false;
 const go=()=>{if(ran)return;ran=true;bootOffice();};
 // Tests inject __createOffice and must boot immediately. In the browser, wait so dock taps
 // during the first moments are not queued behind createOffice (C7).
 const delay=globalThis.__createOffice?0:1800;
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>{setTimeout(go,delay);});
 setTimeout(go,delay);
 if(typeof requestIdleCallback==='function')requestIdleCallback(go,{timeout:Math.max(delay,400)});
})();
paintSource();
paintMando();
$('#mando-unlock')?.addEventListener('click',()=>{
 if(mandoSession.unlocked){
  mandoSession.lock();
  resetArchiveroCache();
  if(snapshot.mode==='live')applySnapshot({mode:snapshot.mode,source:snapshot.source,lastSignal:snapshot.lastSignal,salud:snapshot.salud??null,bots:snapshot.bots.map(b=>({...b}))});
  else paintMando();
  $('#refresh-feedback').textContent='Mando bloqueado en este navegador.';
  refreshUso();
  return;
 }
 $('#mando-error').textContent='';
 $('#mando-pass').value='';
 if(!mandoDialog.open){sheets.closeAll('mando');mandoDialog.showModal();historyBack.push();}
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
  refreshUso();
 }catch(err){
  $('#mando-error').textContent=err?.message||'No se pudo desbloquear';
 }
});

let usoRefreshSeq=0;
async function refreshUso(){
  const seq=++usoRefreshSeq;
  if(!mandoSession.unlocked||!mandoSession.key){
    setUsoState({state:'locked',uso:null});
    resumenPanel.refresh?.();
    return;
  }
  const next=await loadUsoEnc({key:mandoSession.key});
  if(seq!==usoRefreshSeq)return;
  setUsoState(next);
  resumenPanel.refresh?.();
}
refreshUso();
onUsoChange(()=>{try{render();}catch{}resumenPanel.refresh?.();});
mandoSession.tryRestore().then(()=>{if(snapshot.mode==='live')applySnapshot({mode:snapshot.mode,source:snapshot.source,lastSignal:snapshot.lastSignal,salud:snapshot.salud??null,bots:snapshot.bots.map(b=>({...b}))});else paintMando();refreshUso();});
refreshLive();
startLivePolling();
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
 viewMode=button.dataset.view;selected=null;office?.select(null);office?.setMode(viewMode);if(viewMode==='exterior')$('#walls').checked=true;setFloor(-1);
}));
$('#walls').addEventListener('change',e=>office?.setWalls(e.target.checked));
$('#night')?.addEventListener('change',e=>{
 lightPref=e.target.checked?'noche':'dia';
 saveLightPref(lightPref);
 applyDaylight();
 $('#dock-noche')?.setAttribute('aria-pressed',String(e.target.checked));
});
$('#light-mode')?.addEventListener('click',()=>{
 lightPref=cycleLightPref(lightPref);
 saveLightPref(lightPref);
 applyDaylight();
});
function goLista(){
 const u=new URL(location.href);
 u.searchParams.set('abrir','lista');
 location.assign(u.pathname+u.search);
}
$('#vista-lista')?.addEventListener('click',goLista);
$('#dock-lista')?.addEventListener('click',goLista);
$('#dock-mando')?.addEventListener('click',()=>$('#mando-unlock')?.click());
$('#roster-dept')?.addEventListener('change',()=>renderRoster());

$('#rotate-left').addEventListener('click',()=>office?.rotate(-.25));$('#rotate-right').addEventListener('click',()=>office?.rotate(.25));$('#zoom-in').addEventListener('click',()=>office?.zoom(.84));$('#zoom-out').addEventListener('click',()=>office?.zoom(1.18));$('#reset').addEventListener('click',()=>office?.reset());
function closeMasAndSheets(){sheets.closeAll();}
function registerSheets(){
 sheets.register('equipo',{open:openEquipoNow,close:closeEquipoNow,isOpen:isEquipoSheetOpen});
 sheets.register('paneles',{open:()=>setPanelesOpen(true),close:()=>setPanelesOpen(false),isOpen:()=>panelesOpen&&!!$('#paneles-sheet')});
 sheets.register('proyectos',{open:()=>{proyectosPanel.open();$('#dock-proyectos')?.setAttribute('aria-pressed','true');historyBack.push();},close:()=>{proyectosPanel.close();$('#dock-proyectos')?.setAttribute('aria-pressed','false');},isOpen:()=>proyectosPanel.isOpen()});
 sheets.register('mas',{open:()=>openMas(true),close:()=>openMas(false),isOpen:()=>!!($('#mas-panel')&&!$('#mas-panel').hidden&&$('#mas-panel').classList.contains('open'))});
 sheets.register('avatares',{open:()=>toggleAvatars(true),close:()=>toggleAvatars(false),isOpen:()=>!!$('#avatar-dropdown')&&!$('#avatar-dropdown').hidden});
 sheets.register('resumen',{open:()=>{resumenPanel.open();historyBack.push();},close:()=>resumenPanel.close(),isOpen:()=>!!resumenPanel.isOpen?.()});
 sheets.register('consulta',{open:()=>{command.open();historyBack.push();},close:()=>command.close(),isOpen:()=>!!document.querySelector('.cc-dialog[open]')});
 sheets.register('mando',{open:()=>{mandoDialog?.showModal?.();historyBack.push();},close:()=>mandoDialog?.close?.(),isOpen:()=>!!mandoDialog?.open});
 sheets.register('ficha',{open:()=>{},close:()=>{if(fichaFlotante.isOpen())fichaFlotante.close({notify:true});},isOpen:()=>fichaFlotante.isOpen()});
 sheets.register('pizarron',{open:()=>{pizarron.open({who:pizarronWho});pizarronWho='ted';historyBack.push();},close:()=>pizarron.close(),isOpen:()=>pizarron.isOpen()});
 sheets.register('avisos',{open:()=>{avisosPanel.open();historyBack.push();},close:()=>{if(typeof avisosPanel.close==='function')avisosPanel.close();else avisosPanel.element?.close?.();},isOpen:()=>!!(avisosPanel.isOpen?.()||document.querySelector('.avisos-dialog[open]'))});
}
registerSheets();
for(const d of [avisosPanel.element,command.element,pizarron.element]){if(typeof d?.addEventListener==='function')d.addEventListener('close',backToOrigin);}
for(const ev of ['pointerdown','click'])$('#command-open')?.addEventListener(ev,()=>{if(sheets.isOpen('mas'))returnTo='mas';},true);
function bindOutsideClose(){
 document.addEventListener('pointerdown',e=>{
  const t=e.target;
  if(!(t instanceof Element))return;
  if(t.closest('#dock,#mas-open,#mas-panel,#paneles-sheet,#proyectos-sheet,.proy-sheet,#avatar-dropdown,#avatars-toggle,aside.team,#ficha-flotante,#detail,#mando-dialog,.resumen-dialog,.cc-dialog,.avisos-dialog,.pizarron-dialog,#mcpanel,#install-app,#demo-banner,.v17pin'))return;
  if(pizarron.isOpen())return; // non-modal pizarrón: a drag moves the 3D; a tap outside closes it (bindPizarronOutsideTap)
  if(sheets.anyOpen()){if(t.closest('#canvas-container'))globalThis.__atelierSwallowPickAt=performance.now();sheets.closeAll();}
 });
}
bindOutsideClose();
(function bindPizarronOutsideTap(){
 let d=null;
 document.addEventListener('pointerdown',e=>{d=null;if(!pizarron.isOpen())return;const t=e.target;if(!(t instanceof Element)||t.closest('.pizarron-dialog'))return;d={x:e.clientX,y:e.clientY,t:performance.now(),canvas:!!t.closest('#canvas-container')};},true);
 document.addEventListener('pointerup',e=>{const s=d;d=null;if(!s||!pizarron.isOpen())return;if(Math.hypot(e.clientX-s.x,e.clientY-s.y)>10)return;/* tap = little movement; no time limit (slow phones deliver pointerup late) */if(s.canvas)globalThis.__atelierSwallowPickAt=performance.now();sheets.close('pizarron');},true);
})();
bindSwipeToClose($('#mas-panel'),()=>sheets.close('mas'));
bindSwipeToClose($('#paneles-sheet'),()=>sheets.close('paneles'));
bindSwipeToClose($('#proyectos-sheet'),()=>sheets.close('proyectos'));
bindSwipeToClose(document.querySelector('.team'),()=>sheets.close('equipo'));
bindSwipeToClose($('#detail'),()=>{if(detail.open)closeDetail();});
bindSwipeToClose($('#avatar-dropdown'),()=>sheets.close('avatares'));
bindSwipeToClose(document.querySelector('.resumen-dialog'),()=>sheets.close('resumen'));
bindSwipeToClose(document.querySelector('.cc-dialog'),()=>sheets.close('consulta'));
detail.addEventListener('click',e=>{if(e.target===detail)closeDetail();});
$('#mando-dialog')?.addEventListener('click',e=>{if(e.target===$('#mando-dialog'))mandoDialog.close();});

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
    else if(abrir==='resumen')resumenPanel.open();
    if(bot&&bots.some(b=>b.id===bot)){
      let tries=0;
      const go=()=>{
        tries+=1;
        try{choose(bot);}catch(e){/* office may still be wiring */}
        if(detail?.open||fichaFlotante.isOpen())return;
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
// Deep links: main.js is imported after the load event, so run now if the page is already loaded.
if(document.readyState==='complete')setTimeout(consumeDeepLink,500);else addEventListener('load',()=>setTimeout(consumeDeepLink,500));
