import './style.css';
import {mountReleaseNotice} from './release-notice.js';
import './command-center.css';
import {bots,floors,disconnectedSnapshot,demoSnapshot,statusLabels} from './data.js';
import {createOffice} from './scene.js';
import {mountCommandCenter} from './command-center.js';
import {filterRoster,botProfile} from './roster.js';
import {readNightPreference,saveNightPreference} from './theme-state.js';
const $=s=>document.querySelector(s);
mountReleaseNotice();
let snapshot=demoSnapshot(),floor=-1,rosterFloor=-1,viewMode='exterior',selected=null,office,detailReturn=null;
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
$('#refresh-office').addEventListener('click',()=>{command.refresh();$('#refresh-feedback').textContent='Vista actualizada. Fuente real no conectada; no se han consultado calendarios ni bots.';});
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
  avatar.append(indicator);button.append(avatar,text,el('em',snapshot.mode==='demo'?'DEMO':'SIN SEÑAL'));
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
$('#demo').addEventListener('click',()=>{
 const demo=snapshot.mode!=='demo';snapshot=demo?demoSnapshot():disconnectedSnapshot();
 $('#demo').textContent=demo?'Salir de demostración':'Ver demostración';$('#demo').setAttribute('aria-pressed',String(demo));$('#source-label').textContent=demo?'Ejemplos simulados · sin fuente real':'Fuente desconectada';$('#demo-actions').hidden=!demo;$('#demo-banner').hidden=!demo;
 office?.setDemo(demo);office?.setStatuses(snapshot);command.refresh();render();
});
try{office=createOffice($('#canvas-container'),choose,stats=>{$('#model-status').textContent=`Avatares: ${stats.loaded}/16${stats.failed?' · No se pudieron cargar '+stats.failed:''}`;},id=>command.openAgenda(id),id=>setFloor(id));office.setNight(nightMode);office.setDemo(true);office.setStatuses(snapshot);}catch(error){$('#fallback').hidden=false;console.error('WebGL no disponible:',error);}
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
