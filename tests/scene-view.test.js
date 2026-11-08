import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {floors} from '../src/data.js';
import {STACK_PITCH,floorPose,viewVolumes,findAvatarSpot,LIGHTING,visualStatus} from '../src/view-layout.js';

test('stacked floors retain clearance without the oversized previous gap',()=>{
 assert.equal(STACK_PITCH,9);
 for(let i=1;i<floors.length;i++)assert.equal(floorPose(i,'stacked').y-floorPose(i-1,'stacked').y,9);
 assert.equal(viewVolumes('stacked').at(-1)[1][1],(floors.length-1)*9+4.5);
 assert.equal(floorPose(3,'stacked',true).y,13.799999999999999);
});
test('placement rejects furniture, walls, floor edges and other avatars',()=>{
 const obstacles=[{minX:-2,maxX:2,minZ:-2,maxZ:2},{minX:4,maxX:4.1,minZ:-8,maxZ:8}];
 const occupied=[];
 for(const preferred of [[0,0],[0,0],[4,3],[30,30]]){
  const spot=findAvatarSpot(preferred,obstacles,occupied);assert.ok(spot);
  const [x,z]=spot;
  assert.ok(x>=-10.65&&x<=7.85&&z>=-7.45&&z<=7.55);
  for(const b of obstacles)assert.ok(x<b.minX-.85||x>b.maxX+.85||z<b.minZ-.85||z>b.maxZ+.85);
  for(const p of occupied)assert.ok(Math.hypot(x-p[0],z-p[1])>=1.85);
  occupied.push(spot);
 }
 assert.deepEqual(findAvatarSpot([-6,4],obstacles),[-6,4]);
 assert.equal(findAvatarSpot([0,0],[{minX:-100,maxX:100,minZ:-100,maxZ:100}]),null);
});
test('night reduces daylight while retaining interior lights and a distinct sky',()=>{
 assert.ok(LIGHTING.night.sun<LIGHTING.day.sun*.2);
 assert.ok(LIGHTING.night.ambient<LIGHTING.day.ambient);
 assert.ok(LIGHTING.night.environment<LIGHTING.day.environment);
 assert.ok(LIGHTING.night.interior>LIGHTING.day.interior);
 assert.notEqual(LIGHTING.night.background,LIGHTING.day.background);
});
test('visual states need a source and unknown is the default',()=>{
 assert.equal(visualStatus(), 'unknown');
 assert.equal(visualStatus({status:'working'}), 'unknown');
 assert.equal(visualStatus({status:'working'},{mode:'demo'}), 'working');
 assert.equal(visualStatus({status:'idle',lastSignal:'2026-11-08T12:00:00Z'},{now:Date.parse('2026-11-08T12:01:00Z')}), 'idle');
 assert.equal(visualStatus({status:'invented'},{mode:'demo'}), 'unknown');
 assert.equal(visualStatus({status:'working',lastSignal:'2000-01-01T00:00:00Z'}), 'unknown');
 assert.equal(visualStatus({status:'working',lastSignal:new Date().toISOString()},{mode:'disconnected'}), 'unknown');
});
test('scene retains agenda targets outside batching and hides perimeter in isolated view',()=>{
 const scene=readFileSync(new URL('../src/scene.js',import.meta.url),'utf8');
 assert.match(scene,/onAssets=\(\)=>\{\},onAgenda=\(\)=>\{\}/);
 assert.match(scene,/panel.userData.agenda=id;panel.userData.assetSlot=true/);
 assert.match(scene,/agendaScreen\(g,'ted'/);
 assert.match(scene,/agendaScreen\(g,'julian'/);
 assert.match(scene,/onAgenda\(node.userData.agenda\)/);
 assert.match(scene,/structures.forEach\(g=>g.visible=f<0\)/);
 assert.match(scene,/new Set\(\[\.\.\.facades,\.\.\.structures\]\)/);
 assert.doesNotMatch(scene,/selected===b.id\?1.12/);
});
