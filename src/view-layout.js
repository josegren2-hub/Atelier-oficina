export const VIEW_MODES=Object.freeze(['exterior','stacked','spread']);
export const STACK_PITCH=18;
export const ROW_PITCH=34;
export const GRID_DEPTH_PITCH=28;
export function floorPose(index,mode='exterior',isolated=false){
 if(!Number.isInteger(index)||index<0||index>3)throw new RangeError('Planta desconocida');
 if(!VIEW_MODES.includes(mode))throw new RangeError('Vista desconocida');
 if(isolated)return {x:0,y:index*4.6,z:0};
 if(mode==='spread')return {x:(index%2-.5)*ROW_PITCH,y:0,z:(Math.floor(index/2)-.5)*GRID_DEPTH_PITCH};
 return {x:0,y:index*(mode==='stacked'?STACK_PITCH:4.6),z:0};
}
export function viewVolumes(mode='exterior',floor=-1){
 if(!VIEW_MODES.includes(mode))throw new RangeError('Vista desconocida');
 const volumes=[];
 if(floor<0&&mode==='exterior')volumes.push([[-19,-1,-15],[19,.2,20]]);
 for(let i=0;i<4;i++){if(floor>=0&&i!==floor)continue;const p=floorPose(i,mode,floor>=0);volumes.push([[p.x-13,p.y,p.z-9],[p.x+16,p.y+4.5,p.z+9]]);}
 if(floor<0&&mode==='exterior')volumes.push([[-13,18.3,-9],[13,19.5,9]]);
 return volumes;
}
export function viewDirection(mode,floor=-1){return floor<0&&mode==='spread'?[0,1.8,1]:floor<0&&mode==='stacked'?[0,.85,1.2]:[1,.72,1];}
