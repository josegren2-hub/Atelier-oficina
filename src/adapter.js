/** Read-only boundary. Not enabled by the demo; credentials never belong in this client. */
export function validateSnapshot(payload,knownIds,now=Date.now()){
 if(!payload||payload.schemaVersion!==1||typeof payload.source!=='string'||!payload.source.trim())throw new Error('Fuente o versión ausente');
 if(!Array.isArray(payload.bots))throw new Error('Lista de bots inválida');
 const ids=new Set(),valid=new Set(knownIds);const allowed=new Set(['working','review','idle','error','unknown']);
 const records=payload.bots.map(record=>{
  if(!valid.has(record.id)||ids.has(record.id))throw new Error('ID desconocido o duplicado');ids.add(record.id);
  if(!allowed.has(record.status))throw new Error('Estado inválido');
  const date=Date.parse(record.lastSignal);
  if(!Number.isFinite(date)||date>now+30000)throw new Error('Fecha inválida o futura');
  if(record.task!==null&&record.task!==undefined&&(typeof record.task!=='string'||record.task.length>500))throw new Error('Tarea inválida');
  const stale=now-date>120000;
  return {id:record.id,status:stale?'unknown':record.status,task:record.task??null,lastSignal:new Date(date).toISOString(),stale};
 });
 return {mode:'live',source:payload.source.slice(0,120),bots:records,lastSignal:records.length?records.reduce((a,b)=>a>b.lastSignal?a:b.lastSignal,''):null};
}
export async function readSnapshot({signal,knownIds,fetcher=fetch}){
 const response=await fetcher('/api/office/snapshot',{signal,credentials:'same-origin',headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error(`Fuente no disponible (${response.status})`);
 return validateSnapshot(await response.json(),knownIds);
}
