/** View-only state for the roster. Camera changes never implicitly narrow the team. */
const normalized=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
export function filterRoster(bots,{floor=-1,query='',department=''}={}) {
 const q=normalized(query);
 const dep=normalized(department);
 return bots.filter(bot=>{
  if(floor>=0&&bot.floor!==floor)return false;
  if(dep&&normalized(bot.department||'')!==dep)return false;
  return normalized(`${bot.name} ${bot.role} ${bot.department||''}`).includes(q);
 });
}

/** A profile never derives a task history or real activity from a 3D animation. */
export function botProfile(snapshot,bot,movement=null) {
 const demo=snapshot.mode==='demo';
 const received=demo||snapshot.mode==='live';
 const known=received&&!bot.stale&&bot.status!=='unknown';
 const states={working:'Trabajando',review:'Te espera',idle:'En pausa',error:'Error de fuente'};
 const text=value=>typeof value==='string'&&value.trim()?value.trim():null;
 const taskText=text(bot.task);
 const activityText=text(bot.activity);
 const unlocked=bot.mandoUnlocked===true;
 const locked=!demo&&!unlocked;
 let currentTask;
 if(!known) currentTask='No disponible · fuente sin señal.';
 else if(locked) currentTask='Solo con el mando desbloqueado';
 else if(taskText) currentTask=taskText+(bot.liveTask?.detail?` · ${bot.liveTask.detail}`:'');
 else if(text(bot.resumen)) currentTask=text(bot.resumen);
 else if(bot.status==='working') currentTask=demo?'Sin tarea asignada en este ejemplo.':'Trabajando'; // never "sin datos" while working when live
 else if(demo) currentTask='Sin tarea asignada en este ejemplo.';
 else currentTask='No se ha recibido una tarea actual.';

 let active;
 if(!known||bot.status==='error') active='No se puede verificar';
 else if(bot.status==='working') active=`Sí${demo?' · simulado':''}`;
 else if(bot.status==='review') active=`Te espera${demo?' · simulado':''}${bot.waitingSince?` desde ${new Date(bot.waitingSince).toLocaleString('es-MX',{timeZone:'America/Chihuahua'})}`:''}`;
 else active=`Sin trabajo en curso confirmado${demo?' · simulado':''}`;

 let waitingNote=null;
 if(known&&bot.status==='review') waitingNote=unlocked&&text(bot.pendiente)?bot.pendiente:'Te espera (estado en vivo).';
 else if(known&&unlocked&&bot.waitingResolved) waitingNote='✅ Resuelto · el estado en vivo ya no marca que te espere';

 const auth=unlocked&&Array.isArray(bot.authorization)&&bot.authorization.length
  ?bot.authorization.join(' · ')
  :null;

 return {
  source:demo?'DEMO · Ejemplos ficticios locales. Estado, actividad y tareas simulados; sin conexión real.':snapshot.mode==='live'?`Fuente: ${text(snapshot.source)||'sin identificar'}. Solo información recibida.${unlocked?' · Mando desbloqueado (cifrado local).':''}`:'Fuente no conectada. No se conoce su actividad real.',
  status:known?`${states[bot.status]||'Desconocido'}${demo?' · DEMO':''}`:'Desconocido · sin señal',
  active,
  activity:demo?`Movimiento de ejemplo: ${text(movement?.label)||activityText||'Preparando postura de demostración'}`:known?(activityText||'No se ha recibido una descripción de actividad.'):'No hay actividad real recibida.',
  currentTask,
  previousTask:!known?'No disponible · no hay historial recibido.':locked?'Solo con el mando desbloqueado':(text(bot.previousTask)||(demo?'Sin tarea anterior en este ejemplo.':'No se ha recibido una tarea anterior.')),
  lastSignal:!demo&&text(bot.lastSignal)?new Date(bot.lastSignal).toLocaleString('es'):'Ninguna señal real recibida.',
  waitingNote,
  authorization:auth,
  mandoUnlocked:unlocked,
  agente:unlocked&&text(bot.agente)?bot.agente:null,
 };
}
