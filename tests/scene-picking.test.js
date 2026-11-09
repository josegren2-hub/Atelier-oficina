import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {bots,floors} from '../src/data.js';
import {fitVolumes,fitOrthographic} from '../src/camera-fit.js';
import {createMovement,segmentClear,planRoute,BODY_RADIUS,PERSONAL_SPACE} from '../src/movement.js';
import {createAvatarModels} from '../src/avatar-models.js';
import * as layout from '../src/view-layout.js';

function withScene(width,height,run,{left=0,top=0}={}){
 const saved=new Map();let frameCallback,frameTime=0,scene,camera,movement;
 const set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
 const context=new Proxy({}, {get:(o,k)=>k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
 set('performance',{now:()=>frameTime});set('document',{hidden:false,createElement:()=>({getContext:()=>context})});set('devicePixelRatio',1);set('matchMedia',()=>({matches:false}));set('requestAnimationFrame',callback=>frameCallback=callback);set('ResizeObserver',class{observe(){}});
 const listeners={};
 class Renderer {constructor(){this.shadowMap={};this.domElement={addEventListener:(k,v)=>listeners[k]=v,getBoundingClientRect:()=>({left,top,width,height})};}setPixelRatio(){}setSize(){}render(s,c){scene=s;camera=c;s.updateMatrixWorld(true);c.updateMatrixWorld(true);}}
 class Controls {constructor(camera){this.object=camera;this.target=new THREE.Vector3();}update(){this.object.lookAt(this.target);}addEventListener(){}}
 const engine={...THREE,WebGLRenderer:Renderer,PMREMGenerator:class{fromScene(){return {texture:null};}dispose(){}}};
 const furnishingsText=readFileSync(new URL('../src/furnishings.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function').replaceAll('import.meta.env.BASE_URL',"'/'");
 const createFurnishings=new Function('THREE','RoundedBoxGeometry','GLTFLoader',`${furnishingsText};return createFurnishings;`)(THREE,RoundedBoxGeometry,class{load(){}});
 const source=readFileSync(new URL('../src/scene.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
 const deps={createMovement:()=>{movement=createMovement();return movement;},segmentClear,planRoute,BODY_RADIUS,PERSONAL_SPACE,THREE:engine,OrbitControls:Controls,RoomEnvironment:class{dispose(){}},bots,floors,createFurnishings,fitVolumes,fitOrthographic,...layout,createAvatarModels};
 try{
  const createOffice=new Function(...Object.keys(deps),`${source};return createOffice;`)(...Object.values(deps));
  const selected=[],agendas=[],floorClicks=[];
  const office=createOffice({clientWidth:width,clientHeight:height,appendChild(){}},id=>selected.push(id),()=>{},id=>agendas.push(id),id=>floorClicks.push(id));
  const advanceMovement=count=>{for(let i=0;i<count;i++)movement.update(.05);};
  const frames=count=>{for(let i=0;i<count;i++){frameTime+=50;frameCallback();}};
  const hosts=[];scene.traverse(o=>{if(o.userData.bot&&Number.isInteger(o.parent?.userData.floorId))hosts.push(o);});
  const project=point=>{const p=point.clone().project(camera);return {clientX:left+(p.x+1)*width/2,clientY:top+(1-p.y)*height/2};};
  const hitAt=e=>{const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-left)/width*2-1,1-(e.clientY-top)/height*2),camera);return ray.intersectObject(scene,true).filter(h=>{for(let o=h.object;o;o=o.parent)if(!o.visible)return false;return !h.object.material?.transparent||h.object.isSprite&&h.object.userData.bot;});};
  const click=e=>{listeners.pointerdown(e);listeners.pointerup(e);};
  run({office,frames,advanceMovement,hosts,project,hitAt,click,selected,agendas,floorClicks,get camera(){return camera;},scene});
 }finally{for(const[key,descriptor]of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
}

// Unlike scene-runtime.test.js, these tests keep the actual local plush models,
// animation poses and raycasting geometry. Only WebGL, DOM and the sofa loader
// are stubbed. Movement can advance independently to avoid rendering 1,000
// identical frames while retaining its real routes and eventual seated state.
const targetOf=object=>{let node=object;while(node&&!node.userData.bot&&!node.userData.agenda&&!Number.isInteger(node.userData.floorId))node=node.parent;return node;};
for(const [width,height,top]of [[1037,700,0],[375,350.90625,465.6875]])test(`real plush picking ${width}×${height}: small mouse/touch targets while moving and seated`,()=>withScene(width,height,h=>{
 const {office,frames,advanceMovement,hosts,project,hitAt,click,selected,agendas,floorClicks,scene}=h;
 const torsoOf=host=>host.getObjectByName('Rounded stuffed body')??host.getObjectByName('Soft extruded silhouette')??host.getObjectByName('Round stuffed body');
 const firstTarget=e=>targetOf(hitAt(e)[0]?.object);
 function verifyAvatar(id,phase){
  const host=hosts.find(o=>o.userData.bot.id===id),torso=torsoOf(host);
  assert.ok(torso?.isMesh,'test uses actual avatar body geometry');
  // Exclude name labels/status lamps so the body alone must be selectable.
  const decorations=host.children.filter(o=>o.isSprite||o.userData.status);
  decorations.forEach(o=>o.visible=false);scene.updateMatrixWorld(true);
  for(const y of [0,.3]){
   const e=project(torso.localToWorld(new THREE.Vector3(0,y,0)));
   assert.equal(firstTarget(e)?.userData.bot?.id,id,`${phase}: body/head is visible, not occluded`);
   for(const pointerType of ['mouse','touch']){
    const before=selected.length,beforeFloor=floorClicks.length;click({...e,pointerType});
    assert.equal(selected.length,before+1,`${phase}: exact ${pointerType} body/head`);assert.equal(selected.at(-1),id);assert.equal(floorClicks.length,beforeFloor);
   }
  }
  const center=project(torso.localToWorld(new THREE.Vector3(0,.12,0)));
  // Find the first pixel just outside the actual visible body, not an invented
  // hit box. A small target must not redirect such a miss to floor navigation.
  let edge;
  for(let dx=1;dx<=30;dx++){
   const e={...center,clientX:center.clientX+dx};
   if(Number.isInteger(firstTarget(e)?.userData.floorId)){edge=e;break;}
  }
  assert.ok(edge,`${phase}: nearby floor pixel exists`);
  for(const pointerType of ['mouse','touch','pen']){
   const before=selected.length,beforeFloor=floorClicks.length;click({...edge,pointerType});
   assert.equal(selected.length,before+1,`${phase}: ${pointerType} near body edge`);assert.equal(selected.at(-1),id);assert.equal(floorClicks.length,beforeFloor);
  }
  decorations.forEach(o=>o.visible=true);
  return {host,torso,center};
 }
 office.setView(4);frames(2);
 office.setStatuses({mode:'demo',bots:bots.map(b=>({id:b.id,status:'working'}))});office.setDemo(true);frames(8);
 assert.equal(office.getActivity('ted').moving,true);verifyAvatar('ted','walking Ted');
 advanceMovement(1000);frames(45);
 assert.equal(office.getActivity('ted').seated,true);const {host:ted,torso}=verifyAvatar('ted','seated Ted');
 // Opaque geometry must block every helper ray as well as the central ray.
 const body=torso.getWorldPosition(new THREE.Vector3()),towardCamera=h.camera.position.clone().sub(body).normalize();
 const wall=new THREE.Mesh(new THREE.PlaneGeometry(8,8),new THREE.MeshBasicMaterial({color:0x333333,side:THREE.DoubleSide}));
 wall.position.copy(ted.parent.worldToLocal(body.clone().add(towardCamera)));wall.quaternion.copy(h.camera.quaternion);ted.parent.add(wall);scene.updateMatrixWorld(true);
 const blocked=project(body);assert.equal(hitAt(blocked)[0].object,wall);
 for(const pointerType of ['mouse','touch']){const before=selected.length;click({...blocked,pointerType});assert.equal(selected.length,before,'opaque wall prevents avatar selection');}
 wall.removeFromParent();wall.geometry.dispose();wall.material.dispose();
 // Existing agenda/floor interactions retain priority and meaning.
 let panel;scene.traverse(o=>{if(o.userData.agenda==='ted')panel=o;});
 const face=panel.children.find(o=>o.geometry?.type==='PlaneGeometry'),agendaPoint=project(face.getWorldPosition(new THREE.Vector3()));
 const beforeAgendaFloor=floorClicks.length;click({...agendaPoint,pointerType:'mouse'});assert.equal(agendas.at(-1),'ted');assert.equal(floorClicks.length,beforeAgendaFloor);
 const beforeFloor=floorClicks.length;click({...project(ted.parent.localToWorld(new THREE.Vector3(0,.07,9))),pointerType:'mouse'});assert.equal(floorClicks.length,beforeFloor+1);assert.equal(floorClicks.at(-1),4);
 // Spread uses a different camera, scale and animated floor transforms.
 office.setMode('spread');frames(150);office.setStatuses({mode:'demo',bots:bots.map(b=>({id:b.id,status:'idle'}))});frames(20);
 assert.equal(office.getActivity('ceo').moving,true);verifyAvatar('ceo','walking Tommy in spread');
 advanceMovement(60);frames(1);
 assert.equal(office.getActivity('ceo').clip,'rest');verifyAvatar('ceo','resting Tommy in spread');
},{top}));
