/** Approved 16-shape plush study, rebuilt locally as volumetric geometry. No remote assets. */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PLUSH_TEMPLATES = Object.freeze([
 {shape:'triangle',color:'#ffca32',accessory:'bow-glasses'},
 {shape:'flower',color:'#19b9f0',accessory:'beret',wink:true},
 {shape:'capsule',color:'#f9d9b2',accessory:'headphones'},
 {shape:'heart',color:'#f342aa',accessory:'heart-glasses'},
 {shape:'star',color:'#ff827a',accessory:'none'},
 {shape:'cube',color:'#bc81ed',accessory:'glasses'},
 {shape:'drop',color:'#37be83',accessory:'headphones'},
 {shape:'diamond',color:'#ffb18c',accessory:'beret'},
 {shape:'flower',color:'#2779e7',accessory:'none',lobes:4},
 {shape:'sphere',color:'#ffe4b8',accessory:'bow'},
 {shape:'triangle',color:'#c965dd',accessory:'glasses',trim:'#6ce7df'},
 {shape:'capsule',color:'#63cdf5',accessory:'scarf'},
 {shape:'hexagon',color:'#ffad27',accessory:'glasses'},
 {shape:'star',color:'#9ce3bd',accessory:'headphones'},
 {shape:'flower',color:'#ff9fc7',accessory:'none',sleeping:true},
 {shape:'heart',color:'#f44861',accessory:'beret'},
].map((entry,i)=>Object.freeze({...entry,template:i+1})));

function fabric(color) {
 const material=new THREE.MeshPhysicalMaterial({color,roughness:.96,metalness:0,sheen:.85,sheenColor:'#fff4e6',sheenRoughness:1});
 material.name='Local procedural plush fabric';
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vPlushLocal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vPlushLocal=position;');
  shader.fragmentShader='varying vec3 vPlushLocal;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float grain=fract(sin(dot(floor(vPlushLocal*640.0),vec3(12.9898,78.233,43.631)))*43758.5453);
   diffuseColor.rgb*=.88+.16*grain;
   roughnessFactor=clamp(roughnessFactor+.06*(grain-.5),.8,1.);`);
 };
 material.customProgramCacheKey=()=> 'approved-plush-local-grain-v1';
 return material;
}
function outline(kind,lobes=5) {
 const shape=new THREE.Shape();
 if(kind==='heart') {
  shape.moveTo(0,-.48);shape.bezierCurveTo(-.18,-.32,-.53,-.06,-.5,.24);shape.bezierCurveTo(-.47,.53,-.15,.56,0,.32);shape.bezierCurveTo(.15,.56,.47,.53,.5,.24);shape.bezierCurveTo(.53,-.06,.18,-.32,0,-.48);
 } else if(kind==='drop') {
  shape.moveTo(0,.52);shape.bezierCurveTo(-.25,.53,-.34,.21,-.45,-.08);shape.bezierCurveTo(-.62,-.48,-.23,-.5,0,-.5);shape.bezierCurveTo(.23,-.5,.62,-.48,.45,-.08);shape.bezierCurveTo(.34,.21,.25,.53,0,.52);
 } else {
  let points=[];
  if(kind==='flower')for(let i=0;i<120;i++){const a=Math.PI/2+i*Math.PI*2/120,r=.44+.08*Math.cos(lobes*(a-Math.PI/2));points.push(new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r));}
  else {const n=kind==='triangle'?3:kind==='diamond'?4:kind==='hexagon'?6:10;for(let i=0;i<n;i++){const a=Math.PI/2+i*Math.PI*2/n;const r=kind==='star'?(i%2?.29:.53):.51;points.push(new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r));}}
  // Quadratic corners leave broad recognizable silhouettes without hard tips.
  const f=kind==='flower'?.48:kind==='star'?.26:.21;
  for(let i=0;i<points.length;i++){const prev=points[(i+points.length-1)%points.length],p=points[i],next=points[(i+1)%points.length];const a=p.clone().lerp(prev,f),b=p.clone().lerp(next,f);if(!i)shape.moveTo(a.x,a.y);else shape.lineTo(a.x,a.y);shape.quadraticCurveTo(p.x,p.y,b.x,b.y);}shape.closePath();
 }
 return shape;
}

export function createPlushModel(config) {
 const root=new THREE.Group();root.name=`Plush ${config.modelId??''} · template ${String(config.template).padStart(2,'0')}`;
 const spec={...PLUSH_TEMPLATES[config.template-1],...config};
 if(!PLUSH_TEMPLATES[spec.template-1])throw new RangeError('Unknown plush template');
 root.userData.plushProvenance={source:'approved-template-16',implementation:'local-procedural-3d',template:spec.template,shape:spec.shape,color:spec.color,accessory:spec.accessory,modelId:spec.modelId};
 const cloth=fabric(spec.color),dark=new THREE.MeshStandardMaterial({color:'#25222b',roughness:.75}),trim=fabric(spec.trim??'#302738'),cream=fabric('#fff0d8'),skin=fabric('#ffdbbf'),cheek=fabric('#f6a39c');
 const sphere=new THREE.SphereGeometry(1,32,24),eyes=[],arms=[];
 function mesh(name,geometry,material,parent=root){const obj=new THREE.Mesh(geometry,material);obj.name=name;obj.castShadow=true;obj.receiveShadow=true;parent.add(obj);return obj;}
 function ball(name,pos,size,mat=cloth,parent=root){const obj=mesh(name,sphere,mat,parent);obj.position.set(...pos);obj.scale.set(...size);return obj;}
 function tube(name,points,radius,mat=dark,parent=root){return mesh(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,radius,8,false),mat,parent);}
 let torso;
 if(spec.shape==='sphere')torso=ball('Round stuffed body',[0,0,0],[.5,.51,.33]);
 else if(spec.shape==='cube'||spec.shape==='capsule')torso=mesh('Rounded stuffed body',new RoundedBoxGeometry(spec.shape==='cube'?.92:.77,1,.56,8,spec.shape==='cube'?.18:.31),cloth);
 else {const geometry=new THREE.ExtrudeGeometry(outline(spec.shape,spec.lobes),{depth:.25,bevelEnabled:true,bevelThickness:.125,bevelSize:.085,bevelSegments:8,curveSegments:32,steps:1});geometry.translate(0,0,-.125);geometry.computeVertexNormals();torso=mesh('Soft extruded silhouette',geometry,cloth);}
 const capsule=spec.shape==='capsule',faceZ=spec.shape==='sphere'?.335:capsule?.345:.262;
 if(capsule){ball('Inset face',[0,.12,.257],[.292,.22,.095],skin);for(const s of[-1,1]){ball('Tiny foot',[s*.15,-.49,.06],[.12,.075,.14]);const arm=new THREE.Group();arm.position.set(s*.385,-.18,0);root.add(arm);ball('Tiny plush hand',[0,-.02,.02],[.088,.13,.11],cloth,arm);arms.push(arm);}}
 const faceY=capsule?.12:.035;
 for(const s of[-1,1]){
  if(spec.sleeping||(spec.wink&&s<0)){tube('Closed embroidered eye',[[s*.145-.054,faceY+.025,faceZ],[s*.145,faceY-.005,faceZ+.004],[s*.145+.054,faceY+.025,faceZ]],.012);}
  else{const eye=ball('Small glossy eye',[s*.145,faceY+.035,faceZ],[.027,.042,.022],dark);eyes.push(eye);ball('Eye glint',[s*.145-.006,faceY+.05,faceZ+.019],[.006,.009,.004],cream);}
  if(capsule||spec.shape==='sphere')ball('Blush',[s*.225,faceY-.058,faceZ-.008],[.045,.024,.009],cheek);
 }
 tube(spec.serious?'Calm embroidered mouth':'Embroidered smile',[[-.045,faceY-.065,faceZ+.006],[0,faceY-(spec.serious?.068:.09),faceZ+.014],[.045,faceY-.065,faceZ+.006]],.009);
 if(spec.accessory.includes('glasses')){
  for(const s of[-1,1]){
   if(spec.accessory==='heart-glasses'){const geo=new THREE.ExtrudeGeometry(outline('heart'),{depth:.018,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:3,curveSegments:16});const lens=mesh('Heart sunglasses',geo,dark);lens.position.set(s*.19,faceY+.04,faceZ+.045);lens.scale.set(.29,.29,.6);}
   else{const ring=mesh('Round glasses',new THREE.TorusGeometry(.116,.014,10,48),trim);ring.position.set(s*.16,faceY+.035,faceZ+.04);}
  }
  tube('Glasses bridge',[[-.045,faceY+.04,faceZ+.045],[0,faceY+.05,faceZ+.055],[.045,faceY+.04,faceZ+.045]],.012,trim);
  for(const s of[-1,1])tube('Glasses arm',[[s*.28,faceY+.04,faceZ+.035],[s*.34,faceY+.035,faceZ+.01]],.012,trim);
 }
 if(spec.accessory.includes('bow')){for(const s of[-1,1]){const wing=ball('Soft bow wing',[s*.105,-.24,faceZ+.008],[.115,.075,.048],trim);wing.rotation.z=s*.22;}ball('Bow knot',[0,-.24,faceZ+.055],[.04,.045,.035],trim);}
 if(spec.accessory==='headphones'){
  const pts=[];for(let i=0;i<=24;i++){const t=i/24*Math.PI;pts.push([-.48*Math.cos(t),.05+.52*Math.sin(t),-.01]);}tube('Padded headphone band',pts,.034,trim);
  for(const s of[-1,1]){ball('Headphone cushion',[s*.46,.055,0],[.082,.155,.17],cream);ball('Headphone shell',[s*.515,.055,0],[.055,.13,.145],trim);}
 }
 if(spec.accessory==='beret'){
  const cap=new THREE.Group();cap.position.set(-.035,.465,0);cap.rotation.z=.25;root.add(cap);ball('Velvet beret',[0,.035,0],[.47,.125,.32],trim,cap);ball('Beret crown',[-.04,.12,0],[.36,.085,.26],trim,cap);ball('Beret stalk',[-.1,.205,0],[.025,.045,.024],trim,cap);
 }
 if(spec.accessory==='scarf'){
  const scarf=fabric('#bd85dc');const collar=mesh('Soft scarf collar',new RoundedBoxGeometry(.86,.15,.64,6,.06),scarf);collar.position.y=-.13;
  const tail=mesh('Scarf tail',new RoundedBoxGeometry(.16,.3,.07,5,.025),scarf);tail.position.set(.24,-.32,.34);tail.rotation.z=.12;
  for(let i=0;i<4;i++)ball('Scarf fringe',[.19+i*.036,-.48,.34],[.016,.045,.025],scarf);
 }
 if(spec.serious){const tie=mesh('Julian formal tie',new THREE.ExtrudeGeometry(outline('diamond'),{depth:.02,bevelEnabled:true,bevelSize:.01,bevelThickness:.01,bevelSegments:3}),trim);tie.position.set(0,-.265,faceZ+.03);tie.scale.set(.105,.22,1);ball('Tie knot',[0,-.15,faceZ+.055],[.04,.035,.025],trim);}
 if(spec.hero){
  const gold=new THREE.MeshPhysicalMaterial({color:'#d9ac47',metalness:.5,roughness:.4,emissive:'#8a5511',emissiveIntensity:.12});
  for(const side of[-1,1]){const rim=mesh('Ted gold headphone trim',new THREE.TorusGeometry(.133,.009,8,40),gold);rim.rotation.y=Math.PI/2;rim.position.set(side*.55,.055,0);}
  const halo=mesh('Ted decorative halo · not activity',new THREE.TorusGeometry(.48,.008,8,64),gold);halo.rotation.x=Math.PI/2;halo.position.y=-.557;halo.scale.y=.7;
 }
 root.userData.plushRig={eyes,arms};return root;
}

export function animatePlushModel(root,{time=0,clip=null,reducedMotion=false}={}) {
 const active=!!clip&&!reducedMotion,t=active&&Number.isFinite(time)?time:0;
 root.position.set(0,0,0);root.rotation.set(0,0,active?Math.sin(t*1.7)*.014:0);root.scale.set(1,active?1+Math.sin(t*2)*.005:1,1);
 const rig=root.userData.plushRig;
 for(const eye of rig?.eyes??[])eye.scale.y=active&&t%5.2<.11?.006:.042;
 (rig?.arms??[]).forEach((arm,i)=>{arm.rotation.set(clip==='work'&&active?-.12+Math.sin(t*3+i)*.04:0,0,clip==='wave'&&active&&i===0?-.55+Math.sin(t*3)*.1:0);});
}
