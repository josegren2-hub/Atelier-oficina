/** Local visual assets only. No activity inference, state fetch, timers, or host transforms. */
import * as THREE from 'three';
import {createPlushModel, animatePlushModel} from './avatars/plush-models.js';
export const PLUSH_ROSTER=Object.freeze({
 ted:{template:3,color:'#f9d9b2',trim:'#25222b',hero:true},
 tommy:{template:9,color:'#2779e7'},charly:{template:13,color:'#ffad27'},rodrigo:{template:2,color:'#19b9f0'},
 rulo:{template:12,color:'#63cdf5'},joss:{template:10,color:'#ffe4b8',trim:'#74213d'},luca:{template:14,color:'#9ce3bd'},
 mateo:{template:4,color:'#df378b'},naim:{template:11,color:'#c86d98'},tadeo:{template:14,color:'#f77eb1'},dany:{template:15,color:'#ffc1d9',accessory:'beret',sleeping:true},
 luna:{template:5,color:'#bba0ef'},valery:{template:8,color:'#ffa18c'},emiliano:{template:7,color:'#37be83',trim:'#fff0d8'},julian:{template:1,color:'#ffca32',accessory:'glasses',serious:true},ines:{template:6,color:'#bc81ed'}
});

export const AVATAR_MAP = Object.freeze({ted:'ted',ceo:'tommy',apps:'charly',libro:'rodrigo',rulo:'rulo',director:'joss',luca:'luca',mateo:'mateo',tadeo:'tadeo','tr-editor':'naim','tr-cm':'dany',luna:'luna',vale:'valery',emiliano:'emiliano',julian:'julian',ines:'ines'});
export const DEMO_CLIPS = Object.freeze(['idle','wave','work']);
function release(root) {
 const geometries=new Set(),materials=new Set();
 root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))materials.add(m);}});
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.removeFromParent();
}
export function createAvatarModels({onLoaded=()=>{},visualHeight=.9}={}) {
 const records=new Map();
 const stats={total:16,loaded:0,pending:0,failed:0,errors:[],source:'local',activity:'disconnected'};
 function notify(record,error=null){onLoaded({id:record.bot.id,modelId:record.modelId,loaded:!error,error,stats});}
 function install(record,body,clips=[]) {
  if(records.get(record.parent)!==record){release(body);return;}
  const frame=new THREE.Group(),offset=new THREE.Group();frame.name=`visual-${record.bot.id}`;frame.add(offset);offset.add(body);
  body.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(body),size=box.getSize(new THREE.Vector3());
  frame.scale.setScalar(visualHeight*(record.modelId==='ted'?1.15:1)/Math.max(size.y,.001));offset.position.set(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2);
  frame.userData={bot:record.bot,botId:record.bot.id,avatarId:record.modelId};
  body.traverse(o=>{o.userData.bot=record.bot;o.userData.botId=record.bot.id;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  // The caller supplies a dedicated visual group. Never clear the bot root.
  record.parent.clear();record.parent.add(frame);
  Object.assign(record,{frame,body,clips,mixer:clips.length?new THREE.AnimationMixer(body):null,active:null,ready:true});
  stats.loaded++;stats.pending--;notify(record);
 }
 function attach(bot,parentGroup) {
  if(!bot||!AVATAR_MAP[bot.id])throw new RangeError('Unknown avatar ID');
  if(!parentGroup?.isGroup)throw new TypeError('Supply a dedicated THREE.Group for the visual');
  const old=records.get(parentGroup);if(old){if(old.ready){old.mixer?.stopAllAction();release(old.frame);stats.loaded--;}else stats.pending--;}
  const record={bot,parent:parentGroup,modelId:AVATAR_MAP[bot.id],ready:false};records.set(parentGroup,record);stats.pending++;
  // Metadata on visual group complements, never replaces, host-root metadata.
  parentGroup.userData.bot=bot;parentGroup.userData.botId=bot.id;
  install(record,createPlushModel({...PLUSH_ROSTER[record.modelId],modelId:record.modelId}));
  return Promise.resolve(parentGroup);
 }
 function update(time=0,demo=false,reducedMotion=false) {
  const t=Number.isFinite(time)?time:0;
  const clip=demo===true?'idle':DEMO_CLIPS.includes(demo)?demo:null;
  for(const record of records.values()) {
   if(!record.ready)continue;
   animatePlushModel(record.body,{time:t,clip,reducedMotion});
  }
 }
 function dispose(){for(const r of records.values()){r.mixer?.stopAllAction();if(r.frame)release(r.frame);}records.clear();stats.loaded=0;stats.pending=0;}
 return {attach,update,stats,dispose};
}
