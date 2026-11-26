import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const scene = readFileSync(join(root, 'src/scene.js'), 'utf8');
const index = readFileSync(join(root, 'index.html'), 'utf8');
const boot = readFileSync(join(root, 'src/bootstrap.js'), 'utf8');
const sw = readFileSync(join(root, 'public/sw.js'), 'utf8');

test('F1x: el letrero y la fascia vuelven a f1s (fascia 1.95, sin letras nuevas ni neón violeta)', () => {
  assert.match(scene, /const parapetH=1\.95;/);
  assert.match(scene, /const CROWN_LETTERS=false;/);
  assert.doesNotMatch(scene, /paintCrownSign|applyCrownLighting|crownSignPaint|SIGN_TEX_MAX_W|neonSpill|SJSignSerif/);
  assert.doesNotMatch(scene, /0xfff8ff|0xf6e4ff|0xea78ff|0xcc55ff|0xd468ff/);
  assert.match(scene, /MeshBasicMaterial\(\{color:0xffb040,toneMapped:false\}\)/, 'se conserva el LED dorado de f1s');
  assert.doesNotMatch(index, /Playfair|SJSignSerif/);
  assert.equal(existsSync(join(root, 'public/fonts/PlayfairDisplay-VariableFont_wght.ttf')), false);
});

test('F1x: no quedan los recortes visuales de f1v/f1w (pixelRatio, sombras, avatares quietos, tope de fps, render bajo demanda)', () => {
  assert.doesNotMatch(scene, /function pixelRatioFor|const lite=|liteDirty|liteNow|liteBeat|liteWasOn/);
  assert.match(scene, /renderer\.setPixelRatio\(Math\.min\(devicePixelRatio,1\.6\)\)/);
  assert.match(scene, /renderer\.shadowMap\.enabled=true;/);
  assert.doesNotMatch(scene, /sun\.castShadow=false;renderer\.shadowMap\.enabled=false/);
  assert.match(scene, /movement\.update\(step,\{reducedMotion:reduced,paused:/);
  assert.match(scene, /avatars\.update\(t,animateBots\?'idle':false,phoneFar\)/);
  assert.doesNotMatch(scene, /if\(liteNow&&nowMsTick-liteLast<30\)return;/);
});

test('F1x: se conservan el arreglo del service worker y el recargo si la insignia no coincide', () => {
  assert.match(sw, /self\.skipWaiting\(\)/);
  assert.match(sw, /self\.clients\.claim\(\)/);
  assert.match(sw, /version\.json/);
  assert.match(boot, /updateViaCache:\s*'none'/);
  assert.match(boot, /version\.json/);
  assert.match(boot, /location\.reload\(\)/);
});
