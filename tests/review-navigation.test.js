import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
test('direct floor selector lives within distribution controls',()=>assert.match(html,/aria-label="Distribución del edificio"><label[^]*?id="floor-jump"/));
test('avatars open inline, not through a navigation link',()=>{assert.match(html,/id="avatar-dropdown" hidden/);assert.match(html,/iframe title="Galería/);assert.doesNotMatch(html,/<a[^>]+href="\.\/avatars.html"/);});
test('phase 1 wires live estado.json polling and keeps demo available',()=>{assert.match(main,/readSnapshot/);assert.match(main,/SOURCE_CONTRACT/);assert.match(main,/En vivo/);assert.match(main,/openAgendaCalendar/);});
test('caption has reserved opaque band outside 3D canvas',()=>{
 const css=fs.readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(css,/#viewport \.scene-title\{[^}]*height:84px[^}]*z-index:4[^}]*background:/);
 assert.match(css,/#viewport #canvas-container\{top:84px\}/);
 assert.match(css,/#viewport\.spread-view #canvas-container\{top:174px\}/);
});

test('final layout reserves in-flow rows and never absolute title overlap',()=>{
 const css=fs.readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(css,/#viewport\{display:grid;grid-template-rows:auto auto minmax\(240px,1fr\) auto auto/);
 assert.match(css,/#viewport \.scene-title\{position:relative;inset:auto/);
 assert.match(css,/#viewport #canvas-container,#viewport\.spread-view #canvas-container\{position:relative;inset:auto/);
 assert.match(main,/id=>openAgendaCalendar\(id\),id=>\{if\(id!==floor\)setFloor\(id\);\}/);
});
test('canvas intrinsic size cannot expand desktop grid tracks',()=>{
 const css=fs.readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(css,/#app\{height:100dvh;min-height:0;grid-template-rows:auto minmax\(0,1fr\)/);
 assert.match(css,/#canvas-container>canvas\{position:absolute;inset:0;width:100%!important;height:100%!important\}/);
 assert.match(css,/min-height:0;min-width:0;contain:size layout/);
});
