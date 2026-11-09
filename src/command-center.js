import {avatarPhotoUrl} from './avatar-photo.js';
/** Read-only command center. Import command-center.css in the application entry. */
export const taskStates = Object.freeze({pending:'Pendientes',in_progress:'En curso',authorization:'Autorización',urgent:'Urgentes',postponed:'Pospuestas',completed:'Completadas'});
const aliases = {working:'in_progress',review:'authorization',done:'completed',deferred:'postponed',awaiting_approval:'authorization'};
const str = value => typeof value === 'string' ? value : '';
const dateText = value => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('es', {dateStyle:'medium',timeStyle:'short'}) : 'Sin fecha informada';
const normalized = value => str(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function commandCenterModel(snapshot = {}) {
  const available = snapshot.mode === 'live' || snapshot.mode === 'demo';
  const raw = available && Array.isArray(snapshot.tasks) ? snapshot.tasks : [];
  const seen = new Set();
  const tasks = raw.flatMap(task => {
    if (!task || !str(task.id) || !str(task.title) || seen.has(task.id)) return [];
    const status = aliases[task.status] || task.status;
    if (!Object.hasOwn(taskStates,status)) return [];
    seen.add(task.id);
    return [{id:task.id,title:task.title,status,botId:str(task.botId),description:str(task.description),dueAt:str(task.dueAt),urgent:task.urgent===true || status==='urgent'}];
  });
  const hasTasks = available && Array.isArray(snapshot.tasks);
  const bots=Array.isArray(snapshot.bots)?snapshot.bots.filter(b=>b && str(b.id) && str(b.name)):[];
  const waiting=available?bots.filter(b=>b.status==='review' && !b.stale).map(b=>({id:b.id,name:b.name,waitingSince:str(b.waitingSince),pendiente:str(b.pendiente),authorization:Array.isArray(b.authorization)?b.authorization.filter(Boolean):[]})):[];
  return {mode:snapshot.mode || 'disconnected',source:str(snapshot.source),lastSignal:str(snapshot.lastSignal),tasks,hasTasks,
    rejected:raw.length-tasks.length,
    counts:Object.fromEntries(Object.keys(taskStates).map(status=>[status,hasTasks?tasks.filter(task=>status==='urgent'?task.urgent:task.status===status).length:null])),
    notifications:available && Array.isArray(snapshot.notifications)?snapshot.notifications.filter(n=>n && str(n.id) && str(n.title)).map(n=>({id:n.id,title:n.title,body:str(n.body),createdAt:str(n.createdAt)})):[],
    hasNotifications:available && Array.isArray(snapshot.notifications),
    bots,
    waiting,
    mandoUnlocked:snapshot.mandoUnlocked===true,
    agenda:available && snapshot.agenda && typeof snapshot.agenda === 'object'?snapshot.agenda:{}};
}
export function filterTasks(tasks, {status='all',query='',botId=''}={}) {
  const q=normalized(query).trim();
  return tasks.filter(task=>(status==='all'||(status==='urgent'?task.urgent:task.status===status))&&(!botId||task.botId===botId)&&(!q||normalized(`${task.title} ${task.description} ${task.botId}`).includes(q)));
}
export function mountCommandCenter({getSnapshot=()=>({}),onChoose=()=>{}}={}) {
  const dialog=document.createElement('dialog');
  dialog.className='cc-dialog'; dialog.setAttribute('aria-label','Centro de mando');
  dialog.innerHTML=`<header class="cc-header"><div><p class="cc-eyebrow">OFICINA · CONSULTA</p><h2>Actividades</h2></div><button type="button" data-close aria-label="Cerrar centro de mando">Cerrar ×</button></header><nav class="cc-nav" aria-label="Secciones del centro de mando"><button type="button" data-section="waiting">Te espera</button><button type="button" data-section="tasks">Actividades</button><button type="button" data-section="notifications">Notificaciones</button><button type="button" data-section="stats">Estadísticas</button><button type="button" data-section="agenda">Agendas</button></nav><div class="cc-source" role="status"></div><main class="cc-content"></main><footer class="cc-footer"><span>Solo consulta · no modifica tareas ni calendarios</span><button type="button" data-refresh>Actualizar vista</button></footer>`;
  document.body.append(dialog);
  const content=dialog.querySelector('.cc-content'),source=dialog.querySelector('.cc-source');
  let section='waiting',status='all',query='',botId='',agendaId='ted',returnFocus=null,model=commandCenterModel(),readError=false,filtersOpen=false;
  function el(tag,text,cls) {const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
  function button(text,action,cls){const node=el('button',text,cls);node.type='button';node.addEventListener('click',action);return node;}
  function empty(title,description,parent=content){const block=el('div',undefined,'cc-empty');block.append(el('h3',title),el('p',description));parent.append(block);}
  function heading(title,description){const block=el('div',undefined,'cc-section-heading');block.append(el('h3',title));if(description)block.append(el('p',description,'cc-explainer'));content.append(block);}
  function summary(items){const block=el('dl',undefined,items.length===2?'cc-summary cc-summary-pair':'cc-summary');for(const [label,value] of items){const item=el('div');item.append(el('dt',label),el('dd',value===null?'—':String(value)));block.append(item);}content.append(block);}
  function render(){
    dialog.querySelector('h2').textContent={waiting:'Te espera',tasks:'Actividades',notifications:'Notificaciones',stats:'Estadísticas',agenda:'Agendas'}[section];
    dialog.querySelectorAll('[data-section]').forEach(node=>node.setAttribute('aria-current',node.dataset.section===section?'page':'false'));
    source.dataset.mode=readError?'error':model.mode;
    source.textContent=readError?'No se pudo leer la vista local. No se muestran datos anteriores.':model.mode==='demo'?'DEMO · SIMULACIÓN · Ejemplos ficticios. La fuente real sigue desconectada.':model.mode==='live'?`Fuente: ${model.source||'sin identificar'} · Última señal: ${dateText(model.lastSignal)}${model.mandoUnlocked?' · Mando desbloqueado':''}`:'Fuente no conectada · No hay actividad real verificable.';
    content.replaceChildren();
    content.scrollTop=0;
    if(section==='waiting') renderWaiting();
    if(section==='tasks') renderTasks();
    if(section==='notifications') {
      heading('Avisos recibidos','Información de la fuente, sin acciones ni respuestas pendientes en esta pantalla.');
      summary([['Notificaciones disponibles',model.hasNotifications?model.notifications.length:null]]);
      if(!model.notifications.length)empty(model.hasNotifications?'Sin notificaciones recibidas':'Fuente de notificaciones no conectada','Aquí aparecerán los avisos disponibles. No se generan notificaciones de actividad ficticia fuera de DEMO.');
      for(const note of model.notifications){const card=el('article',undefined,'cc-card');card.append(el('span','Notificación','cc-badge'),el('h3',note.title),el('p',note.body),el('small',dateText(note.createdAt)));content.append(card);}
    }
    if(section==='stats'){
      heading('Tareas por estado','Resumen de las tareas disponibles en esta vista.');
      const grid=el('div',undefined,'cc-stats');
      for(const [key,label] of Object.entries(taskStates)){const card=el('article',undefined,'cc-stat');card.append(el('strong',model.counts[key]===null?'—':String(model.counts[key])),el('span',label));grid.append(card);}content.append(grid);
      if(!model.hasTasks)empty('Estadísticas aún no disponibles','La fuente de tareas no está conectada. «—» significa dato no disponible, no cero tareas.');
      content.append(el('p',model.hasTasks?`Base del recuento: ${model.tasks.length} tareas con ID único, título y estado reconocido. ${model.rejected} registros excluidos por formato inválido o ID duplicado. Las tareas urgentes también pueden pertenecer a otro estado.`:'Los recuentos se mostrarán cuando haya datos verificables.','cc-explainer'));
      content.append(el('p','Estos datos no miden productividad, horas trabajadas ni actividad histórica.','cc-explainer'));
      content.append(button('Ver actividades de este recuento',()=>{section='tasks';status='all';query='';botId='';filtersOpen=false;render();dialog.querySelector('[data-section="tasks"]').focus();}));
    }
    if(section==='agenda')renderAgenda();
  }
  function renderWaiting(){
    heading('Te espera','Quién marca esperando en el estado en vivo. Se limpia en cuanto el vivo deja de marcar esperando (cualquier respuesta).');
    summary([['Te esperan ahora',model.mode==='live'||model.mode==='demo'?model.waiting.length:null],['Mando',model.mandoUnlocked?'desbloqueado':'bloqueado']]);
    if(!(model.mode==='live'||model.mode==='demo')){empty('Sin señal en vivo','Conecta el estado en vivo para ver quién te espera.');return;}
    if(!model.waiting.length){empty('Nadie te espera ahora','Cuando un bot pase a esperando aparecerá aquí.');return;}
    for(const w of model.waiting){
      const card=el('article',undefined,'cc-card h-bot');
      const img=document.createElement('img');img.className='cc-bot-av';img.src=avatarPhotoUrl(w.id);img.alt='';img.width=28;img.height=28;img.loading='lazy';
      const meta=el('div',undefined,'cc-bot-meta');
      meta.append(el('span','Te espera','cc-badge'),el('h3',w.name));
      if(w.waitingSince)meta.append(el('p',`Desde ${dateText(w.waitingSince)}`));
      if(model.mandoUnlocked&&w.pendiente)meta.append(el('p',w.pendiente));
      if(model.mandoUnlocked&&w.authorization.length)meta.append(el('small',`Autorización: ${w.authorization.join(' · ')}`));
      meta.append(button(`Ver a ${w.name}`,()=>{close();onChoose(w.id);}));
      card.append(img,meta);
      content.append(card);
    }
  }
  function renderTasks(){
    heading('Resumen de actividades',model.hasTasks?'Estado actual de las tareas disponibles.':'Sin datos de tareas verificados todavía.');
    summary([['Tareas disponibles',model.hasTasks?model.tasks.length:null],['En curso',model.counts.in_progress],['Urgentes',model.counts.urgent]]);
    const results=el('div',undefined,'cc-results');
    const resultCount=el('p',undefined,'cc-result-count');resultCount.setAttribute('role','status');
    let filterSummary=null,reset=null;
    const filterButtons=[];
    const hasFilters=()=>status!=='all'||!!query.trim()||!!botId;
    function list(){
      results.replaceChildren();
      const tasks=filterTasks(model.tasks,{status,query,botId});
      resultCount.textContent=model.hasTasks?`${tasks.length} de ${model.tasks.length} tareas${hasFilters()?' · vista filtrada':''}${model.mode==='demo'?' · ejemplos DEMO':''}`:'Datos de tareas no disponibles';
      if(filterSummary)filterSummary.textContent=hasFilters()?'Filtros activos':'Opcional';
      if(reset)reset.disabled=!hasFilters();
      for(const b of filterButtons)b.setAttribute('aria-pressed',String(status===b.dataset.filter));
      if(!tasks.length)empty(model.hasTasks?(model.tasks.length?'Sin coincidencias':'Sin tareas recibidas'):'Fuente de tareas no conectada',model.hasTasks?(model.tasks.length?'No hay tareas que coincidan con esta búsqueda o estos filtros.':'La fuente no ha entregado tareas en esta vista.'):'Las actividades aparecerán aquí cuando exista una fuente validada. Los estados de los asistentes no se convierten en tareas.',results);
      for(const task of tasks){const card=el('article',undefined,'cc-card');const bot=model.bots.find(b=>b.id===task.botId);card.append(el('span',taskStates[task.status]+(task.urgent&&task.status!=='urgent'?' · Urgente':''),'cc-badge'),el('h3',task.title));if(task.description)card.append(el('p',task.description));card.append(el('small',`${bot?.name||task.botId||'Sin asistente asignado'} · ${task.dueAt?dateText(task.dueAt):'Sin fecha prevista'}`),el('small',`ID: ${task.id}`));if(bot)card.append(button(`Ver a ${bot.name}`,()=>{close();onChoose(bot.id);}));results.append(card);}
    }
    // Filtering only changes the local view; it never creates or edits records.
    // No search controls are offered when there is no information to filter.
    if(model.hasTasks&&model.tasks.length){
      const panel=el('details',undefined,'cc-filter-panel');panel.open=filtersOpen;
      const title=el('summary');filterSummary=el('span',undefined,'cc-filter-hint');title.append(el('span','Buscar o filtrar actividades'),filterSummary);panel.append(title);
      const controls=el('div',undefined,'cc-controls');
      const searchLabel=el('label','Buscar en las actividades');const input=el('input');input.type='search';input.placeholder='Título, descripción o asistente';input.value=query;searchLabel.append(input);
      const ownerLabel=el('label','Filtrar por asistente');const owner=el('select');const all=el('option','Todos los asistentes');all.value='';owner.append(all);
      for(const bot of model.bots){const opt=el('option',bot.name);opt.value=bot.id;owner.append(opt);}owner.value=botId;ownerLabel.append(owner);controls.append(searchLabel,ownerLabel);panel.append(controls);
      const filters=el('div',undefined,'cc-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Filtrar por estado');
      for(const [key,label] of [['all','Todas'],...Object.entries(taskStates)]){const b=button(label,()=>{status=key;list();});b.dataset.filter=key;filterButtons.push(b);filters.append(b);}panel.append(filters);
      reset=button('Limpiar filtros',()=>{status='all';query='';botId='';input.value='';owner.value='';list();input.focus();},'cc-reset');panel.append(reset);
      panel.addEventListener('toggle',()=>{if(panel.isConnected)filtersOpen=panel.open;});
      input.addEventListener('input',()=>{query=input.value;list();});owner.addEventListener('change',()=>{botId=owner.value;list();});content.append(panel);
    }
    content.append(resultCount,results);list();
  }
  function renderAgenda(){
    const name=agendaId==='julian'?'Julián':'Ted';
    heading(`Agenda y pendientes de ${name}`,'Consulta rápida de compromisos y tareas por atender.');
    const agenda=model.agenda[agendaId];const simulated=model.mode==='demo'&&agenda?.simulated===true;const connected=(simulated||agenda?.connected===true)&&Array.isArray(agenda.events);
    const events=connected?agenda.events.filter(e=>e&&str(e.id)&&str(e.title)&&Number.isFinite(Date.parse(e.start))).slice().sort((a,b)=>Date.parse(a.start)-Date.parse(b.start)):[];
    const pending=model.tasks.filter(task=>task.botId===agendaId&&task.status!=='completed');
    summary([['Eventos en la agenda',connected?events.length:null],['Tareas por atender',model.hasTasks?pending.length:null]]);
    const tabs=el('div',undefined,'cc-filters cc-agenda-switch');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Consultar otra agenda');
    for(const [id,label] of [['ted','Ted'],['julian','Julián']]){const b=button(`Agenda de ${label}`,()=>{agendaId=id;render();content.querySelector(`[data-agenda="${id}"]`).focus();});b.dataset.agenda=id;b.setAttribute('aria-pressed',String(id===agendaId));tabs.append(b);}content.append(tabs);
    content.append(el('p',simulated?'DEMO · Ejemplo local ficticio · fuente real desconectada · fechas de demostración':connected?`Fuente: ${str(agenda.source)||model.source||'sin identificar'} · ${model.mode==='demo'?'Ejemplo simulado':'Solo lectura'}`:'Fuente no conectada · No se ha consultado ningún calendario.','cc-explainer'));
    const columns=el('div',undefined,'cc-agenda-columns');
    const schedule=el('section',undefined,'cc-agenda-events');schedule.setAttribute('aria-label',`Compromisos de ${name}`);schedule.append(el('h3','Compromisos'));
    if(!events.length)empty(connected?'Sin eventos recibidos':'Agenda aún no disponible',connected?'La fuente no ha entregado eventos en esta vista.':'No hay una fuente de calendario conectada. No se crean, cambian ni eliminan citas.',schedule);
    for(const event of events){const card=el('article',undefined,'cc-card');card.append(el('span',dateText(event.start),'cc-badge'),el('h4',event.title));if(str(event.location))card.append(el('p',event.location));card.append(el('small',`ID: ${event.id}`));schedule.append(card);}
    const tasks=el('section',undefined,'cc-agenda-tasks');tasks.setAttribute('aria-label',`Pendientes de ${name}`);tasks.append(el('h3','Pendientes y actividades'));
    if(!pending.length)empty(model.hasTasks?'Sin tareas por atender':'Pendientes aún no disponibles',model.hasTasks?`No hay tareas abiertas de ${name} en esta vista.`:'La fuente de tareas no está conectada. No se puede confirmar si hay pendientes.',tasks);
    for(const task of pending){const card=el('article',undefined,'cc-card');card.append(el('span',taskStates[task.status]+(task.urgent&&task.status!=='urgent'?' · Urgente':''),'cc-badge'),el('h4',task.title));if(task.description)card.append(el('p',task.description));card.append(el('small',task.dueAt?dateText(task.dueAt):'Sin fecha prevista'),el('small',`ID: ${task.id}`));tasks.append(card);}
    columns.append(schedule,tasks);content.append(columns);
  }
  function refresh(){try{model=commandCenterModel(getSnapshot()||{});readError=false;}catch{model=commandCenterModel();readError=true;}render();}
  function close(){if(dialog.open)dialog.close();}
  function open(next='waiting'){section=['waiting','tasks','notifications','stats','agenda'].includes(next)?next:'waiting';refresh();if(!dialog.open){returnFocus=document.activeElement;dialog.showModal();}dialog.querySelector('[data-close]').focus();}
  dialog.querySelector('[data-close]').addEventListener('click',close);
  dialog.querySelector('[data-refresh]').addEventListener('click',refresh);
  dialog.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>{section=b.dataset.section;render();}));
  dialog.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
  return {open,openAgenda(id='ted'){agendaId=id==='julian'?'julian':'ted';open('agenda');},refresh,close,destroy(){close();dialog.remove();},element:dialog};
}
