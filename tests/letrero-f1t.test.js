import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, statSync} from 'node:fs';

const scene = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const fontUrl = new URL('../public/fonts/PlayfairDisplay-VariableFont_wght.ttf', import.meta.url);

test('F1t: la bandera de letras del letrero está encendida', () => {
  assert.match(scene, /const CROWN_LETTERS=true/);
  assert.doesNotMatch(scene, /const CROWN_LETTERS=false/);
  const paint = scene.slice(scene.indexOf('function paintCrownSign'), scene.indexOf('const CROWN_LETTERS='));
  assert.match(paint, /const sj='SJ', name='San Junipero'/);
  assert.doesNotMatch(paint, /SAN JUNÍPERO|TOWER/);
  // El tótem de la entrada (fuera de alcance) sigue con «SAN JUNÍPERO / TOWER».
  assert.match(scene, /fillText\('SAN JUNÍPERO',512,600\)/);
});

test('F1t: la fascia negra mide 2.28 (era 1.95, +0.33)', () => {
  assert.match(scene, /const parapetH=2\.28/);
  assert.doesNotMatch(scene, /const parapetH=1\.95/);
});

test('F1t: neón violeta con núcleo claro y derrame, sin LED dorado ni bloom', () => {
  assert.match(scene, /color:0xfff8ff/); // núcleo casi blanco-lila
  assert.match(scene, /color:0xea78ff/); // brillo violeta
  assert.match(scene, /color:0xcc55ff/); // halo
  assert.match(scene, /color:0xd468ff/); // derrame sobre el vidrio
  assert.match(scene, /neonSpill/);
  assert.doesNotMatch(scene, /ledCrown|0xffb040/);
  assert.doesNotMatch(scene, /UnrealBloomPass|EffectComposer|BloomPass/);
  // el neón es MeshBasic, no PointLight
  const neonBlock = scene.slice(scene.indexOf('const neonCore='), scene.indexOf('function applyCrownLighting'));
  assert.doesNotMatch(neonBlock, /PointLight|new THREE\.PointLight/);
  assert.match(scene, /function applyCrownLighting\(isNight\)/);
  assert.match(scene, /try\{applyCrownLighting\?\.\(!!p\.isNight\);\}catch\{\}/);
});

test('F1t: tipografía Playfair en el HTML y en public/fonts', () => {
  assert.match(html, /@font-face\{font-family:SJSignSerif;src:url\(\.\/fonts\/PlayfairDisplay-VariableFont_wght\.ttf\)/);
  assert.equal(existsSync(fontUrl), true);
  assert.ok(statSync(fontUrl).size > 100000);
  assert.match(scene, /SJSignSerif/);
});

test('F1t: el lienzo del letrero respeta la proporción del plano y no pasa de 8192 px de ancho', () => {
  assert.match(scene, /const SIGN_TEX_MAX_W=8192/);
  assert.match(scene, /const SIGN_PLANE_W=24\.8, SIGN_PLANE_H=parapetH\*0\.96/);
  assert.match(scene, /if\(W>SIGN_TEX_MAX_W\)\{W=SIGN_TEX_MAX_W;H=Math\.max\(256,Math\.round\(W\*\(SIGN_PLANE_H\/SIGN_PLANE_W\)\)\);\}/);
  const parapetH=2.28, planeW=24.8, planeH=parapetH*0.96, maxW=8192;
  let H=1024, W=Math.max(2048, Math.round(H*(planeW/planeH)));
  if(W>maxW){W=maxW;H=Math.max(256,Math.round(W*(planeH/planeW)));}
  assert.equal(W, 8192);
  assert.equal(H, 723);
  assert.ok(Math.abs((W/H) - (planeW/planeH)) < 0.01);
});
