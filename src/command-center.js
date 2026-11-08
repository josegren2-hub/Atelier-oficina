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
  return {mode:snapshot.mode || 'disconnected',source:str(snapshot.source),lastSignal:str(snapshot.lastSignal),tasks,hasTasks,
    rejected:raw.length-tasks.length,
    counts:Object.fromEntries(Object.keys(taskStates).map(status=>[status,hasTasks?tasks.filter(task=>status==='urgent'?task.urgent:task.status===status).length:null])),
    notifications:available && Array.isArray(snapshot.notifications)?snapshot.notifications.filter(n=>n && str(n.id) && str(n.title)).map(n=>({id:n.id,title:n.title,body:str(n.body),createdAt:str(n.createdAt)})):[],
    hasNotifications:available && Array.isArray(snapshot.notifications),
    bots:Array.isArray(snapshot.bots)?snapshot.bots.filter(b=>b && str(b.id) && str(b.name)):[],
    agenda:available && snapshot.agenda && typeof snapshot.agenda === 'object'?snapshot.agenda:{}};
}
export function filterTasks(tasks, {status='all',query='',botId=''}={}) {
  const q=normalized(query).trim();
  return tasks.filter(task=>(status==='all'||(status==='urgent'?task.urgent:task.status===status))&&(!botId||task.botId===botId)&&(!q||normalized(`${task.title} ${task.description} ${task.botId}`).includes(q)));
}
export function mountCommandCenter({getSnapshot=()=>({}),onChoose=()=>{}}={}) {
  const dialog=document.createElement('dialog');
  dialog.className='cc-dialog'; dialog.setAttribute('aria-label','Centro de mando');
  dialog.innerHTML=`<header class="cc-header"><div><p class="cc-eyebrow">OFICINA · CENTRO DE MANDO</p><h2>Actividades</h2></div><button type="button" data-close aria-label="Cerrar centro de mando">Cerrar ×</button></header><nav class="cc-nav" aria-label="Secciones del centro de mando"><button type="button" data-section="tasks">Actividades</button><button type="button" data-section="notifications">Notificaciones</button><button type="button" data-section="stats">Estadísticas</button><button type="button" data-section="agenda">Agendas</button></nav><div class="cc-source" role="status"></div><main class="cc-content"></main><footer class="cc-footer"><span>Solo lectura · no modifica tareas ni calendarios</span><button type="button" data-refresh>Actualizar vista</button></footer>`;
  document.body.append(dialog);
  const content=dialog.querySelector('.cc-content'),source=dialog.querySelector('.cc-source');
  let section='tasks',status='all',query='',botId='',agendaId='ted',returnFocus=null,model=commandCenterModel(),readError=false;
  function el(tag,text,cls) {const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
  function button(text,action,cls){const node=el('button',text,cls);node.type='button';node.addEventListener('click',action);return node;}
  function empty(title,description){const block=el('div',undefined,'cc-empty');block.append(el('h3',title),el('p',description));content.append(block);}
  function render(){
    dialog.querySelector('h2').textContent={tasks:'Actividades',notifications:'Notificaciones',stats:'Estadísticas',agenda:'Agendas'}[section];
    dialog.querySelectorAll('[data-section]').forEach(node=>node.setAttribute('aria-current',node.dataset.section===section?'page':'false'));
    source.textContent=readError?'No se pudo leer la vista local. No se muestran datos anteriores.':model.mode==='demo'?'SIMULACIÓN · Los datos de ejemplo no representan trabajo real.':model.mode==='live'?`Fuente: ${model.source||'sin identificar'} · Última señal: ${dateText(model.lastSignal)}`:'Fuente no conectada · No hay actividad real verificable.';
    content.replaceChildren();
    if(section==='tasks') renderTasks();
    if(section==='notifications') {
      if(!model.notifications.length)empty(model.hasNotifications?'Sin notificaciones recibidas':'Fuente de notificaciones no conectada','Aquí solo aparecerán avisos enviados por una fuente conectada. No se generan avisos de actividad ficticia.');
      for(const note of model.notifications){const card=el('article',undefined,'cc-card');card.append(el('h3',note.title),el('p',note.body),el('small',dateText(note.createdAt)));content.append(card);}
    }
    if(section==='stats'){
      content.append(el('p','Recuento de tareas válidas del snapshot actual. No mide productividad, horas trabajadas ni actividad histórica.','cc-explainer'));
      const grid=el('div',undefined,'cc-stats');
      for(const [key,label] of Object.entries(taskStates)){const card=el('article',undefined,'cc-stat');card.append(el('strong',model.counts[key]===null?'—':String(model.counts[key])),el('span',label));grid.append(card);}content.append(grid);
      content.append(el('p',model.hasTasks?`Base auditable: ${model.tasks.length} tareas con ID único, título y estado reconocido. ${model.rejected} registros excluidos por formato inválido o ID duplicado. Urgentes es un filtro transversal y puede coincidir con otro estado.`:'Sin conjunto de tareas conectado. «—» significa dato no disponible, no cero tareas.','cc-explainer'));
      content.append(button('Ver tareas de este recuento',()=>{section='tasks';status='all';query='';botId='';render();}));
    }
    if(section==='agenda')renderAgenda();
  }
  function renderTasks(){
    const controls=el('div',undefined,'cc-controls');
    const searchLabel=el('label','Buscar tareas');const input=el('input');input.type='search';input.placeholder='Título, descripción o asistente';input.value=query;searchLabel.append(input);
    const ownerLabel=el('label','Asistente');const owner=el('select');const all=el('option','Todos los asistentes');all.value='';owner.append(all);
    for(const bot of model.bots){const opt=el('option',bot.name);opt.value=bot.id;owner.append(opt);}owner.value=botId;ownerLabel.append(owner);controls.append(searchLabel,ownerLabel);content.append(controls);
    const filters=el('div',undefined,'cc-filters');filters.setAttribute('aria-label','Filtrar por estado');
    for(const [key,label] of [['all','Todas'],...Object.entries(taskStates)]){const b=button(label,()=>{status=key;render();content.querySelector(`[data-filter="${key}"]`)?.focus();});b.dataset.filter=key;b.setAttribute('aria-pressed',String(status===key));filters.append(b);}content.append(filters);
    const results=el('div',undefined,'cc-results');results.setAttribute('aria-live','polite');content.append(results);
    function list(){results.replaceChildren();const tasks=filterTasks(model.tasks,{status,query,botId});results.append(el('p',model.hasTasks?`${tasks.length} de ${model.tasks.length} tareas visibles`:'Datos de tareas no disponibles','cc-result-count'));
      if(!tasks.length){const block=el('div',undefined,'cc-empty');block.append(el('h3',model.hasTasks?'No hay tareas en esta vista':'Fuente de tareas no conectada'),el('p',model.hasTasks?'Prueba otro filtro o una búsqueda diferente.':'Las actividades aparecerán cuando exista una fuente validada. No se han inventado tareas ni convertido estados de bots en tareas.'));results.append(block);}
      for(const task of tasks){const card=el('article',undefined,'cc-card');const bot=model.bots.find(b=>b.id===task.botId);card.append(el('span',taskStates[task.status]+(task.urgent&&task.status!=='urgent'?' · Urgente':''),'cc-badge'),el('h3',task.title));if(task.description)card.append(el('p',task.description));card.append(el('small',`ID: ${task.id} · ${bot?.name||task.botId||'Sin asistente asignado'} · ${dateText(task.dueAt)}`));if(bot)card.append(button(`Ver a ${bot.name}`,()=>{close();onChoose(bot.id);}));results.append(card);}
    }
    input.addEventListener('input',()=>{query=input.value;list();});owner.addEventListener('change',()=>{botId=owner.value;list();});list();
  }
  function renderAgenda(){
    const tabs=el('div',undefined,'cc-filters');for(const [id,name] of [['ted','Ted'],['julian','Julián']]){const b=button(`Agenda de ${name}`,()=>{agendaId=id;render();});b.setAttribute('aria-pressed',String(id===agendaId));tabs.append(b);}content.append(tabs);
    const name=agendaId==='julian'?'Julián':'Ted';content.append(el('h3',`Agenda de ${name}`));
    const agenda=model.agenda[agendaId];const connected=agenda?.connected===true&&Array.isArray(agenda.events);
    content.append(el('p',connected?`Fuente: ${str(agenda.source)||model.source||'sin identificar'} · ${model.mode==='demo'?'Ejemplo simulado':'Solo lectura'}`:'Fuente no conectada · No se ha consultado ningún calendario.','cc-explainer'));
    const events=connected?agenda.events.filter(e=>e&&str(e.id)&&str(e.title)&&Number.isFinite(Date.parse(e.start))).slice().sort((a,b)=>Date.parse(a.start)-Date.parse(b.start)):[];
    if(!events.length)empty(connected?'Sin eventos recibidos':'Agenda aún no disponible',connected?'La fuente no ha entregado eventos en esta vista.':'Conecta una fuente autorizada para mostrar compromisos reales. Esta pantalla no crea, cambia ni elimina citas.');
    for(const event of events){const card=el('article',undefined,'cc-card');card.append(el('h4',event.title),el('p',dateText(event.start)),el('small',`ID: ${event.id}${str(event.location)?` · ${event.location}`:''}`));content.append(card);}
  }
  function refresh(){try{model=commandCenterModel(getSnapshot()||{});readError=false;}catch{model=commandCenterModel();readError=true;}render();}
  function close(){if(dialog.open)dialog.close();}
  function open(next='tasks'){section=['tasks','notifications','stats','agenda'].includes(next)?next:'tasks';refresh();if(!dialog.open){returnFocus=document.activeElement;dialog.showModal();}dialog.querySelector('[data-close]').focus();}
  dialog.querySelector('[data-close]').addEventListener('click',close);
  dialog.querySelector('[data-refresh]').addEventListener('click',refresh);
  dialog.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>{section=b.dataset.section;render();}));
  dialog.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
  return {open,openAgenda(id='ted'){agendaId=id==='julian'?'julian':'ted';open('agenda');},refresh,close,destroy(){close();dialog.remove();},element:dialog};
}
