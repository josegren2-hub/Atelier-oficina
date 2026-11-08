import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {bots,floors} from '../src/data.js';
import {fitVolumes,fitOrthographic} from '../src/camera-fit.js';
import * as layout from '../src/view-layout.js';

// Exercise the real furniture, batching and scene graph with just GPU/DOM/loaders
// stubbed. Browser screenshot/picking checks remain a separate integration step.
test('real scene places all 16 avatars safely and preserves screen targets after batching',()=>{
 const saved=new Map();
 const set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
 const context=new Proxy({}, {get:(o,k)=>k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
 set('document',{hidden:false,createElement:()=>({getContext:()=>context})});set('devicePixelRatio',1);set('matchMedia',()=>({matches:true}));set('requestAnimationFrame',()=>{});set('ResizeObserver',class{observe(){}});
 let scene,renderedCamera;const listeners={};
 class Renderer {constructor(){this.shadowMap={};this.domElement={addEventListener:(k,v)=>listeners[k]=v,getBoundingClientRect:()=>({left:0,top:0,width:1000,height:600})};}setPixelRatio(){}setSize(){}render(s,c){renderedCamera=c;}}
 class Controls {constructor(camera){this.object=camera;this.target=new THREE.Vector3();}update(){}addEventListener(){}}
 const engine={...THREE,Scene:class extends THREE.Scene{constructor(){super();scene=this;}},WebGLRenderer:Renderer,PMREMGenerator:class{fromScene(){return {texture:null};}dispose(){}}};
 const furnishingsText=readFileSync(new URL('../src/furnishings.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function').replaceAll('import.meta.env.BASE_URL',"'/'");
 const createFurnishings=new Function('THREE','RoundedBoxGeometry','GLTFLoader',`${furnishingsText};return createFurnishings;`)(THREE,RoundedBoxGeometry,class{load(){}});
 const source=readFileSync(new URL('../src/scene.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
 const deps={THREE:engine,OrbitControls:Controls,RoomEnvironment:class{dispose(){}},bots,floors,createFurnishings,fitVolumes,fitOrthographic,...layout,createAvatarModels:()=>({attach(){},update(){}})};
 try{
  const createOffice=new Function(...Object.keys(deps),`${source};return createOffice;`)(...Object.values(deps));
  const opened=[];
  const office=createOffice({clientWidth:1000,clientHeight:600,appendChild(){}},()=>{},()=>{},id=>opened.push(id));
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
  office.setStatuses({mode:'disconnected',bots:[]});
  for(const host of hosts)assert.equal(host.children.find(c=>c.userData.status).userData.status,'unknown');
  office.setNight(true);assert.equal(scene.background.getHex(),layout.LIGHTING.night.background);
  office.setNight(false);assert.equal(scene.background.getHex(),layout.LIGHTING.day.background);
  office.setView(1);assert.equal(hosts.filter(h=>h.parent.visible).length,bots.filter(b=>b.floor===1).length);
  office.setMode('stacked');assert.equal(hosts.filter(h=>h.parent.visible).length,16);
  for(const [floor,id]of [[4,'ted'],[1,'julian']]){
   office.setView(floor);scene.updateMatrixWorld(true);renderedCamera.updateMatrixWorld(true);
   const panel=panels.find(p=>p.userData.agenda===id),face=panel.children.find(o=>o.geometry?.type==='PlaneGeometry');
   const point=face.getWorldPosition(new THREE.Vector3()).project(renderedCamera);
   const e={clientX:(point.x+1)*500,clientY:(1-point.y)*300};listeners.pointerdown(e);listeners.pointerup(e);
   assert.equal(opened.at(-1),id,`${id} screen must be clickable`);
  }
 }finally{for(const[key,descriptor]of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
});
