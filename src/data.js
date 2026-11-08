export const floors = [
 {id:0,name:'Encuentro',description:'Recepción · coordinación · bienestar',color:'#c2b494'},
 {id:1,name:'Biblioteca',description:'Criterio · lectura · decisiones',color:'#aebd9c'},
 {id:2,name:'Atelier',description:'Editorial · imagen · comunidad',color:'#cba1a8'},
 {id:3,name:'Laboratorio',description:'Tecnología · medios · podcast',color:'#a0b9cd'}
];
const entries=[
 ['ted','Ted','Asistente personal',0,'#7d91d2'],['ceo','Tommy','Estrategia / CEO digital',0,'#e7ac47'],['luna','Luna','Asistente',0,'#9cc9d9'],['emiliano','Emiliano','Entrenamiento / salud',0,'#87b66b'],
 ['julian','Julián','Jurídico',1,'#a9be63'],['ines','Inés','Finanzas',1,'#6cb5ad'],['libro','Rodrigo','Redacción / edición del libro',1,'#db9166'],['tr-editor','Naim','Editor jefe',1,'#30353e'],
 ['mateo','Mateo','Director de Tinta Rosa',2,'#da756d'],['tr-cm','Dany','Community manager',2,'#9dd3cc'],['vale','Valery','Redes personales',2,'#e76892'],['director','Joss','Director de video',2,'#53a7ad'],
 ['apps','Charly','Desarrollo móvil',3,'#609bd0'],['luca','Luca','Técnico digital',3,'#e19147'],['tadeo','Tadeo','Web y sitio',3,'#9ab9dc'],['rulo','Rulo','Productor de podcast',3,'#aa79ce']
];
export const bots=entries.map(([id,name,role,floor,color],index)=>({id,name,role,floor,color,shape:index%4}));
export function disconnectedSnapshot(){return {mode:'disconnected',source:null,lastSignal:null,bots:bots.map(b=>({...b,status:'unknown',task:null,lastSignal:null}))};}
export function demoSnapshot(){return {...disconnectedSnapshot(),mode:'demo',bots:bots.map((b,i)=>({...b,status:['working','review','idle'][i%3],task:['Preparando un borrador de ejemplo','Esperando revisión de ejemplo','Disponible en la simulación'][i%3],lastSignal:null}))};}
export const statusLabels={unknown:'Sin señal',working:'Trabajando · demo',review:'En revisión · demo',idle:'Disponible · demo',error:'Error de fuente'};
