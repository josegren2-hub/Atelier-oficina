import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
test('direct floor selector lives within distribution controls',()=>assert.match(html,/aria-label="Distribución del edificio"><label[^]*?id="floor-jump"/));
test('avatars open inline, not through a navigation link',()=>{assert.match(html,/id="avatar-dropdown" hidden/);assert.match(html,/iframe title="Galería/);assert.doesNotMatch(html,/<a[^>]+href="\.\/avatars.html"/);});
test('real sources stay disconnected and refresh performs no fetch',()=>{assert.doesNotMatch(main,/fetch\(/);assert.match(main,/Fuente real no conectada/);assert.match(main,/openAgenda/);});
test('caption has reserved opaque band outside 3D canvas',()=>{
 const css=fs.readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(css,/#viewport \.scene-title\{[^}]*height:84px[^}]*z-index:4[^}]*background:/);
 assert.match(css,/#viewport #canvas-container\{top:84px\}/);
 assert.match(css,/#viewport\.spread-view #canvas-container\{top:174px\}/);
});
