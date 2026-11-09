/** View-only state for the roster. Camera changes never implicitly narrow the team. */
const normalized=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
export function filterRoster(bots,{floor=-1,query=''}={}) {
 const q=normalized(query);
 return bots.filter(bot=>(floor<0||bot.floor===floor)&&normalized(`${bot.name} ${bot.role}`).includes(q));
}

/** A profile never derives a task history or real activity from a 3D animation. */
export function botProfile(snapshot,bot,movement=null) {
 const demo=snapshot.mode==='demo';
 const received=demo||snapshot.mode==='live';
 const known=received&&!bot.stale&&bot.status!=='unknown';
 const states={working:'Trabajando',review:'Esperando revisión',idle:'Disponible',error:'Error de fuente'};
 const text=value=>typeof value==='string'&&value.trim()?value.trim():null;
 return {
  source:demo?'DEMO · Ejemplos ficticios locales. Estado, actividad y tareas simulados; sin conexión real.':snapshot.mode==='live'?`Fuente: ${text(snapshot.source)||'sin identificar'}. Solo información recibida.`:'Fuente no conectada. No se conoce su actividad real.',
  status:known?`${states[bot.status]||'Desconocido'}${demo?' · DEMO':''}`:'Desconocido · sin señal',
  active:!known||bot.status==='error'?'No se puede verificar':bot.status==='working'?`Sí${demo?' · simulado':''}`:bot.status==='review'?`Esperando revisión${demo?' · simulado':''}`:`Sin trabajo en curso confirmado${demo?' · simulado':''}`,
  activity:demo?`Movimiento de ejemplo: ${text(movement?.label)||text(bot.activity)||'Preparando postura de demostración'}`:known?(text(bot.activity)||'No se ha recibido una descripción de actividad.'):'No hay actividad real recibida.',
  currentTask:known?(text(bot.task)||(demo?'Sin tarea asignada en este ejemplo.':'No se ha recibido una tarea actual.')):'No disponible · fuente sin señal.',
  previousTask:known?(text(bot.previousTask)||(demo?'Sin tarea anterior en este ejemplo.':'No se ha recibido una tarea anterior.')):'No disponible · no hay historial recibido.',
  lastSignal:!demo&&text(bot.lastSignal)?new Date(bot.lastSignal).toLocaleString('es'):'Ninguna señal real recibida.'
 };
}
