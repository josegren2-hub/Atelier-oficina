import test from 'node:test';
import assert from 'node:assert/strict';
import {createMovement,segmentClear,planRoute,BODY_RADIUS,PERSONAL_SPACE,pointSegmentDistance} from '../src/movement.js';
const obstacle={minX:-1,maxX:1,minZ:-2,maxZ:2};
test('A* routes around expanded walls; swept check cannot tunnel',()=>{
 assert.equal(segmentClear([-4,0],[4,0],[obstacle]),false);
 const route=planRoute([-4,0],[4,0],[obstacle]);assert.ok(route?.length>1);
 let previous=[-4,0];for(const p of route){assert.ok(segmentClear(previous,p,[obstacle]));previous=p;}
 assert.equal(segmentClear([NaN,0],[0,0],[]),false);
});
test('seat contact exempts only the owned chair, never unrelated furniture',()=>{
 const chair={minX:-.35,maxX:.35,minZ:-.35,maxZ:.35,seat:'mine'};
 assert.equal(segmentClear([0,0],[0,0],[chair]),false);
 assert.equal(segmentClear([0,0],[0,0],[chair],BODY_RADIUS,'mine'),true);
 assert.equal(segmentClear([0,0],[0,0],[chair,obstacle],BODY_RADIUS,'mine'),false);
});
test('invalid dt, hidden, reduced motion, disconnected and huge dt are safe',()=>{
 const m=createMovement();m.add({id:'a',floor:0,position:[0,3],obstacles:[],seats:[{id:'a-seat',position:[0,0],angle:0}]});m.setDemo(true);
 for(const dt of [-1,0,NaN,Infinity])m.update(dt);
 m.update(1,{paused:true});m.update(1,{reducedMotion:true});assert.deepEqual(m.getActivity('a').position,[0,3]);
 m.update(5000);assert.ok(Math.abs(m.getActivity('a').position[1]-3)<=.043);
 m.setUnknown();const frozen=m.getActivity('a');for(let i=0;i<100;i++)m.update(.05);assert.deepEqual(m.getActivity('a'),frozen);assert.equal(frozen.label,'Sin señal');
});
test('opposing routes yield instead of passing through another avatar',()=>{
 const m=createMovement(),seats=[{id:'s1',position:[3,0],angle:0},{id:'s2',position:[-3,0],angle:0}];
 m.add({id:'a',floor:0,position:[-3,0],obstacles:[],seats,assignedSeat:'s1'});m.add({id:'b',floor:0,position:[3,0],obstacles:[],seats,assignedSeat:'s2'});m.setDemo(true);
 for(let i=0;i<500;i++){const prev=m.getStats().agents;m.update(.05);const [a,b]=m.getStats().agents;assert.ok(pointSegmentDistance([0,0],[prev[0].position[0]-prev[1].position[0],0],[a.position[0]-b.position[0],0])>=PERSONAL_SPACE-1e-8);}
 assert.ok(m.getStats().agents.some(a=>a.blocked>0));
});
