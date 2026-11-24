import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const rd = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
test('0.22.9: el ícono SJ azul vive en el código (index, manifest y archivos)', () => {
  const html = rd('index.html'), man = JSON.parse(rd('public/manifest.webmanifest'));
  assert.match(html, /<link rel="apple-touch-icon" href="\/apple-touch-icon-sja\.png">/);
  assert.match(html, /<link rel="icon" href="\/icon-sja-192\.png">/);
  assert.deepEqual(man.icons.map(i => i.src), ['/Atelier-oficina/icon-sja-192.png', '/Atelier-oficina/icon-sja-512.png']);
  for (const f of ['icon-sj-192', 'icon-sj-512', 'icon-sja-192', 'icon-sja-512', 'icon-sjb-192', 'icon-sjb-512', 'apple-touch-icon-sj', 'apple-touch-icon-sja', 'apple-touch-icon-sjb'])
    assert.ok(existsSync(new URL(`../public/${f}.png`, import.meta.url)), f);
});
test('0.22.9: versión en todos lados', () => {
  assert.equal(JSON.parse(rd('package.json')).version, '0.22.9');
  assert.equal(JSON.parse(rd('public/release.json')).version, '0.22.9');
  assert.equal(JSON.parse(rd('public/version.json')).version, '0.22.9');
  assert.match(rd('public/sw.js'), /const CACHE = 'atelier-v0\.22\.9';/);
  assert.match(rd('src/release-notice.js'), /RELEASE='0\.22\.9'/);
  assert.match(rd('index.html'), /Versión 0\.22\.9/);
});
