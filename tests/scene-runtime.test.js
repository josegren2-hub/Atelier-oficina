import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {bots,floors} from '../src/data.js';
import {fitVolumes,fitOrthographic} from '../src/camera-fit.js';
import {createMovement,segmentClear,planRoute,BODY_RADIUS,PERSONAL_SPACE,pointSegmentDistance} from '../src/movement.js';
import * as layout from '../src/view-layout.js';

// Exercise the real furniture, batching and scene graph with just GPU/DOM/loaders
// stubbed. Browser screenshot/picking checks remain a separate integration step.
for(const [width,height]of [[1000,600],[390,600]])test(`real scene ${width}×${height}: safe avatars, floor clicks and screen targets after batching`,()=>{
 const saved=new Map();let frameCallback,frameTime=0;
 const set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
 const context=new Proxy({}, {get:(o,k)=>k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
 set('performance',{now:()=>frameTime});
 set('document',{hidden:false,createElement:()=>({getContext:()=>context})});set('devicePixelRatio',1);set('matchMedia',q=>({matches:q.includes('max-width')}));set('requestAnimationFrame',callback=>frameCallback=callback);set('ResizeObserver',class{observe(){}});
 let scene,renderedCamera;const listeners={};
 class Renderer {constructor(){this.shadowMap={};this.domElement={addEventListener:(k,v)=>listeners[k]=v,getBoundingClientRect:()=>({left:0,top:0,width,height})};}setPixelRatio(){}setSize(){}render(s,c){renderedCamera=c;}}
 class Controls {constructor(camera){this.object=camera;this.target=new THREE.Vector3();}update(){}addEventListener(){}}
 const engine={...THREE,Scene:class extends THREE.Scene{constructor(){super();scene=this;}},WebGLRenderer:Renderer,PMREMGenerator:class{fromScene(){return {texture:null};}dispose(){}}};
 const furnishingsText=readFileSync(new URL('../src/furnishings.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function').replaceAll('import.meta.env.BASE_URL',"'/'");
 const createFurnishings=new Function('THREE','RoundedBoxGeometry','GLTFLoader',`${furnishingsText};return createFurnishings;`)(THREE,RoundedBoxGeometry,class{load(){}});
 const source=readFileSync(new URL('../src/scene.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
 const deps={createMovement,segmentClear,planRoute,BODY_RADIUS,PERSONAL_SPACE,pointSegmentDistance,THREE:engine,OrbitControls:Controls,RoomEnvironment:class{dispose(){}},bots,floors,createFurnishings,fitVolumes,fitOrthographic,...layout,createAvatarModels:()=>({attach(){},update(){},getSeatSupport(){return {bottomY:.25};}})};
 try{
  const createOffice=new Function(...Object.keys(deps),`${source};return createOffice;`)(...Object.values(deps));
  const opened=[],floorClicks=[],botClicks=[];
  const office=createOffice({clientWidth:width,clientHeight:height,appendChild(){}},id=>botClicks.push(id),()=>{},id=>opened.push(id),id=>floorClicks.push(id));
  const hosts=[],panels=[];
  scene.traverse(o=>{if(o.isGroup&&o.userData.bot)hosts.push(o);if(o.userData.agenda)panels.push(o);});
  assert.equal(hosts.length,16);assert.equal(new Set(hosts.map(h=>h.parent)).size,5);assert.equal(hosts.filter(h=>h.userData.bot.floor===2).length,6);assert.deepEqual(panels.map(p=>p.userData.agenda),['julian','ted']);
  for(const p of panels)assert.ok(p.children.some(o=>o.isMesh&&o.geometry.type==='PlaneGeometry'));
  for(const host of hosts){
   assert.equal(host.position.y,.3);
   for(const other of hosts.filter(o=>o!==host&&o.parent===host.parent))assert.ok(host.position.distanceTo(other.position)>=1.85);
   // Reconstruct obstacles from remaining non-instanced furnishings. Batched
   // boxes are checked via their individual instance matrices below.
   const floor=host.parent;floor.updateMatrixWorld(true);const inverse=floor.matrixWorld.clone().invert();
   floor.traverse(o=>{
    let ancestor=o;while(ancestor&&ancestor!==floor){if(ancestor.userData.bot)return;ancestor=ancestor.parent;}
    if(!o.isMesh||!o.visible)return;
    const matrices=[];
    if(o.isInstancedMesh){for(let i=0;i<o.count;i++){const m=new THREE.Matrix4();o.getMatrixAt(i,m);matrices.push(inverse.clone().multiply(o.matrixWorld).multiply(m));}}
    else matrices.push(inverse.clone().multiply(o.matrixWorld));
    o.geometry.computeBoundingBox();
    for(const matrix of matrices){const b=o.geometry.boundingBox.clone().applyMatrix4(matrix);if(b.max.y<=.32||b.min.y>=1.95)continue;
     const {x,z}=host.position;assert.ok(x<b.min.x-.84||x>b.max.x+.84||z<b.min.z-.84||z>b.max.z+.84,`${host.userData.bot.id} overlaps ${o.geometry.type}`);
    }
   });
  }
  office.setStatuses({mode:'demo',bots:bots.map(b=>({id:b.id,status:'working'}))});
  for(const host of hosts)assert.equal(host.children.find(c=>c.userData.status).userData.status,'working');
  const verifyFrames=count=>{
   let previous=office.getMovementStats().agents;const walked=new Set(),travelled=new Map();
   for(let i=0;i<count;i++){
    frameTime+=50;frameCallback();const current=office.getMovementStats().agents;
    for(let j=0;j<current.length;j++){
     const a=current[j],old=previous[j];
     assert.ok(segmentClear(old.position,a.position,a.obstacles,BODY_RADIUS,a.seat?.id),`${a.id}: swept obstacle safety`);
     assert.ok(Math.hypot(a.position[0]-old.position[0],a.position[1]-old.position[1])<=.043,'bounded velocity, no teleport');
     if(a.moving)walked.add(a.id);travelled.set(a.id,(travelled.get(a.id)??0)+Math.hypot(a.position[0]-old.position[0],a.position[1]-old.position[1]));
     for(let k=j+1;k<current.length;k++){const b=current[k];if(a.floor!==b.floor)continue;const before=[old.position[0]-previous[k].position[0],old.position[1]-previous[k].position[1]],after=[a.position[0]-b.position[0],a.position[1]-b.position[1]];assert.ok(pointSegmentDistance([0,0],before,after)>=PERSONAL_SPACE-1e-8,`${a.id}/${b.id}: swept personal space`);}
    }
    previous=current;
   }
   walked.travelled=travelled;return walked;
  };
  office.setDemo(true);assert.equal(verifyFrames(1000).size,16,'all 16 walk to their own seats');
  const seated=office.getMovementStats().agents;for(const a of seated){const host=hosts.find(h=>h.userData.bot.id===a.id),visual=host.children.find(o=>o.isGroup);assert.ok(Math.abs(host.position.y+visual.position.y+.25-a.seat.height)<.001,`${a.id}: torso supported by seat cushion`);}assert.equal(seated.filter(a=>a.seated&&a.clip==='work'&&a.completedSeats===1).length,16,'all 16 finish and remain seated');
  office.setStatuses({mode:'demo',bots:bots.map(b=>({id:b.id,status:'idle'}))});
  assert.equal(verifyFrames(1000).size,16,'all 16 leave their seats for idle activities');
  const cycling=verifyFrames(1200);for(const [id,total]of cycling.travelled)assert.ok(total>.5,`${id}: sustained idle displacement > .5`);assert.equal(cycling.size,16,'all 16 continue genuinely walking during the idle cycle');
  office.setStatuses({mode:'demo',bots:bots.map(b=>({id:b.id,status:'working'}))});verifyFrames(1000);
  assert.equal(office.getMovementStats().agents.filter(a=>a.seated).length,16,'all 16 can resume work after idle');
  const frozen=office.getMovementStats().agents.map(a=>a.position);office.setDemo(false);verifyFrames(20);
  assert.deepEqual(office.getMovementStats().agents.map(a=>a.position),frozen,'demo exit preserves positions');
  office.setDemo(true);office.setStatuses({mode:'disconnected',bots:[]});verifyFrames(20);assert.deepEqual(office.getMovementStats().agents.map(a=>a.position),frozen,'source disconnect stops any active demo');
  for(const host of hosts)assert.equal(host.children.find(c=>c.userData.status).userData.status,'unknown');
  office.setNight(true);assert.equal(scene.background.getHex(),layout.LIGHTING.night.background);
  office.setNight(false);assert.equal(scene.background.getHex(),layout.LIGHTING.day.background);
  office.setView(1);assert.equal(hosts.filter(h=>h.parent.visible).length,bots.filter(b=>b.floor===1).length);
  office.setMode('stacked');assert.equal(hosts.filter(h=>h.parent.visible).length,16);
  for(const [floor,id]of [[4,'ted'],[1,'julian']]){
   office.setView(floor);frameCallback();scene.updateMatrixWorld(true);renderedCamera.updateMatrixWorld(true);
   const panel=panels.find(p=>p.userData.agenda===id),face=panel.children.find(o=>o.geometry?.type==='PlaneGeometry');
   const point=face.getWorldPosition(new THREE.Vector3()).project(renderedCamera);
   const e={clientX:(point.x+1)*width/2,clientY:(1-point.y)*height/2};listeners.pointerdown(e);listeners.pointerup(e);
   assert.equal(opened.at(-1),id,`${id} screen must be clickable`);assert.equal(floorClicks.length,0,'agenda has priority over floor');
  }
  const clickPoint=point=>{const p=point.clone().project(renderedCamera),e={clientX:(p.x+1)*width/2,clientY:(1-p.y)*height/2};listeners.pointerdown(e);listeners.pointerup(e);return e;};
  for(const mode of ['exterior','stacked','spread']){
   office.setMode(mode);frameCallback();scene.updateMatrixWorld(true);renderedCamera.updateMatrixWorld(true);
   assert.equal(hosts.filter(h=>h.parent.visible).length,mode==='spread'?15:16);
   for(const f of floors.filter(f=>mode!=='spread'||f.id<4)){
    const group=hosts.find(h=>h.userData.bot.floor===f.id).parent;
    const point=group.localToWorld(new THREE.Vector3(0,.07,9));
    const before=floorClicks.length;clickPoint(point);
    assert.equal(floorClicks.length,before+1,`${mode} floor ${f.id} geometry responds`);
    assert.equal(floorClicks.at(-1),f.id,`${mode} opens the clicked floor`);
   }
  }
  office.setView(4);assert.equal(hosts.filter(h=>h.parent.visible).length,1,'penthouse remains reachable from spread');frameCallback();scene.updateMatrixWorld(true);renderedCamera.updateMatrixWorld(true);
  const ted=hosts.find(h=>h.userData.bot.id==='ted'),beforeFloor=floorClicks.length;
  clickPoint(ted.children.find(o=>o.isSprite).getWorldPosition(new THREE.Vector3()));
  assert.equal(botClicks.at(-1),'ted');assert.equal(floorClicks.length,beforeFloor,'avatar has priority over floor');
  const touchPoint=ted.children.find(o=>o.isSprite).getWorldPosition(new THREE.Vector3()).project(renderedCamera);const touch={clientX:(touchPoint.x+1)*width/2,clientY:(1-touchPoint.y)*height/2+7,pointerType:'touch'};const beforeTouch=botClicks.length;listeners.pointerdown(touch);listeners.pointerup(touch);assert.equal(botClicks.length,beforeTouch+1,'touch near the avatar opens its card');assert.equal(botClicks.at(-1),'ted');
  const before= floorClicks.length,point=ted.parent.localToWorld(new THREE.Vector3(0,.07,9)).project(renderedCamera),e={clientX:(point.x+1)*width/2,clientY:(1-point.y)*height/2};
  listeners.pointerdown(e);listeners.pointerup({...e,clientX:e.clientX+20});assert.equal(floorClicks.length,before,'drag must not navigate');
  listeners.pointerup(e);assert.equal(floorClicks.length,before,'old pointerdown cannot be reused');
  listeners.pointerdown(e);listeners.pointercancel();listeners.pointerup(e);assert.equal(floorClicks.length,before,'cancel must not navigate');
 }finally{for(const[key,descriptor]of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
});
