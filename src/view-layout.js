import {floors} from './data.js';
export const VIEW_MODES=Object.freeze(['exterior','stacked','spread']);
export const STACK_PITCH=16;
/** Visible vertical window in stacked overview (~three floors + air). Cheap camera change; user still pans for the rest. */
export const STACK_WINDOW_FLOORS=2.6;
export function stackedWindowHeight(){
  return STACK_PITCH*STACK_WINDOW_FLOORS+4.8;
}
export function stackedTargetYRange(){
  const min=2.2;
  const max=Math.max(min,(floors.length-1)*STACK_PITCH+2.2);
  return {min,max};
}
export function floorCaption(index){
  const f=floors[index];
  if(!f)return '';
  return index===0?`PB · ${f.name}`:`Piso ${index} · ${f.name}`;
}
export const ROW_PITCH=31;
export const GRID_DEPTH_PITCH=26;
export function floorPose(index,mode='exterior',isolated=false){
 if(!Number.isInteger(index)||index<0||index>=floors.length)throw new RangeError('Planta desconocida');
 if(!VIEW_MODES.includes(mode))throw new RangeError('Vista desconocida');
 if(isolated)return {x:0,y:index*4.6,z:0};
 // One-page 3×2 grid: all floors including the penthouse (D16/D23).
 if(mode==='spread')return {x:(index%2-.5)*ROW_PITCH,y:0,z:(Math.floor(index/2)-1)*GRID_DEPTH_PITCH};
 return {x:0,y:index*(mode==='stacked'?STACK_PITCH:4.6),z:0};
}
export function viewVolumes(mode='exterior',floor=-1){
 if(!VIEW_MODES.includes(mode))throw new RangeError('Vista desconocida');
 const volumes=[];
 if(mode==='stacked'&&floor<0){
  const h=stackedWindowHeight();
  volumes.push([[-13,0,-9],[16,h,9]]);
  return volumes;
 }
 if(floor>=0){
  // Isolated floor: tight slab so the plan fills most of the canvas (C13).
  const p=floorPose(floor,mode,true);
  volumes.push([[p.x-12.2,p.y,p.z-7.4],[p.x+12.6,p.y+1.55,p.z+7.8]]);
  return volumes;
 }
 if(mode==='exterior')volumes.push([[-19,-1,-15],[19,.2,20]]);
 for(let i=0;i<floors.length;i++){const p=floorPose(i,mode,false);volumes.push([[p.x-13,p.y,p.z-9],[p.x+16,p.y+4.5,p.z+9]]);}
 if(mode==='exterior')volumes.push([[-13,floors.length*4.6-.1,-9],[13,floors.length*4.6+1.1,9]]);
 return volumes;
}
export function viewDirection(mode,floor=-1){
 if(floor>=0)return [0,1.4,0.85]; // high front view so the plan fills canvas width (C13)
 return mode==='spread'?[0,2.2,.8]:mode==='stacked'?[0,1.0,1.4]:[1,.72,1];
}

// Deterministic placement: solid furniture/walls and already occupied spots are
// expanded by the avatar's footprint. No walking path is inferred from status.
export function findAvatarSpot(preferred,obstacles,occupied=[],radius=.85){
 const clear=([x,z])=>x>=-11.5+radius&&x<=8.7-radius&&z>=-8.3+radius&&z<=8.4-radius
  &&obstacles.every(b=>x<b.minX-radius||x>b.maxX+radius||z<b.minZ-radius||z>b.maxZ+radius)
  &&occupied.every(p=>Math.hypot(x-p[0],z-p[1])>=radius*2+.15);
 if(clear(preferred))return [...preferred];
 const candidates=[];
 for(let x=-10.5;x<=7.8;x+=.35)for(let z=-7.3;z<=7.4;z+=.35)candidates.push([x,z]);
 candidates.sort((a,b)=>Math.hypot(a[0]-preferred[0],a[1]-preferred[1])-Math.hypot(b[0]-preferred[0],b[1]-preferred[1]));
 return candidates.find(clear)??null;
}
export const LIGHTING=Object.freeze({
 day:Object.freeze({background:0xe8e4db,sun:1.6,ambient:.65,fill:.4,environment:.25,exposure:1.22,interior:22}),
 // Blue-hour default for San Junípero Tower fachada REF (cool sky, warm interiors).
 dusk:Object.freeze({background:0xb8c4d2,sun:.22,ambient:.42,fill:.35,environment:.1,exposure:1.05,interior:110}),
 night:Object.freeze({background:0x080f20,sun:.13,ambient:.2,fill:.16,environment:.09,exposure:.95,interior:65})
});
export function visualStatus(record,{mode,now=Date.now()}={}){
 if(!record)return 'unknown';
 const timestamp=Date.parse(record.lastSignal),fresh=Number.isFinite(timestamp)&&timestamp<=now+30000&&now-timestamp<=120000;
 if(mode!=='demo'&&!fresh)return 'unknown';
 if(mode==='disconnected')return 'unknown';
 return ['working','review','idle','error'].includes(record.status)?record.status:'unknown';
}
