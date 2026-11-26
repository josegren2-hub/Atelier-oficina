import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {bots,floors} from '../src/data.js';
import {fitVolumes,fitOrthographic,applyBottomChromePad} from '../src/camera-fit.js';
import {createMovement,segmentClear,planRoute,BODY_RADIUS,PERSONAL_SPACE} from '../src/movement.js';
import * as layout from '../src/view-layout.js';
import {attachDeskProps, createDeskProp} from '../src/desk-props.js';

const sceneSrc = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');

test('F1u: el lienzo no se repinta en cada frame del tween de luz, solo al cambiar día/noche', () => {
  const start = sceneSrc.indexOf('function applyCrownLighting');
  const fn = sceneSrc.slice(start, sceneSrc.indexOf('// Si el celular pierde el contexto WebGL', start));
  assert.match(fn, /if\(night!==crownIsNight && typeof crownSignPaint==='function'\)crownSignPaint\(night\)/);
  assert.doesNotMatch(fn, /crownSignPaint\(crownIsNight\)/);
});

test('F1u: hay manejo de webglcontextlost/restored y se pide la restauración', () => {
  assert.match(sceneSrc, /addEventListener\('webglcontextlost',ev=>\{ev\.preventDefault\(\)/);
  assert.match(sceneSrc, /addEventListener\('webglcontextrestored'/);
  assert.match(sceneSrc, /crownSignTex\.needsUpdate=true/);
});

test('F1u: cambiar de vista no crea un canvas ni una textura nueva del letrero', () => {
  const setView = sceneSrc.slice(sceneSrc.indexOf('function setView('), sceneSrc.indexOf('function setMode('));
  const setMode = sceneSrc.slice(sceneSrc.indexOf('function setMode('), sceneSrc.indexOf('function aplicarFondoEscena('));
  assert.doesNotMatch(setView, /new THREE\.CanvasTexture|createElement\('canvas'\)|paintCrownSign|crownSignPaint/);
  assert.doesNotMatch(setMode, /new THREE\.CanvasTexture|createElement\('canvas'\)|paintCrownSign|crownSignPaint/);
  // Una sola construcción del CanvasTexture del letrero (el tótem y las etiquetas de bots son otros).
  const signBlock = sceneSrc.slice(sceneSrc.indexOf('const CROWN_LETTERS=true'), sceneSrc.indexOf('function applyCrownLighting'));
  assert.equal([...signBlock.matchAll(/new THREE\.CanvasTexture/g)].length, 1);
});

test('F1u: al entrar y salir de Separación amplia no aparecen texturas de letrero nuevas', () => {
  const width=390, height=600;
  const saved=new Map();
  const set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
  const context=new Proxy({}, {get:(o,k)=>k==='createRadialGradient'?()=>({addColorStop(){}}):k==='measureText'?()=>({}):()=>{},set:()=>true});
  const canvases=[];
  set('performance',{now:()=>0});
  set('document',{hidden:false,createElement:(tag)=>{
    const el={style:{},width:0,height:0,getContext:()=>context,addEventListener(){},removeEventListener(){}};
    if(tag==='canvas')canvases.push(el);
    return el;
  },createElementNS:()=>({style:{}}),fonts:{ready:Promise.resolve(),load:()=>Promise.resolve(),add(){}},documentElement:{dataset:{}},querySelector(){return null},querySelectorAll(){return []}});
  set('devicePixelRatio',1);
  set('matchMedia',q=>({matches:String(q).includes('max-width'),addEventListener(){},removeEventListener(){}}));
  set('requestAnimationFrame',()=>0);
  set('setTimeout',(fn)=> {try{fn();}catch{} return 0;});
  set('clearTimeout',()=>{});
  set('ResizeObserver',class{observe(){}disconnect(){}});
  set('location',{search:''});
  set('console',{warn(){},error(){},log(){}});
  let scene;
  class Renderer {constructor(){this.shadowMap={};this.capabilities={maxTextureSize:4096,getMaxAnisotropy:()=>4};this.domElement={addEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width,height})};}setPixelRatio(){}setSize(){}render(){}setClearColor(){}}
  class Controls {constructor(camera){this.object=camera;this.target=new THREE.Vector3();}update(){}addEventListener(){}getAzimuthalAngle(){return 0;}getPolarAngle(){return 1;}}
  const engine={...THREE,Scene:class extends THREE.Scene{constructor(){super();scene=this;}},WebGLRenderer:Renderer,PMREMGenerator:class{fromScene(){return {texture:null};}dispose(){}}};
  const furnishingsText=readFileSync(new URL('../src/furnishings.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function').replaceAll('import.meta.env.BASE_URL',"'/'");
  const createFurnishings=new Function('THREE','RoundedBoxGeometry','GLTFLoader',`${furnishingsText};return createFurnishings;`)(THREE,RoundedBoxGeometry,class{load(){}});
  const source=sceneSrc.replace(/^import .*;\n/gm,'').replace('export function','function');
  const deps={createMovement,segmentClear,planRoute,BODY_RADIUS,PERSONAL_SPACE,THREE:engine,OrbitControls:Controls,RoomEnvironment:class{dispose(){}},bots,floors,createFurnishings,fitVolumes,fitOrthographic,applyBottomChromePad,...layout,attachDeskProps,createDeskProp,mountFloorLabels:()=>({update(){},destroy(){}}),createAvatarModels:()=>({attach(){},update(){},getSeatSupport(){return {bottomY:.25};}})};
  const restore=()=>{for(const [k,d] of saved){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}};
  try{
    const createOffice=new Function(...Object.keys(deps),`${source};return createOffice;`)(...Object.values(deps));
    const office=createOffice({clientWidth:width,clientHeight:height,appendChild(){},getBoundingClientRect:()=>({width,height,left:0,top:0})});
    const maps=()=>{const s=new Set();scene.traverse(o=>{const mats=[].concat(o.material||[]);for(const m of mats){if(m&&m.map)s.add(m.map);}});return s;};
    const before=maps();
    const signMaps=[...before].filter(t=>t.image&&(t.image.width===4096||t.image.width>=2048));
    assert.ok(signMaps.length<=1, `un solo lienzo de letrero, había ${signMaps.length}`);
    const beforeCount=before.size;
    for(let i=0;i<8;i++){
      office.setMode('stacked');
      office.setMode('exterior');
      office.setMode('spread');
    }
    office.setNight?.(true);
    office.setNight?.(false);
    office.setNight?.(true);
    const after=maps();
    assert.equal(after.size, beforeCount, 'cambiar de vista o de día/noche no crea texturas nuevas');
    for(const t of before)assert.ok(after.has(t), 'las texturas originales siguen siendo las mismas instancias');
  }finally{restore();}
});
