import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPlushModel,animatePlushModel,PLUSH_TEMPLATES} from '../src/avatars/plush-models.js';
import {PLUSH_ROSTER,AVATAR_MAP,ACTIVITY_CLIPS,createAvatarModels} from '../src/avatar-models.js';
import {torsoOf,surfaceMetrics,glassesContact,glintOcclusion,vertexBounds} from '../qa/reconstruction-metrics.mjs';
const entries=Object.entries(PLUSH_ROSTER).filter(([id])=>id!=='ted');
const make=(id,spec)=>createPlushModel({...spec,modelId:id});

test('reconstructed twelve domed torsos are closed, oriented manifolds with finite unit normals and no collapsed tips',()=>{
 let domed=0,stars=0;
 for(const [id,spec]of entries){const shape=PLUSH_TEMPLATES[spec.template-1].shape;if(['sphere','cube','capsule'].includes(shape))continue;
  const torso=torsoOf(make(id,spec)),m=surfaceMetrics(torso);domed++;if(shape==='star')stars++;
  assert.equal(m.triangles,shape==='star'?13800:5888,`${id} triangle budget`);
  assert.equal(m.nonManifoldEdges,0,`${id} closed surface`);assert.equal(m.misorientedEdges,0,`${id} consistent winding`);assert.equal(m.euler,2,`${id} genus-zero surface`);
  assert.equal(m.degenerate,0,`${id} no collapsed tips or poles`);assert.equal(m.invertedNormals,0,`${id} face/vertex normal agreement`);
  assert.ok(m.minArea>1e-12,`${id} positive triangle area`);assert.ok(m.signedVolume>0,`${id} outward volume`);
  assert.ok(m.minNormal>.999&&m.maxNormal<1.001,`${id} normalized finite normals`);
  const p=torso.geometry.attributes.position;for(let i=0;i<p.array.length;i++)assert.ok(Number.isFinite(p.array[i]),`${id} finite coordinate`);
 }
 assert.equal(domed,12);assert.equal(stars,3);
});

test('reconstructed glasses use contact with real torso surface; Mateo glints stay behind lenses at 0 and ±28 degrees',()=>{
 for(const id of ['charly','naim','julian','mateo']){const body=make(id,PLUSH_ROSTER[id]),rows=glassesContact(body);assert.ok(rows.length>=5);for(const row of rows){assert.ok(row.samples>0,`${id}/${row.name} intersects actual torso projection`);assert.equal(row.misses,0,`${id}/${row.name} no raycast misses`);const [min,max]=id==='mateo'&&row.name==='Heart sunglasses'?[.0172,.0376]:[.0058,.037];assert.ok(row.minGap>=min-1e-5,`${id}/${row.name} minimum gap ${row.minGap}`);assert.ok(row.maxGap<=max+1e-5,`${id}/${row.name} maximum gap ${row.maxGap}`);}}
 for(const row of glassesContact(make('mateo',PLUSH_ROSTER.mateo),{interiors:true})){assert.equal(row.misses,0);assert.ok(row.minGap>=(row.name==='Heart sunglasses'?.006:.0058)-1e-5,`${row.name} interior gap ${row.minGap}`);assert.ok(row.maxGap<=(row.name==='Heart sunglasses'?.04:.037)+1e-5,`${row.name} interior gap ${row.maxGap}`);}
 const rows=glintOcclusion(make('mateo',PLUSH_ROSTER.mateo));assert.equal(rows.length,3);for(const row of rows){assert.ok(row.samples>100,`real glint vertices at ${row.degrees}`);assert.equal(row.visible,0,`Mateo visible glint vertices at ${row.degrees} degrees`);}
});

test('reconstructed identities keep four pinks, Julian tie and Naim black eyewear',()=>{
 assert.equal(new Set(['mateo','naim','tadeo','dany'].map(id=>PLUSH_ROSTER[id].color)).size,4);
 const julian=make('julian',PLUSH_ROSTER.julian);assert.ok(julian.getObjectByName('Julian formal tie'));assert.equal(julian.getObjectByName('Soft bow wing'),undefined);
 const naim=make('naim',PLUSH_ROSTER.naim),glasses=naim.getObjectByName('Round glasses');assert.ok(glasses);assert.equal(glasses.material.color.getHexString(),'25222b');
});

test('reconstructed rigs retain host, seat support and radius measured on every vertex across sampled clips and postures',async()=>{
 const models=createAvatarModels({visualHeight:1.35}),records=[];
 for(const [id,modelId]of Object.entries(AVATAR_MAP)){if(modelId==='ted')continue;const host=new THREE.Group(),visual=new THREE.Group();host.position.set(3,2,-4);host.rotation.y=.71;host.userData.marker=id;host.add(visual);await models.attach({id},visual);records.push({id,host,visual,body:visual.children[0].children[0].children[0]});}
 for(const clip of ACTIVITY_CLIPS)for(const seated of [false,true])for(const reducedMotion of [false,true]){
  for(const {id}of records)models.setActivity(id,{clip,seated,phase:.7});
  for(const time of [0,.025,.1,.15,.25,.45,.7,1,1.5,2,Math.PI,5.2,12,40,100,999]){
   models.update(time,false,reducedMotion);
   for(const {id,host,visual,body}of records){const bounds=vertexBounds(visual);assert.ok(bounds.radius<=.85,`${id}/${clip}/${seated}/${time} radius ${bounds.radius}`);assert.ok(bounds.width<=1.7&&bounds.depth<=1.7);
    assert.deepEqual(host.position.toArray(),[3,2,-4]);assert.equal(host.rotation.y,.71);assert.equal(host.userData.marker,id);assert.deepEqual(body.position.toArray(),[0,0,0]);
    assert.equal(body.userData.plushRig.arms.length,2);assert.equal(body.userData.plushRig.feet.length,2);
    body.traverse(o=>{if(o.isMesh)assert.equal(o.userData.botId,id,`${id} picking metadata`);});
    const support=models.getSeatSupport(id);assert.ok(Number.isFinite(support.bottomY)&&support.topY>support.bottomY);
    if(seated)for(const foot of body.userData.plushRig.feet){assert.equal(foot.rotation.x,-.85);assert.ok(foot.position.z>=.24);}
   }
  }
 }
 models.dispose();assert.equal(models.stats.loaded,0);
});


test('reconstructed wave adds .02 only to the left arm of triangles; cloth shader uses derivative attenuation',()=>{
 for(const [id,spec]of entries){const body=make(id,spec),shape=body.userData.plushProvenance.shape,arms=body.userData.plushRig.arms,initial=arms.map(a=>a.position.x);animatePlushModel(body,{clip:'wave',time:1});assert.ok(Math.abs(arms[0].position.x-initial[0]-(shape==='triangle'?.02:0))<1e-10,`${id} left wave`);assert.equal(arms[1].position.x,initial[1],`${id} right arm`);
  const material=torsoOf(body).material,shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <roughnessmap_fragment>'};material.onBeforeCompile(shader);assert.equal(material.customProgramCacheKey(),'reconstructed-plush-antialias-cloth-v1');assert.match(shader.fragmentShader,/fwidth\(vPlushLocal\)/);assert.match(shader.fragmentShader,/smoothstep/);assert.equal(material.sheen,.45);
 }
});
