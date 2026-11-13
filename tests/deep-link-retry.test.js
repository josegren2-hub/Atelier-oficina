import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=dirname(fileURLToPath(import.meta.url));
const main=readFileSync(join(root,'../src/main.js'),'utf8');

test('consumeDeepLink retries choose until detail opens',()=>{
  assert.match(main,/tries\s*<\s*12/);
  assert.match(main,/setTimeout\(go,\s*250\)/);
  assert.match(main,/detail\?\.open/);
});

test('paintSource updates footer for live mode',()=>{
  assert.match(main,/Actividad en vivo desde estado\.json/);
  assert.match(main,/team-disclaimer/);
});

test('version bumped to 0.22.2 in package',()=>{
  const pkg=JSON.parse(readFileSync(join(root,'../package.json'),'utf8'));
  assert.equal(pkg.version,'0.22.2');
});
