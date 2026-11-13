import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {floors} from '../src/data.js';
import {STACK_PITCH,floorPose,viewVolumes,findAvatarSpot,LIGHTING,visualStatus,stackedWindowHeight,floorCaption,stackedTargetYRange} from '../src/view-layout.js';

test('stacked floors keep a wide even air gap and a short camera window',()=>{
 assert.equal(STACK_PITCH,16);
 for(let i=1;i<floors.length;i++)assert.equal(floorPose(i,'stacked').y-floorPose(i-1,'stacked').y,STACK_PITCH);
 assert.ok(STACK_PITCH-4.6>5,'ceiling of one floor must not hide the furniture of the floor above');
 assert.equal(viewVolumes('stacked').length,1);
 assert.equal(viewVolumes('stacked')[0][1][1],stackedWindowHeight());
 assert.ok(stackedWindowHeight()<(floors.length-1)*STACK_PITCH,'all floors do not fit; the user pans');
 const range=stackedTargetYRange();
 assert.ok(range.max>range.min);
 assert.equal(floorPose(3,'stacked',true).y,13.799999999999999);
 assert.equal(floorCaption(0),'PB · Personal');
 assert.equal(floorCaption(3),'Piso 3 · Medios y Producción');
 assert.match(floorCaption(4),/Piso 4 · Tinta Rosa/);
 assert.match(floorCaption(5),/Piso 5 · Penthouse/);
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
 assert.match(scene,/onAssets=\(\)=>\{\},onAgenda=\(\)=>\{\},onFloor=\(\)=>\{\}/);
 assert.match(scene,/panel.userData.agenda=id;panel.userData.assetSlot=true/);
 assert.match(scene,/agendaScreen\(g,'ted'/);
 assert.match(scene,/agendaScreen\(g,'julian'/);
 assert.match(scene,/onAgenda\(node.userData.agenda\)/);
 assert.match(scene,/structures.forEach\(g=>g.visible=f<0\)/);
 assert.match(scene,/new Set\(\[\.\.\.facades,\.\.\.structures\]\)/);
 assert.doesNotMatch(scene,/selected===b.id\?1.12/);
});

test('entrance canopy hides with exterior structure in isolated floor',()=>{
 const source=readFileSync(new URL('../src/scene.js',import.meta.url),'utf8');
 // Marquee/canopy stays on structure (not floor group) so it hides in isolated-floor view.
 assert.match(source,/box\(structure,-8,3\.95,10\.8,8\.6,\.36,3\.8,M\.dark\)/);
 assert.doesNotMatch(source,/box\(g,-8,3\.95,10\.8,8\.6,\.36,3\.8,M\.dark\)/);
});
