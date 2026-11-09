import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTedReconstructed} from '../src/avatars/ted-reconstructed.js';
import {animatePlushModel} from '../src/avatars/plush-models.js';

const clips=['idle','walk','work','rest','read','wave'];
function resources(root) {
 const geometries=new Set(),materials=new Set();
 root.traverse(object=>{if(object.isMesh){geometries.add(object.geometry);materials.add(object.material);}});
 return {geometries,materials};
}
function release(root) {
 const {geometries,materials}=resources(root);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.removeFromParent();
}
function officeModel() {
 const host=new THREE.Group(),visual=new THREE.Group(),frame=new THREE.Group(),offset=new THREE.Group(),body=createTedReconstructed();
 host.add(visual);visual.add(frame);frame.add(offset);offset.add(body);
 const box=new THREE.Box3().setFromObject(body),size=box.getSize(new THREE.Vector3());
 frame.scale.setScalar(1.35*1.15/size.y);offset.position.set(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2);
 host.position.set(4,2,-6);host.rotation.y=.31;
 return {host,visual,frame,body};
}
function radialExtent(visual) {
 visual.updateWorldMatrix(true,true);
 const inverse=new THREE.Matrix4().copy(visual.matrixWorld).invert(),point=new THREE.Vector3();
 let maximum=0;
 visual.traverse(object=>{
  if(!object.isMesh)return;
  const matrix=new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld),positions=object.geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
   point.fromBufferAttribute(positions,i).applyMatrix4(matrix);
   assert.ok(point.toArray().every(Number.isFinite));
   maximum=Math.max(maximum,Math.hypot(point.x,point.z));
  }
 });
 return maximum;
}
function matrices(root) {
 root.updateMatrixWorld(true);const values=[];root.traverse(object=>values.push(...object.matrixWorld.elements));return values;
}

test('reconstructed Ted preserves option 03, rig API and local low-poly geometry',()=>{
 const body=createTedReconstructed({modelId:'ted',color:'#f9d9b2'}),rig=body.userData.plushRig;
 assert.equal(body.userData.plushProvenance.reconstruction,true);
 assert.equal(body.userData.plushProvenance.revision,'ted-reconstructed-v1');
 assert.equal(body.userData.plushProvenance.implementation,'local-procedural-3d');
 assert.equal(body.scale.x,1);
 assert.equal(rig.eyes.length,2);assert.equal(rig.arms.length,2);assert.equal(rig.feet.length,2);
 const torso=body.getObjectByName('Rounded stuffed body'),face=body.getObjectByName('Inset face');
 assert.ok(torso?.isMesh&&face?.isMesh);
 const faceSize=new THREE.Box3().setFromObject(face).getSize(new THREE.Vector3());
 assert.ok(faceSize.x>=.63&&faceSize.y>=.39&&faceSize.x/faceSize.y>1.5);
 assert.equal(face.material.color.getHexString(),'ffdbbf');
 let triangles=0,meshes=0;const fixed=[];
 body.traverse(object=>{
  if(!object.isMesh)return;
  meshes++;triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;
  assert.equal(object.material.map,null);assert.equal(Array.isArray(object.material),false);
  assert.equal(object.geometry.groups.length,0); // One draw per mesh, not per source piece.
  fixed.push(...object.userData.fixedParts??[]);
 });
 assert.ok(triangles<=10000,`${triangles} triangles`);assert.ok(meshes<=13,`${meshes} meshes`);
 assert.ok(fixed.includes('Ted decorative halo · not activity'));
 assert.equal(fixed.filter(name=>name==='Ted gold headphone trim').length,2);
 const headphones=body.children.find(object=>object.userData.fixedParts?.includes('Headphone shell'));
 assert.equal(headphones.material.color.getHexString(),'25222b');
 release(body);
});

test('every Ted pose stays finite and inside .85 radial office footprint without moving host',()=>{
 const {host,visual,body}=officeModel();
 const localBox=new THREE.Box3().setFromObject(body),normalHeight=localBox.getSize(new THREE.Vector3()).y*visual.children[0].scale.y;
 assert.ok(Math.abs(normalHeight-1.5525)<1e-6);
 for(const clip of clips)for(const seated of[false,true])for(const time of[0,.15,.45,1,9.7,100]) {
  animatePlushModel(body,{time,clip,seated,phase:.7});
  assert.ok(matrices(host).every(Number.isFinite));
  assert.ok(radialExtent(visual)<.85,`${clip}/${seated}/${time} radius ${radialExtent(visual)}`);
  assert.deepEqual(host.position.toArray(),[4,2,-6]);assert.equal(host.rotation.y,.31);
  assert.deepEqual(body.position.toArray(),[0,0,0]);
 }
 for(const time of[NaN,Infinity,-Infinity]){animatePlushModel(body,{time,clip:'walk',phase:NaN});assert.ok(matrices(host).every(Number.isFinite));}
 release(body);
});

test('Ted reduced motion retains readable poses and removes all time-dependent transforms',()=>{
 const {host,body}=officeModel();
 for(const clip of clips)for(const seated of[false,true]) {
  animatePlushModel(body,{time:1,clip,seated});
  animatePlushModel(body,{time:2,clip,seated,phase:.7,reducedMotion:true});const frozen=matrices(host);
  animatePlushModel(body,{time:200,clip,seated,phase:9.7,reducedMotion:true});assert.deepEqual(matrices(host),frozen);
  if(seated)for(const foot of body.userData.plushRig.feet){assert.equal(foot.rotation.x,-.85);assert.ok(foot.position.z>=.24);}
  if(clip==='work'||clip==='read')assert.ok(body.userData.plushRig.arms[0].rotation.x<-.9);
 }
 animatePlushModel(body,{time:1,clip:'walk'});
 animatePlushModel(body,{time:200,clip:'walk',reducedMotion:true});assert.equal(body.userData.plushRig.feet[0].rotation.x,0);
 animatePlushModel(body,{time:2,clip:null});const idle=matrices(host);animatePlushModel(body,{time:200,clip:null});assert.deepEqual(matrices(host),idle);
 release(body);
});

test('Ted torso contact supports both office seat heights independently of feet and halo',()=>{
 const {host,visual,body}=officeModel(),torso=body.getObjectByName('Rounded stuffed body');
 for(const clip of['work','read','rest'])for(const seatTop of[.835,.935]) {
  animatePlushModel(body,{time:1,clip,seated:true,reducedMotion:true});
  visual.updateWorldMatrix(true,true);torso.geometry.computeBoundingBox();
  const localMatrix=new THREE.Matrix4().copy(visual.matrixWorld).invert().multiply(torso.matrixWorld);
  const bottom=torso.geometry.boundingBox.clone().applyMatrix4(localMatrix).min.y;
  visual.position.y=seatTop-host.position.y-bottom;host.updateMatrixWorld(true);
  assert.ok(Math.abs(new THREE.Box3().setFromObject(torso).min.y-seatTop)<1e-7);
  assert.ok(matrices(host).every(Number.isFinite));
  for(const foot of body.userData.plushRig.feet){assert.equal(foot.rotation.x,-.85);assert.ok(foot.position.z>=.24);}
 }
 release(body);
});

test('Ted temporary geometry is disposed and all retained resources can be released once',()=>{
 const original=THREE.BufferGeometry.prototype.dispose,disposed=new Set();
 THREE.BufferGeometry.prototype.dispose=function(){assert.ok(!disposed.has(this),'geometry double disposal');disposed.add(this);return original.call(this);};
 let body;
 try {
  body=createTedReconstructed();
  const {geometries,materials}=resources(body);assert.ok(disposed.size>15);
  for(const geometry of geometries)assert.ok(!disposed.has(geometry),'retained disposed geometry');
  const events=new Map();for(const material of materials)material.addEventListener('dispose',()=>events.set(material,(events.get(material)??0)+1));
  release(body);
  for(const geometry of geometries)assert.ok(disposed.has(geometry));
  for(const material of materials)assert.equal(events.get(material),1);
 } finally {THREE.BufferGeometry.prototype.dispose=original;}
});
