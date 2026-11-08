import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAvatarModels, AVATAR_MAP, ACTIVITY_CLIPS} from '../src/avatar-models.js';
const bodyOf=visual=>visual.children[0].children[0].children[0];

test('per-bot activities do not leak to peers, accept before attachment and clear deterministically',async()=>{
 const models=createAvatarModels(),a=new THREE.Group(),b=new THREE.Group();
 models.setActivity('ted',{clip:'walk',phase:.2});await models.attach({id:'ted'},a);await models.attach({id:'luna'},b);
 models.update(1);const ar=bodyOf(a).userData.plushRig,br=bodyOf(b).userData.plushRig;
 assert.notEqual(ar.feet[0].rotation.x,0);assert.equal(br.feet[0].rotation.x,0);
 models.setActivity('ted',{clip:'work',seated:true});models.update(1);
 assert.equal(ar.feet[0].rotation.x,-.85);assert.ok(ar.arms[0].rotation.x<-.9);
 models.setActivity('ted',null);models.update(1);assert.equal(ar.feet[0].rotation.x,0);assert.equal(ar.arms[0].rotation.x,0);
 models.setActivity('luna',{clip:'wave'});models.clearActivities();models.update(2);assert.equal(br.arms[0].rotation.z,0);
 assert.throws(()=>models.setActivity('invalid',{clip:'idle'}),RangeError);
 assert.throws(()=>models.setActivity('ted',{clip:'invented'}),RangeError);
 assert.throws(()=>models.setActivity('ted',{clip:'walk',phase:NaN}),TypeError);models.dispose();
});

test('all 16 plush rigs show distinct poses, freeze reduced motion, retain footprint and host',async()=>{
 const models=createAvatarModels({visualHeight:1.35}),entries=[];
 for(const id of Object.keys(AVATAR_MAP)){
  const host=new THREE.Group(),visual=new THREE.Group();host.add(visual);host.position.set(4,2,-6);host.rotation.y=.31;await models.attach({id},visual);entries.push({id,host,visual});
 }
 for(const clip of ACTIVITY_CLIPS)for(const seated of [false,true]){
  for(const {id} of entries)models.setActivity(id,{clip,seated,phase:.7});
  for(const time of [0,.15,.45,1,100]){
   models.update(time,false,false);
   for(const {id,host,visual} of entries){
    const body=bodyOf(visual),size=new THREE.Box3().setFromObject(visual).getSize(new THREE.Vector3());
    assert.ok(size.x<=1.7,`${id}/${clip} width ${size.x}`);assert.ok(size.z<=1.7,`${id}/${clip} depth ${size.z}`);
    assert.deepEqual(body.position.toArray(),[0,0,0]);assert.deepEqual(host.position.toArray(),[4,2,-6]);assert.equal(host.rotation.y,.31);
    assert.equal(body.userData.plushRig.arms.length,2);assert.equal(body.userData.plushRig.feet.length,2);
   }
  }
  models.update(2,false,true);const frozen=entries.map(({visual})=>visual.toJSON());models.update(200,false,true);assert.deepEqual(entries.map(({visual})=>visual.toJSON()),frozen);
  if(seated)assert.equal(bodyOf(entries[0].visual).userData.plushRig.feet[0].rotation.x,-.85);
 }
 // Reduced-motion walking does not retain gait from a preceding active frame.
 models.setActivity('ted',{clip:'walk'});models.update(12,false,true);assert.equal(bodyOf(entries[0].visual).userData.plushRig.feet[0].rotation.x,0);
 models.clearActivities();models.update(12);const baseline=entries.map(({visual})=>visual.toJSON());models.update(200);assert.deepEqual(entries.map(({visual})=>visual.toJSON()),baseline);models.dispose();
});

test('seated torso support aligns with cushion instead of sinking into chair; feet project forward',async()=>{
 const models=createAvatarModels({visualHeight:1.35});
 assert.equal(models.getSeatSupport('ted'),null);
 for(const id of Object.keys(AVATAR_MAP)){
  const host=new THREE.Group(),visual=new THREE.Group();host.add(visual);host.position.set(2,.3,-4);host.rotation.y=Math.PI;
  await models.attach({id},visual);models.setActivity(id,{clip:'work',seated:true});models.update(1,false,true);
  const support=models.getSeatSupport(id);assert.ok(Number.isFinite(support.bottomY));
  for(const seatTop of [.835,.935]){
   visual.position.y=seatTop-host.position.y-support.bottomY;
   const unchanged=models.getSeatSupport(id);assert.ok(Math.abs(unchanged.bottomY-support.bottomY)<1e-8);
   assert.ok(Math.abs(host.position.y+visual.position.y+unchanged.bottomY-seatTop)<1e-8);
   const body=bodyOf(visual),torso=body.getObjectByName('Rounded stuffed body')??body.getObjectByName('Soft extruded silhouette')??body.getObjectByName('Round stuffed body');
   host.updateMatrixWorld(true);const worldBounds=new THREE.Box3().setFromObject(torso);assert.ok(Math.abs(worldBounds.min.y-seatTop)<1e-7,`${id} torso support ${worldBounds.min.y}`);
   for(const foot of body.userData.plushRig.feet){assert.ok(foot.position.z>=.24);assert.equal(foot.rotation.x,-.85);}
   assert.deepEqual(host.position.toArray(),[2,.3,-4]);
  }
 }
 models.dispose();
});
