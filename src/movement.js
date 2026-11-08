// Floor-local, deterministic demo locomotion. No real work is inferred here.
export const BODY_RADIUS=.85;
export const PERSONAL_SPACE=1.85;
const STEP=.3, LIMIT={minX:-12.1,maxX:8.7,minZ:-8.15,maxZ:8.25};
export function segmentClear(a,b,obstacles,radius=BODY_RADIUS,seat=null){
 if(![...a,...b].every(Number.isFinite))return false;
 for(const p of [a,b])if(p[0]<LIMIT.minX||p[0]>LIMIT.maxX||p[1]<LIMIT.minZ||p[1]>LIMIT.maxZ)return false;
 for(const o of obstacles){if(seat!==null&&o.seat===seat)continue;
  let lo=0,hi=1;
  for(const [axis,min,max] of [[0,o.minX-radius,o.maxX+radius],[1,o.minZ-radius,o.maxZ+radius]]){
   const d=b[axis]-a[axis];if(Math.abs(d)<1e-10){if(a[axis]<min||a[axis]>max){lo=2;break;}}
   else{let t=(min-a[axis])/d,u=(max-a[axis])/d;if(t>u)[t,u]=[u,t];lo=Math.max(lo,t);hi=Math.min(hi,u);}
  }
  if(lo<=hi&&lo<=1&&hi>=0)return false;
 }
 return true;
}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function pointSegmentDistance(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],v=dx*dx+dz*dz,t=v?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/v)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);}
export function planRoute(start,end,obstacles,seat=null){
 if(!segmentClear(start,start,obstacles,BODY_RADIUS,seat)||!segmentClear(end,end,obstacles,BODY_RADIUS,seat))return null;
 if(segmentClear(start,end,obstacles,BODY_RADIUS,seat))return [[...end]];
 const nx=Math.floor((LIMIT.maxX-LIMIT.minX)/STEP)+1,nz=Math.floor((LIMIT.maxZ-LIMIT.minZ)/STEP)+1;
 const point=i=>[LIMIT.minX+(i%nx)*STEP,LIMIT.minZ+Math.floor(i/nx)*STEP];
 const nearest=p=>{const candidates=[];for(let z=Math.max(0,Math.floor((p[1]-LIMIT.minZ)/STEP)-2);z<Math.min(nz,Math.ceil((p[1]-LIMIT.minZ)/STEP)+3);z++)for(let x=Math.max(0,Math.floor((p[0]-LIMIT.minX)/STEP)-2);x<Math.min(nx,Math.ceil((p[0]-LIMIT.minX)/STEP)+3);x++){const i=z*nx+x,q=point(i);if(segmentClear(p,q,obstacles,BODY_RADIUS,seat))candidates.push(i);}return candidates.sort((a,b)=>distance(p,point(a))-distance(p,point(b)))[0];};
 const first=nearest(start),last=nearest(end);if(first===undefined||last===undefined)return null;
 const open=[first],cost=new Map([[first,0]]),came=new Map(),closed=new Set();
 while(open.length){open.sort((a,b)=>cost.get(a)+distance(point(a),end)-cost.get(b)-distance(point(b),end));const current=open.shift();if(current===last){const route=[end];let i=current;while(i!==undefined){route.unshift(point(i));i=came.get(i);}let anchor=start,out=[];for(let j=0;j<route.length;j++){let furthest=j;while(furthest+1<route.length&&segmentClear(anchor,route[furthest+1],obstacles,BODY_RADIUS,seat))furthest++;out.push(route[furthest]);anchor=route[furthest];j=furthest;}return out;}
 closed.add(current);const x=current%nx,z=Math.floor(current/nx),p=point(current);
 for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const xx=x+dx,zz=z+dz;if(xx<0||xx>=nx||zz<0||zz>=nz)continue;const next=zz*nx+xx;if(closed.has(next))continue;const q=point(next),c=cost.get(current)+distance(p,q);if(c>=(cost.get(next)??Infinity)||!segmentClear(p,q,obstacles,BODY_RADIUS,seat))continue;cost.set(next,c);came.set(next,current);if(!open.includes(next))open.push(next);}
 }
 return null;
}
export function createMovement(){
 const agents=[],byId=new Map();let demo=false,elapsed=0;
 function add({id,floor,position,obstacles,seats,assignedSeat=null}){
  const reserved=new Set(agents.filter(a=>a.floor===floor).map(a=>a.seat?.id));
  const candidates=seats.filter(s=>(!assignedSeat||s.id===assignedSeat)&&!reserved.has(s.id)&&agents.filter(a=>a.floor===floor&&a.seat).every(a=>distance(s.position,a.seat.position)>=PERSONAL_SPACE)).sort((a,b)=>distance(position,a.position)-distance(position,b.position));
  let seat=null,workRoute=null;for(const s of candidates){const route=planRoute(position,s.position,obstacles,s.id);if(route){seat=s;workRoute=route;break;}}
  const agent={id,floor,position:[...position],home:[...position],obstacles,seat,workRoute,route:[],phase:0,dwell:0,clip:'idle',seated:false,moving:false,angle:0,completedSeats:0,blocked:0,status:'unknown',requested:'working'};agents.push(agent);byId.set(id,agent);return agent;
 }
 function setDemo(value){demo=Boolean(value);for(const a of agents){a.route=[];a.arrived=false;a.moving=false;a.status=demo?'demo':'unknown';a.dwell=0;if(demo){a.phase=a.requested==='working'?0:1;a.clip='idle';a.seated=false;}else a.clip=a.seated?'rest':'idle';}}
 function setUnknown(){if(demo)setDemo(false);}
 function setStatuses(records){for(const a of agents){const r=records.find(r=>(r.id??r.botId)===a.id);const next=r?.status??'unknown';if(next!==a.requested){a.standDelay=a.seated?.45:0;a.seated=false;a.requested=next;a.arrived=false;a.route=[];a.dwell=0;a.phase=next==='working'?0:1;}}}
 function goal(a){if(!a.seat)return;const atSeat=a.requested==='working';let target=atSeat?a.seat.position:a.home;if(a.requested==='idle'&&a.phase%2===0){
   if(!a.idlePoint){for(const radius of [1.5,1,.7,.5,.3]){for(let angle=0;angle<Math.PI*2;angle+=Math.PI/32){const p=[a.home[0]+Math.sin(angle)*radius,a.home[1]+Math.cos(angle)*radius];if(segmentClear(a.home,p,a.obstacles)&&agents.every(b=>b===a||b.floor!==a.floor||distance(p,b.home)>=PERSONAL_SPACE)){a.idlePoint=p;break;}}if(a.idlePoint)break;}}
   target=a.idlePoint??a.home;
  }a.route=planRoute(a.position,target,a.obstacles,a.seat.id)??[];a.seated=false;a.clip='idle';}
 function update(dt,{paused=false,reducedMotion=false}={}){
  if(!demo||paused||reducedMotion||!Number.isFinite(dt)||dt<=0)return;
  dt=Math.min(dt,.05);elapsed+=dt;
  // Stable priority: a waiting avatar never crosses another, even within one frame.
  for(const a of agents){a.moving=false;a.waiting=false;if(!a.seat)continue;if(a.standDelay>0){a.standDelay-=dt;a.clip='idle';continue;}
   if(!a.route.length){if(a.arrived&&(a.requested==='working'||a.requested==='review'))continue;if(a.dwell>0){a.dwell-=dt;if(a.dwell>0)continue;if(a.requested==='working'||a.requested==='review')continue;a.phase++;}goal(a);}
   const target=a.route[0];if(!target)continue;const d=distance(a.position,target),step=Math.min(d,dt*.85),next=d?[a.position[0]+(target[0]-a.position[0])*step/d,a.position[1]+(target[1]-a.position[1])*step/d]:[...target];
   if(!segmentClear(a.position,next,a.obstacles,BODY_RADIUS,a.seat.id)||agents.some(b=>b!==a&&a.floor===b.floor&&pointSegmentDistance(b.position,a.position,next)<PERSONAL_SPACE)){a.blocked++;a.waiting=true;a.clip='idle';continue;}
   if(d>.001)a.angle=Math.atan2(next[0]-a.position[0],next[1]-a.position[1]);a.position=next;a.moving=step>0;a.clip='walk';
   if(d<=step+.00001){a.route.shift();if(!a.route.length){a.arrived=true;a.moving=false;a.seated=a.requested==='working';a.angle=a.seated?a.seat.angle+Math.PI:a.angle;a.clip=a.seated?'work':['rest','read','wave'][Math.floor(a.phase/2)%3];a.dwell=a.seated?8:5;a.completedSeats+=Number(a.seated);}}
  }
 }
 function getActivity(id){const a=byId.get(id);return a?{id,clip:a.clip,seatHeight:a.seat?.height??.835,seated:a.seated,moving:a.moving,position:[...a.position],angle:a.angle,mode:demo?'demo':'disconnected',waiting:Boolean(a.waiting),stage:!demo?'unknown':a.moving?'walking':a.seated?'seated':a.clip,status:a.requested,label:!demo?'Sin señal':a.waiting?'Esperando paso seguro · ejemplo':a.moving?(a.requested==='working'?'Caminando al puesto · ejemplo':'Paseando · ejemplo'):({work:'Trabajando sentado',read:'Leyendo',wave:'Conversando',rest:'Descansando',idle:'En espera'}[a.clip]??'En espera')+' · ejemplo'}:null;}
 return {add,setDemo,setUnknown,setStatuses,update,getActivity,getStats:()=>({demo,elapsed,agents:agents.map(a=>({...getActivity(a.id),floor:a.floor,seat:a.seat,home:a.home,completedSeats:a.completedSeats,blocked:a.blocked,obstacles:a.obstacles}))})};
}
