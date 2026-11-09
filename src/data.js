import {departmentOf} from './departments.js';
// Distribution supplied by equipo-bots-rob.docx; assignments do not imply live activity.
export const floors = [
 {id:0,name:'Personal',description:'Acompañamiento · salud · redes personales',color:'#c2b494'},
 {id:1,name:'Jurídico y Finanzas',description:'Asesoría jurídica y docente · finanzas y administración',color:'#aebd9c'},
 {id:2,name:'Proyectos',description:'Libro · apps · estrategia · soporte · podcast · audiovisual',color:'#a0b9cd'},
 {id:3,name:'Tinta Rosa',description:'Dirección · edición · web · comunidad',color:'#cba1a8'},
 {id:4,name:'Penthouse · Ted',description:'Asistencia personal · coordinación general',color:'#d5c19b'}
];
const entries=[
 ['ted','Ted','Asistente personal / coordinador general',4,'#f4d5a1'],
 ['ceo','Tommy','Estrategia de ingresos digitales',2,'#2867d7'],
 ['luna','Luna','Acompañamiento espiritual',0,'#ba85ea'],
 ['emiliano','Emiliano','Salud / estilo de vida / entrenamiento',0,'#30aa76'],
 ['julian','Julián','Jurídico y docente',1,'#edb82f'],
 ['ines','Inés','Finanzas / contabilidad / administración',1,'#b792dd'],
 ['libro','Rodrigo','Escritor / investigador / editor del libro',2,'#26b6dc'],
 ['tr-editor','Naim','Editor jefe / verificador',3,'#b65c85'],
 ['mateo','Mateo','Director de Tinta Rosa',3,'#d72d82'],
 ['tr-cm','Dany','Comunidad / diseño / fotografía',3,'#f5accd'],
 ['vale','Valery','Redes personales / opinión',0,'#f18a73'],
 ['director','Joss','Director / productor audiovisual',2,'#f4e0b7'],
 ['apps','Charly','Desarrollo de apps móviles',2,'#f59b27'],
 ['luca','Luca','Soporte técnico / mantenimiento transversal',2,'#a5e4c3'],
 ['tadeo','Tadeo','Diseño / desarrollo / coordinación web',3,'#ef79b5'],
 ['rulo','Rulo','Productor / director de podcast',2,'#51bce5']
];
export const bots=entries.map(([id,name,role,floor,color],index)=>({id,name,role,floor,color,shape:index%4,department:departmentOf(id)}));
export function disconnectedSnapshot(){return {mode:'disconnected',source:null,lastSignal:null,bots:bots.map(b=>({...b,status:'unknown',task:null,previousTask:null,activity:null,lastSignal:null}))};}
// Illustrative local records, never a claim that these tasks happened.
const demoTasks={
 ted:['Ordenar prioridades de prueba','Preparar un resumen ficticio'],
 ceo:['Comparar ideas de ingresos de ejemplo','Clasificar una propuesta ficticia'],
 luna:['Preparar una reflexión de ejemplo','Ordenar una lectura ficticia'],
 emiliano:['Organizar una rutina de ejemplo','Revisar un esquema ficticio'],
 julian:['Preparar una explicación jurídica ficticia','Ordenar apuntes de ejemplo'],
 ines:['Revisar un presupuesto ficticio','Clasificar recibos de ejemplo'],
 libro:['Escribir una escena de ejemplo','Revisar un párrafo ficticio'],
 'tr-editor':['Revisar un artículo de ejemplo','Comprobar una referencia ficticia'],
 mateo:['Organizar una edición de ejemplo','Preparar una pauta ficticia'],
 'tr-cm':['Diseñar una publicación de ejemplo','Elegir una imagen ficticia'],
 vale:['Preparar una idea para redes de ejemplo','Revisar un texto ficticio'],
 director:['Preparar un guion audiovisual de ejemplo','Ordenar una secuencia ficticia'],
 apps:['Revisar una maqueta de app ficticia','Probar un botón de ejemplo'],
 luca:['Comprobar un recurso de demostración','Revisar una configuración ficticia'],
 tadeo:['Organizar una página de ejemplo','Revisar un diseño web ficticio'],
 rulo:['Preparar una escaleta de podcast ficticia','Ordenar un episodio de ejemplo']
};
export function demoSnapshot(preset='mixed'){
 const demoBots=bots.map((b,i)=>{
  const status=preset==='working'?'working':preset==='idle'?'idle':['working','review','idle'][i%3];
  const [current,previous]=demoTasks[b.id];
  return {...b,status,task:status==='idle'?null:`Ejemplo: ${current}`,previousTask:`Ejemplo: ${previous}`,activity:status==='working'?'Trabajo simulado en el puesto':status==='review'?'Espera de revisión simulada':'Paseo y descanso simulados',lastSignal:null};
 });
 const definitions=[
  ['example-1','Preparar un borrador de ejemplo','pending','ted'],
  ['example-2','Revisar una maqueta ficticia','in_progress','apps'],
  ['example-3','Borrador de ejemplo pendiente de autorización','authorization','julian'],
  ['example-4','Comprobar un recurso de demostración','urgent','luca'],
  ['example-5','Retomar una idea de prueba','postponed','libro'],
  ['example-6','Ejemplo de entrega terminada','completed','mateo']
 ];
 const tasks=definitions.map(([id,title,status,botId])=>({id,title:`Ejemplo: ${title}`,status,botId,description:'SIMULACIÓN: este registro no corresponde a trabajo real.',urgent:status==='urgent'}));
 return {...disconnectedSnapshot(),mode:'demo',source:'Ejemplos ficticios locales',bots:demoBots,tasks,
  notifications:[{id:'sample-note-1',title:'Ejemplo: un borrador requiere revisión',body:'Aviso ficticio para mostrar cómo se vería una autorización. No hay solicitud real.',createdAt:'2030-01-15T09:00:00Z'},
   {id:'sample-note-2',title:'Ejemplo: una tarea terminó',body:'Notificación simulada. No se ejecutó ningún trabajo.',createdAt:'2030-01-15T09:15:00Z'}],
  agenda:{ted:{connected:false,simulated:true,source:'Agenda ficticia de demostración',events:[{id:'sample-ted-1',title:'Ejemplo: revisión de prioridades',start:'2030-01-15T10:00:00Z'},{id:'sample-ted-2',title:'Ejemplo: espacio de concentración',start:'2030-01-15T12:00:00Z'}]},
   julian:{connected:false,simulated:true,source:'Agenda ficticia de demostración',events:[{id:'sample-julian-1',title:'Ejemplo: preparar una explicación',start:'2030-01-15T11:00:00Z'},{id:'sample-julian-2',title:'Ejemplo: revisar un documento ficticio',start:'2030-01-15T13:00:00Z'}]}}
 };
}
export const statusLabels={unknown:'Sin señal',working:'Trabajando',review:'Te espera',idle:'En pausa',error:'Error de fuente'};
