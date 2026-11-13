/** Floor-local locomotion for demo and live statuses. Routes avoid furniture clipping. */
export const BODY_RADIUS=.85;
export const PERSONAL_SPACE=1.85;
const STEP=.3, LIMIT={minX:-12.1,maxX:8.7,minZ:-8.15,maxZ:8.25};
const GESTURES=['voltea','estira','sorpresa'];

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

function findNearbyPoint(origin,obstacles,agents,self,{radii=[2.2,1.6,1.1,.7],personal=PERSONAL_SPACE}={}){
 for(const radius of radii){
  for(let angle=0;angle<Math.PI*2;angle+=Math.PI/24){
   const p=[origin[0]+Math.sin(angle)*radius,origin[1]+Math.cos(angle)*radius];
   if(!segmentClear(origin,p,obstacles))continue;
   if(agents.some(b=>b!==self&&b.floor===self.floor&&distance(p,b.position)<personal))continue;
   return p;
  }
 }
 return null;
}

export function createMovement(){
 const agents=[],byId=new Map();let demo=false,live=false,elapsed=0;
 function add({id,floor,position,obstacles,seats,assignedSeat=null,lounge=null,meeting=null}){
  const reserved=new Set(agents.filter(a=>a.floor===floor).map(a=>a.seat?.id));
  const candidates=seats.filter(s=>(!assignedSeat||s.id===assignedSeat)&&!reserved.has(s.id)&&agents.filter(a=>a.floor===floor&&a.seat).every(a=>distance(s.position,a.seat.position)>=PERSONAL_SPACE)).sort((a,b)=>distance(position,a.position)-distance(position,b.position));
  let seat=null,workRoute=null;for(const s of candidates){const route=planRoute(position,s.position,obstacles,s.id);if(route){seat=s;workRoute=route;break;}}
  const agent={id,floor,position:[...position],home:[...position],obstacles,seat,workRoute,route:[],phase:0,dwell:0,clip:'idle',seated:false,moving:false,angle:0,completedSeats:0,blocked:0,status:'unknown',requested:'working',gesture:'',gestureT:0,celebrate:0,nextThink:2+Math.random()*4,expression:'neutro',bubble:'',lounge:lounge? [...lounge]:null,meeting:meeting? [...meeting]:null,idlePoint:null};
  agents.push(agent);byId.set(id,agent);return agent;
 }
 function setDemo(value){
  demo=Boolean(value);if(demo)live=false;
  for(const a of agents){a.route=[];a.arrived=false;a.moving=false;a.status=demo?'demo':'unknown';a.dwell=0;a.gesture='';a.celebrate=0;
   if(demo){a.phase=a.requested==='working'?0:1;a.clip='idle';a.seated=false;}else a.clip=a.seated?'rest':'idle';}
 }
 function setLive(value){
  live=Boolean(value);if(live)demo=false;
  for(const a of agents){if(!live){a.route=[];a.moving=false;}}
 }
 function setUnknown(){live=false;if(demo)setDemo(false);for(const a of agents){a.status='unknown';a.requested='unknown';a.route=[];a.moving=false;a.bubble='';a.expression='neutro';}}
 function setStatuses(records){
  for(const a of agents){
   const r=records.find(rec=>(rec.id??rec.botId)===a.id);
   const next=r?.status??'unknown';
   if(next!==a.requested){
    if(a.requested==='working'&&next!=='working'&&next!=='unknown')a.celebrate=3.2;
    a.standDelay=a.seated?.45:0;a.seated=false;a.requested=next;a.arrived=false;a.route=[];a.dwell=0;
    a.phase=next==='working'?0:1;a.nextThink=.2+Math.random();
   }
   a.status=next;
  }
 }
 function pickIdleWander(a){
  // Prefer café/lounge when reachable; else a nearby point around home (etapa3 behavior).
  if(a.lounge&&a.phase%4===0){
   const near=findNearbyPoint(a.lounge,a.obstacles,agents,a,{radii:[.6,1.0,1.5,2.2]});
   if(near&&planRoute(a.position,near,a.obstacles))return near;
  }
  if(!a.idlePoint){
   for(const radius of[1.5,1,.7,.5,.3]){
    for(let angle=0;angle<Math.PI*2;angle+=Math.PI/32){
     const pt=[a.home[0]+Math.sin(angle)*radius,a.home[1]+Math.cos(angle)*radius];
     if(segmentClear(a.home,pt,a.obstacles)&&agents.every(b=>b===a||b.floor!==a.floor||distance(pt,b.home)>=PERSONAL_SPACE)){a.idlePoint=pt;break;}
    }
    if(a.idlePoint)break;
   }
  }
  return a.idlePoint??a.home;
 }
 function goal(a){
  if(!a.seat)return;
  let target=a.home,seatId=a.seat.id;
  if(a.requested==='working'){target=a.seat.position;}
  else if(a.requested==='review'){
   if(a.meeting){
    const meet=findNearbyPoint(a.meeting,a.obstacles,agents,a,{radii:[.8,1.2,1.8]})||a.meeting;
    if(planRoute(a.position,meet,a.obstacles)){target=meet;seatId=null;}
    else{const wait=findNearbyPoint(a.seat.position,a.obstacles,agents,a,{radii:[1.4,1.1,.8,.5]})||a.seat.position;target=wait;seatId=a.seat.id;}
   }else{const wait=findNearbyPoint(a.seat.position,a.obstacles,agents,a,{radii:[1.4,1.1,.8,.5]})||a.seat.position;target=wait;seatId=a.seat.id;}
  }else if(a.requested==='idle'){
   if(a.phase%2===0)target=pickIdleWander(a);else target=a.home;
  }else{target=a.home;}
  a.route=planRoute(a.position,target,a.obstacles,seatId)??[];
  // If lounge/meeting path failed, fall back to home so agents never stall.
  if(!a.route.length&&target!==a.home)a.route=planRoute(a.position,a.home,a.obstacles,a.seat.id)??[];
  a.seated=false;a.clip='idle';
 }
 function think(a,dt){
  a.nextThink-=dt;if(a.nextThink>0||a.moving||a.route.length||a.dwell>0||a.standDelay>0)return;
  a.nextThink=6+Math.random()*10;
  if(a.requested==='working'&&a.seated){
   if(Math.random()<.32){a.gesture=GESTURES[Math.floor(Math.random()*GESTURES.length)];a.gestureT=2.4;}
  }else if(a.requested==='idle'&&!a.moving){
   // Gestures only here; phase advances via dwell expiry in update() (keeps demo clips stable).
   if(Math.random()<.45){a.gesture=Math.random()<.5?'estira':'voltea';a.gestureT=2.4;}
  }else if(a.requested==='review'&&!a.moving){
   if(Math.random()<.25){a.gesture='voltea';a.gestureT=2;}
  }
 }
 function refreshPresentation(a){
  if(a.celebrate>0){a.expression='feliz';a.bubble='✅ 🎉';return;}
  if(a.gesture==='estira'){a.expression='cansado';a.bubble='🙆';return;}
  if(a.gesture==='sorpresa'){a.expression='sorprendido';a.bubble='❗';return;}
  if(a.moving){a.expression='neutro';a.bubble='';return;}
  if(a.requested==='working'&&a.seated){a.expression='concentrado';a.bubble='⌨️';return;}
  if(a.requested==='review'){a.expression='aburrido';a.bubble='⏳ Te espera';return;}
  if(a.requested==='idle'){
   if(a.clip==='wave'){a.expression='feliz';a.bubble='💬';return;}
   if(a.clip==='rest'){a.expression='cansado';a.bubble='☕';return;}
   a.expression='neutro';a.bubble=a.clip==='read'?'':'☕';return;
  }
  a.expression='neutro';a.bubble='';
 }
 function update(dt,{paused=false,reducedMotion=false}={}){
  const active=demo||live;
  if(!active||paused||reducedMotion||!Number.isFinite(dt)||dt<=0)return;
  // Phone-friendly: cap dt to keep locomotion stable on slow frames.
  dt=Math.min(dt,.05);elapsed+=dt;
  for(const a of agents){
   a.moving=false;a.waiting=false;if(!a.seat){refreshPresentation(a);continue;}
   if(a.celebrate>0)a.celebrate-=dt;
   if(a.gestureT>0){a.gestureT-=dt;if(a.gestureT<=0)a.gesture='';}
   if(a.standDelay>0){a.standDelay-=dt;a.clip='idle';refreshPresentation(a);continue;}
   if(!reducedMotion)think(a,dt);
   if(!a.route.length){
    if(a.arrived&&(a.requested==='working'||a.requested==='review')){refreshPresentation(a);continue;}
    if(a.dwell>0){a.dwell-=dt;if(a.dwell>0){refreshPresentation(a);continue;}if(a.requested==='working'||a.requested==='review'){refreshPresentation(a);continue;}a.phase++;}
    goal(a);
   }
   const target=a.route[0];if(!target){refreshPresentation(a);continue;}
   const speed=(live&&!demo?1.05:.85);
   const d=distance(a.position,target),step=Math.min(d,dt*speed),next=d?[a.position[0]+(target[0]-a.position[0])*step/d,a.position[1]+(target[1]-a.position[1])*step/d]:[...target];
   if(!segmentClear(a.position,next,a.obstacles,BODY_RADIUS,a.seat.id)||agents.some(b=>b!==a&&a.floor===b.floor&&pointSegmentDistance(b.position,a.position,next)<PERSONAL_SPACE)){a.blocked++;a.waiting=true;a.clip='idle';refreshPresentation(a);continue;}
   if(d>.001)a.angle=Math.atan2(next[0]-a.position[0],next[1]-a.position[1]);a.position=next;a.moving=step>0;a.clip='walk';
   if(d<=step+.00001){a.route.shift();if(!a.route.length){
    a.arrived=true;a.moving=false;
    if(a.requested==='working'){a.seated=true;a.angle=a.seat.angle+Math.PI;a.clip='work';a.dwell=live?12:8;a.completedSeats+=1;}
    else if(a.requested==='review'){a.seated=false;a.clip='rest';a.dwell=live?14:8;}
    else if(a.requested==='idle'){a.seated=false;a.clip=['rest','read','wave'][Math.floor(a.phase/2)%3];a.dwell=live?3:5;}
    else{a.seated=false;a.clip='idle';a.dwell=4;}
   }}
   refreshPresentation(a);
  }
 }
 function getActivity(id){
  const a=byId.get(id);if(!a)return null;
  const mode=demo?'demo':live?'live':'disconnected';
  const labels={
   working:a.moving?'Caminando al puesto':'Trabajando sentado',
   review:a.moving?'Yendo a esperar':'Te espera',
   idle:a.moving?'Paseando':'En pausa',
   unknown:'Sin señal',
  };
  return {
   id,clip:a.clip,seatHeight:a.seat?.height??.835,seated:a.seated,moving:a.moving,position:[...a.position],angle:a.angle,
   mode,waiting:Boolean(a.waiting),stage:!demo&&!live?'unknown':a.moving?'walking':a.seated?'seated':a.clip,
   status:a.requested,expression:a.expression,bubble:a.bubble,gesture:a.gesture,
   label:mode==='disconnected'?'Sin señal':mode==='demo'
    ?(a.waiting?'Esperando paso seguro · ejemplo':a.moving?(a.requested==='working'?'Caminando al puesto · ejemplo':'Paseando · ejemplo'):({work:'Trabajando sentado',read:'Leyendo',wave:'Conversando',rest:'Descansando',idle:'En espera'}[a.clip]??'En espera')+' · ejemplo')
    :(labels[a.requested]||'Sin señal'),
  };
 }
 return {add,setDemo,setLive,setUnknown,setStatuses,update,getActivity,getStats:()=>({demo,live,elapsed,agents:agents.map(a=>({...getActivity(a.id),floor:a.floor,seat:a.seat,home:a.home,completedSeats:a.completedSeats,blocked:a.blocked,obstacles:a.obstacles}))}),get isLive(){return live;},get isDemo(){return demo;}};
}
