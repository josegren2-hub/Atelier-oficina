import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AVATAR_MAP, PLUSH_ROSTER, createAvatarModels} from '../src/avatar-models.js';
import {PLUSH_TEMPLATES, createPlushModel} from '../src/avatars/plush-models.js';

test('all 16 approved shape templates are local volumetric meshes',()=>{
 assert.equal(PLUSH_TEMPLATES.length,16);
 for(const config of PLUSH_TEMPLATES){
  const body=createPlushModel(config);let meshes=0;body.traverse(o=>{if(o.isMesh){meshes++;assert.ok(o.geometry.attributes.position.count>0);assert.equal(o.material.map,null);}});
  const size=new THREE.Box3().setFromObject(body).getSize(new THREE.Vector3());
  assert.ok(meshes>=4);assert.ok(size.z>.4);assert.ok(size.x>.5);assert.ok(size.y>.5);assert.equal(body.userData.plushProvenance.implementation,'local-procedural-3d');
 }
});
test('unchanged 16 identities use distinct approved character configurations',()=>{
 assert.deepEqual(Object.keys(PLUSH_ROSTER).sort(),Object.values(AVATAR_MAP).sort());
 assert.equal(new Set(['mateo','naim','tadeo','dany'].map(id=>PLUSH_ROSTER[id].color)).size,4);
 assert.equal(PLUSH_ROSTER.julian.serious,true);assert.equal(PLUSH_ROSTER.julian.accessory,'glasses');
 const julian=createPlushModel({...PLUSH_ROSTER.julian,modelId:'julian'});assert.ok(julian.getObjectByName('Julian formal tie'));assert.equal(julian.getObjectByName('Soft bow wing'),undefined);
 assert.equal(PLUSH_ROSTER.ted.hero,true);
});
test('16 actual office models fit footprint, maintain host, freeze demos and release',async()=>{
 const models=createAvatarModels({visualHeight:1.35}),hosts=[];
 for(const id of Object.keys(AVATAR_MAP)){
  const host=new THREE.Group(),visual=new THREE.Group();host.position.set(2,0,-3);host.rotation.y=.7;host.userData.keep=id;host.add(visual);hosts.push({host,visual,id});
  await models.attach({id},visual);const size=new THREE.Box3().setFromObject(visual).getSize(new THREE.Vector3());
  assert.ok(size.x<=1.7,`${id} width ${size.x}`);assert.ok(size.z<=1.7,`${id} depth ${size.z}`);assert.ok(Math.abs(size.y-(id==='ted'?1.5525:1.35))<.001);
 }
 assert.equal(models.stats.loaded,16);assert.equal(models.stats.pending,0);assert.equal(models.stats.failed,0);
 for(const clip of ['idle','wave','work'])for(const time of [0,1,40,999])models.update(time,clip);
 for(const {host,visual,id} of hosts){assert.deepEqual(host.position.toArray(),[2,0,-3]);assert.equal(host.rotation.y,.7);assert.equal(host.userData.keep,id);const body=visual.children[0].children[0].children[0];assert.deepEqual(body.position.toArray(),[0,0,0]);}
 models.update(12,'wave',true);const frozen=hosts.map(({visual})=>visual.toJSON());models.update(25,'wave',true);assert.deepEqual(hosts.map(({visual})=>visual.toJSON()),frozen);
 models.update(12,false);const staticModels=hosts.map(({visual})=>visual.toJSON());models.update(25,false);assert.deepEqual(hosts.map(({visual})=>visual.toJSON()),staticModels);
 models.dispose();assert.equal(models.stats.loaded,0);for(const {visual} of hosts)assert.equal(visual.children.length,0);
});
