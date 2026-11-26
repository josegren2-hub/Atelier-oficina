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
const swSrc = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const bootSrc = readFileSync(new URL('../src/bootstrap.js', import.meta.url), 'utf8');

test('F1v: en celular, Separación amplia baja el pixelRatio y apaga las sombras', () => {
  assert.match(sceneSrc, /function pixelRatioFor\(viewMode\)/);
  assert.match(sceneSrc, /viewMode==='stacked'\|\|viewMode==='spread'\)\?1\.25:1\.5/);
  const setView = sceneSrc.slice(sceneSrc.indexOf('function setView('), sceneSrc.indexOf('function setMode('));
  assert.match(setView, /renderer\.setPixelRatio\(pixelRatioFor\(mode\)\)/);
  assert.match(setView, /if\(phone&&\(st\|\|sp\)\)\{sun\.castShadow=false;renderer\.shadowMap\.enabled=false;\}/);
  assert.match(setView, /else\{sun\.castShadow=true;renderer\.shadowMap\.enabled=true;\}/);
});

test('F1v: en celular no se animan todos los pisos a la vez al cambiar a Separación amplia', () => {
  const fn = sceneSrc.slice(sceneSrc.indexOf('function startFloorTween'), sceneSrc.indexOf('function hexOf'));
  assert.match(fn, /phone&&\(mode==='stacked'\|\|mode==='spread'\)/);
  assert.match(fn, /floorTween=null;return;/);
});

test('F1v: el service worker se actualiza solo y no cachea version.json', () => {
  assert.match(swSrc, /self\.skipWaiting\(\)/);
  assert.match(swSrc, /self\.clients\.claim\(\)/);
  assert.match(swSrc, /version\.json/);
  assert.match(bootSrc, /updateViaCache:\s*'none'/);
  assert.match(bootSrc, /version\.json/);
  assert.match(bootSrc, /location\.reload\(\)/);
});

test('F1v: al entrar a Separación amplia en un perfil de 390 px se baja el DPR y se apagan las sombras', () => {
  const width=390, height=600;
  const saved=new Map();
  const set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
  const context=new Proxy({}, {get:(o,k)=>k==='createRadialGradient'?()=>({addColorStop(){}}):k==='measureText'?()=>({}):()=>{},set:()=>true});
  set('performance',{now:()=>0});
  set('document',{hidden:false,createElement:(tag)=>{
    const el={style:{},width:0,height:0,getContext:()=>context,addEventListener(){},removeEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width,height})};
    return el;
  },createElementNS:()=>({style:{}}),fonts:{ready:Promise.resolve(),load:()=>Promise.resolve(),add(){}},documentElement:{dataset:{}},querySelector(){return null},querySelectorAll(){return []},addEventListener(){}});
  set('devicePixelRatio',3);
  set('matchMedia',q=>({matches:String(q).includes('max-width'),addEventListener(){},removeEventListener(){}}));
  set('requestAnimationFrame',()=>0);
  set('setTimeout',(fn)=> {try{fn();}catch{} return 0;});
  set('clearTimeout',()=>{});
  set('ResizeObserver',class{observe(){}disconnect(){}});
  set('location',{search:''});
  set('console',{warn(){},error(){},log(){}});
  let scene;
  const ratios=[];
  class Renderer {
    constructor(){
      this.shadowMap={enabled:true,type:null};
      this.capabilities={maxTextureSize:4096,getMaxAnisotropy:()=>4};
      this.domElement={addEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width,height}),style:{},clientWidth:width,clientHeight:height};
      this._pr=1;
    }
    setPixelRatio(v){this._pr=v;ratios.push(v);}
    getPixelRatio(){return this._pr;}
    setSize(){}
    render(){}
    setClearColor(){}
  }
  class Controls {constructor(camera){this.object=camera;this.target=new THREE.Vector3();this.enableRotate=true;this.enablePan=true;this.enableZoom=true;this.enableDamping=true;this.minDistance=12;this.maxDistance=700;this.maxPolarAngle=1.5;this.touches={};}update(){}addEventListener(){}getAzimuthalAngle(){return 0;}getPolarAngle(){return 1;}}
  const engine={...THREE,Scene:class extends THREE.Scene{constructor(){super();scene=this;}},WebGLRenderer:Renderer,PMREMGenerator:class{fromScene(){return {texture:null};}dispose(){}}};
  const furnishingsText=readFileSync(new URL('../src/furnishings.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function').replaceAll('import.meta.env.BASE_URL',"'/'");
  const createFurnishings=new Function('THREE','RoundedBoxGeometry','GLTFLoader',`${furnishingsText};return createFurnishings;`)(THREE,RoundedBoxGeometry,class{load(){}});
  const source=sceneSrc.replace(/^import .*;\n/gm,'').replace('export function','function');
  const deps={createMovement,segmentClear,planRoute,BODY_RADIUS,PERSONAL_SPACE,THREE:engine,OrbitControls:Controls,RoomEnvironment:class{dispose(){}},bots,floors,createFurnishings,fitVolumes,fitOrthographic,applyBottomChromePad,...layout,attachDeskProps,createDeskProp,mountFloorLabels:()=>({update(){},destroy(){}}),createAvatarModels:()=>({attach(){},update(){},getSeatSupport(){return {bottomY:.25};}})};
  const restore=()=>{for(const [k,d] of saved){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}};
  try{
    const createOffice=new Function(...Object.keys(deps),`${source};return createOffice;`)(...Object.values(deps));
    const office=createOffice({clientWidth:width,clientHeight:height,appendChild(){},getBoundingClientRect:()=>({width,height,left:0,top:0}),querySelector(){return null},parentElement:null});
    const renderer=office.renderer;
    office.setMode('exterior');
    const prExt=renderer.getPixelRatio();
    const shExt=renderer.shadowMap.enabled;
    office.setMode('stacked');
    const prSt=renderer.getPixelRatio();
    const shSt=renderer.shadowMap.enabled;
    office.setMode('exterior');
    const prBack=renderer.getPixelRatio();
    const shBack=renderer.shadowMap.enabled;
    assert.equal(prExt, 1.5, `edificio cerrado en celular queda en 1.5, era ${prExt}`);
    assert.equal(prSt, 1.25, `separación amplia en celular baja a 1.25, era ${prSt}`);
    assert.equal(shExt, true, 'sombras encendidas en edificio cerrado');
    assert.equal(shSt, false, 'sombras apagadas en separación amplia en celular');
    assert.equal(prBack, 1.5);
    assert.equal(shBack, true, 'al volver a edificio cerrado las sombras se reencendieron');
    office.setMode('spread');
    assert.equal(renderer.getPixelRatio(), 1.25);
    assert.equal(renderer.shadowMap.enabled, false);
  } finally { restore(); }
});
