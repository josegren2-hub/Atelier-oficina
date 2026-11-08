import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
// Execute the exact pure layout helper without constructing a browser/WebGL renderer.
const source=fs.readFileSync(new URL('../src/avatar-gallery.js',import.meta.url),'utf8');
const helper=source.match(/export function calculateGalleryLayout\(width,count=16\)\{[\s\S]*?\n\}/)[0].replace('export ','');
const layout=vm.runInNewContext(`${helper};calculateGalleryLayout`);
for(const width of [360,390,430,599,600,1024,1440])test(`gallery ${width}px fits grid without added vertical camera margin`,()=>{
 const x=layout(width);assert.equal(x.columns,width<600?2:4);assert.equal(x.rows,width<600?8:4);
 assert.ok(Math.abs(width/x.height-x.worldWidth/x.worldHeight)<1e-12);
 assert.ok(x.height>0);if(width===390)assert.ok(x.height>1559&&x.height<1561);
 for(let row=0;row<x.rows;row++){const y=((x.rows-1)/2-row)*1.65-.31;assert.ok(y+1.035<x.worldHeight/2);assert.ok(y-.4105>-x.worldHeight/2);}
});
test('gallery has no fixed 1100px/2200px height and retains demo controls',()=>{
 const html=fs.readFileSync(new URL('../avatars.html',import.meta.url),'utf8');assert.doesNotMatch(html,/height:(1100|2200)px/);
 for(const pose of ['idle','wave','work'])assert.ok(html.includes(`data-pose="${pose}"`));assert.ok(html.includes('Estáticos'));assert.ok(html.includes('Volver a la oficina'));
});
