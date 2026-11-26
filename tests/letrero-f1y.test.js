import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const scene = readFileSync(join(root, 'src/scene.js'), 'utf8');
const index = readFileSync(join(root, 'index.html'), 'utf8');
const boot = readFileSync(join(root, 'src/bootstrap.js'), 'utf8');
const sw = readFileSync(join(root, 'public/sw.js'), 'utf8');
const font = join(root, 'public/fonts/PlayfairDisplay-VariableFont_wght.ttf');

test('F1y: el letrero y la fascia son los de f1u (2.28, Playfair, neón, lienzo ≤4096, pintado solo al cambiar el tema)', () => {
  assert.match(scene, /const parapetH=2\.28;/);
  assert.match(scene, /const CROWN_LETTERS=true;/);
  assert.match(scene, /SIGN_TEX_MAX_W=Math\.min\(4096,renderer\.capabilities\?\.maxTextureSize\|\|4096\)/);
  assert.match(scene, /San Junipero/);
  assert.match(index, /SJSignSerif/);
  assert.match(index, /PlayfairDisplay-VariableFont_wght\.ttf/);
  assert.equal(existsSync(font), true);
  assert.ok(statSync(font).size > 100000);
  const start = scene.indexOf('function applyCrownLighting');
  const fn = scene.slice(start, scene.indexOf('// Si el celular pierde el contexto WebGL', start));
  assert.match(fn, /if\(night!==crownIsNight && typeof crownSignPaint==='function'\)crownSignPaint\(night\)/);
  assert.match(scene, /addEventListener\('webglcontextlost',ev=>\{ev\.preventDefault\(\)/);
  assert.match(scene, /addEventListener\('webglcontextrestored'/);
  assert.doesNotMatch(scene, /0xffb040/);
});

test('F1y: no se reaplican los recortes visuales de f1v/f1w', () => {
  assert.doesNotMatch(scene, /function pixelRatioFor|const lite=|liteDirty|liteNow|liteBeat|liteWasOn/);
  assert.match(scene, /renderer\.setPixelRatio\(Math\.min\(devicePixelRatio,1\.6\)\)/);
  assert.match(scene, /renderer\.shadowMap\.enabled=true;/);
  assert.doesNotMatch(scene, /sun\.castShadow=false;renderer\.shadowMap\.enabled=false/);
  assert.match(scene, /movement\.update\(step,\{reducedMotion:reduced,paused:/);
  assert.match(scene, /avatars\.update\(t,animateBots\?'idle':false,phoneFar\)/);
  assert.doesNotMatch(scene, /if\(liteNow&&nowMsTick-liteLast<30\)return;/);
});

test('F1y: se conserva el arreglo del service worker de f1v', () => {
  assert.match(sw, /self\.skipWaiting\(\)/);
  assert.match(sw, /self\.clients\.claim\(\)/);
  assert.match(sw, /version\.json/);
  assert.match(boot, /updateViaCache:\s*'none'/);
  assert.match(boot, /version\.json/);
  assert.match(boot, /location\.reload\(\)/);
});
