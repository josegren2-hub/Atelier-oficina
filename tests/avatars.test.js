import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AVATAR_MAP,DEMO_CLIPS,createAvatarModels} from '../src/avatar-models.js';
import {bots} from '../src/data.js';
const base=new URL('../public/assets/avatars/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',base)));
test('16 host IDs map bijectively onto the unchanged source manifest',()=>{
 assert.equal(manifest.characters,16);assert.equal(manifest.models.length,16);assert.equal(Object.keys(AVATAR_MAP).length,16);
 assert.deepEqual(Object.keys(AVATAR_MAP).sort(),bots.map(b=>b.id).sort());assert.deepEqual(Object.values(AVATAR_MAP).sort(),manifest.models.map(m=>m.id).sort());
 for(const bot of bots)assert.equal(manifest.models.find(m=>m.id===AVATAR_MAP[bot.id]).nombre,bot.name);
});
for(const model of manifest.models.filter(m=>m.glb))test(`${model.id}: GLB integrity, embedded assets, six real clips, stable height`,async()=>{
 const bytes=fs.readFileSync(new URL(`${model.id}.glb`,base));assert.equal(bytes.length,model.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),model.sha256);
 assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));assert.ok((json.buffers??[]).every(b=>!b.uri));assert.ok((json.images??[]).every(i=>!i.uri));assert.equal(json.animations.length,6);for(const clip of DEMO_CLIPS)assert.ok(json.animations.some(a=>a.name===clip));
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const size=new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());assert.ok(Math.abs(size.y-.6)<.025);gltf.scene.scale.multiplyScalar(.9/size.y);assert.ok(Math.abs(new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3()).y-.9)<.001);const mixer=new THREE.AnimationMixer(gltf.scene);
 for(const clip of gltf.animations){mixer.stopAllAction();mixer.clipAction(clip).play();mixer.setTime(.8);gltf.scene.traverse(o=>assert.ok([...o.position,...o.quaternion,...o.scale].every(Number.isFinite)));}mixer.stopAllAction();
});
test('Ted module stays byte-identical; attachment preserves host and static/reduced motion',async()=>{
 const bytes=fs.readFileSync(new URL('../src/avatars/ted-tierno.js',import.meta.url));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),manifest.models.find(m=>m.id==='ted').sha256);
 const root=new THREE.Group(),visual=new THREE.Group();root.position.set(1,2,3);root.rotation.y=.4;root.userData.keep='metadata';root.add(visual);const models=createAvatarModels();await models.attach(bots.find(b=>b.id==='ted'),visual);
 assert.equal(models.stats.loaded,1);assert.ok(Math.abs(new THREE.Box3().setFromObject(visual).getSize(new THREE.Vector3()).y-1.035)<.001);
 models.update(1,'wave',false);models.update(9,false,false);visual.updateMatrixWorld(true);const a=visual.toJSON();models.update(20,false,false);assert.deepEqual(visual.toJSON(),a);
 models.update(2,'wave',true);visual.updateMatrixWorld(true);const frozen=visual.toJSON();models.update(20,'wave',true);assert.deepEqual(visual.toJSON(),frozen);
 assert.deepEqual(root.position.toArray(),[1,2,3]);assert.equal(root.rotation.y,.4);assert.equal(root.userData.keep,'metadata');models.dispose();assert.equal(visual.children.length,0);
});
test('Escala de oficina independiente conserva el modelo original y la galería',async()=>{
 const visual=new THREE.Group(),models=createAvatarModels({visualHeight:1.35});
 await models.attach(bots.find(b=>b.id==='ted'),visual);
 assert.ok(Math.abs(new THREE.Box3().setFromObject(visual).getSize(new THREE.Vector3()).y-1.5525)<.001);
 models.dispose();
});
