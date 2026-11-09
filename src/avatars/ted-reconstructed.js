/**
 * New reconstruction of approved reference option 03, not the lost pilot asset.
 * Local geometry only. Identity scale (+15%) belongs to the office adapter.
 */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

function fabric(color) {
 const material=new THREE.MeshPhysicalMaterial({color,roughness:.96,metalness:0,sheen:.85,sheenColor:'#fff4e6',sheenRoughness:1});
 material.name='Ted reconstructed local plush fabric';
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vTedLocal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vTedLocal=position;');
  shader.fragmentShader='varying vec3 vTedLocal;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float grain=fract(sin(dot(floor(vTedLocal*640.0),vec3(12.9898,78.233,43.631)))*43758.5453);
   diffuseColor.rgb*=.90+.12*grain;
   roughnessFactor=clamp(roughnessFactor+.05*(grain-.5),.8,1.);`);
 };
 material.customProgramCacheKey=()=> 'ted-reconstructed-local-grain-v1';
 return material;
}

export function createTedReconstructed(config={}) {
 const root=new THREE.Group();
 root.name='Ted · reconstructed cream plush';
 root.userData.plushProvenance={source:'approved-template-16',implementation:'local-procedural-3d',template:3,shape:'capsule',color:config.color??'#f9d9b2',accessory:'headphones',modelId:config.modelId??'ted',revision:'ted-reconstructed-v1',reconstruction:true};
 const cloth=fabric(config.color??'#f9d9b2'),skin=fabric('#ffdbbf'),cheek=fabric('#f6a39c');
 const dark=new THREE.MeshStandardMaterial({color:'#25222b',roughness:.62,metalness:.04});dark.name='Ted charcoal headphones and embroidery';
 const cream=new THREE.MeshStandardMaterial({color:'#fff4e6',roughness:.4});cream.name='Ted eye highlights';
 const gold=new THREE.MeshPhysicalMaterial({color:'#d9ac47',metalness:.5,roughness:.4,emissive:'#8a5511',emissiveIntensity:.12});gold.name='Ted decorative gold';
 const eyes=[],arms=[],feet=[],batches=new Map();
 function mesh(name,geometry,material,parent=root) {
  const object=new THREE.Mesh(geometry,material);object.name=name;object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
 }
 function ball(name,geometry,material,position,scale,parent=root) {
  const object=mesh(name,geometry,material,parent);object.position.set(...position);object.scale.set(...scale);return object;
 }
 // Bake only fixed geometry. Every temporary and indexed source is disposed;
 // retained geometries/materials are owned by the adapter's existing release().
 function fixed(name,geometry,material,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0]) {
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...scale));
  geometry.applyMatrix4(matrix);
  let baked=geometry;
  if(geometry.index){baked=geometry.toNonIndexed();geometry.dispose();}
  baked.clearGroups();
  if(!batches.has(material))batches.set(material,[]);
  batches.get(material).push({name,geometry:baked});
 }
 function fixedBall(name,material,position,scale,segments=18,rings=12) {
  fixed(name,new THREE.SphereGeometry(1,segments,rings),material,position,scale);
 }
 function tube(points,radius,segments=32,sides=8) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,radius,sides,false);
 }

 const torso=mesh('Rounded stuffed body',new RoundedBoxGeometry(.82,1,.56,5,.26),cloth);
 torso.geometry.clearGroups();
 // A broad rounded rectangle, not the oval patch in the recovered 0.13.1.
 // Round before compressing depth so XY corners stay soft rather than boxy.
 const faceGeometry=new RoundedBoxGeometry(.64,.40,.24,4,.115);faceGeometry.scale(1,1,.5);faceGeometry.clearGroups();
 const face=mesh('Inset face',faceGeometry,skin);face.position.set(0,.13,.275);
 const limbGeometry=new THREE.SphereGeometry(1,18,12);
 for(const side of[-1,1]) {
  const foot=new THREE.Group();foot.name=side<0?'Left plush foot pivot':'Right plush foot pivot';
  foot.position.set(side*.15,-.445,.045);foot.userData.rest=foot.position.toArray();root.add(foot);
  ball('Tiny foot',limbGeometry,cloth,[0,-.055,.045],[.10,.065,.135],foot);feet.push(foot);
  const arm=new THREE.Group();arm.name=side<0?'Left plush arm pivot':'Right plush arm pivot';
  arm.position.set(side*.385,-.19,.10);arm.userData.rest=arm.position.toArray();root.add(arm);
  ball('Tiny plush hand',limbGeometry,cloth,[0,-.07,.025],[.078,.125,.095],arm);arms.push(arm);
 }
 const eyeGeometry=new THREE.SphereGeometry(1,16,10),faceY=.13,faceZ=.344;
 for(const side of[-1,1]) {
  eyes.push(ball('Small glossy eye',eyeGeometry,dark,[side*.145,faceY+.035,faceZ],[.027,.042,.022]));
  fixedBall('Eye glint',cream,[side*.145-.006,faceY+.050,faceZ+.019],[.006,.009,.004],12,8);
  fixedBall('Blush',cheek,[side*.225,faceY-.058,faceZ-.011],[.045,.024,.009],16,10);
 }
 fixed('Embroidered smile',tube([[-.045,faceY-.065,faceZ+.006],[0,faceY-.09,faceZ+.014],[.045,faceY-.065,faceZ+.006]],.009,20,6),dark);
 const bandPoints=[];
 for(let i=0;i<=24;i++){const angle=i*Math.PI/24;bandPoints.push([-.475*Math.cos(angle),.055+.52*Math.sin(angle),-.01]);}
 fixed('Padded headphone band',tube(bandPoints,.030),dark);
 for(const side of[-1,1]) {
  fixedBall('Headphone cushion',dark,[side*.445,.055,0],[.074,.155,.16]);
  fixedBall('Headphone shell',dark,[side*.505,.055,0],[.055,.13,.145]);
  fixed('Ted gold headphone trim',new THREE.TorusGeometry(.133,.009,8,32),gold,[side*.54,.055,0],[1,1,1],[0,Math.PI/2,0]);
 }
 fixed('Ted decorative halo · not activity',new THREE.TorusGeometry(.48,.008,6,48),gold,[0,-.557,0],[1,.7,1],[Math.PI/2,0,0]);
 for(const [material,parts] of batches) {
  const geometry=mergeGeometries(parts.map(part=>part.geometry),false);
  parts.forEach(part=>part.geometry.dispose());
  if(!geometry)throw new Error('Unable to merge Ted fixed geometry');
  geometry.clearGroups();
  const batch=mesh(`Ted fixed ${material.name}`,geometry,material);
  batch.userData.fixedParts=parts.map(part=>part.name);
 }
 root.userData.plushRig={eyes,arms,feet};
 return root;
}
