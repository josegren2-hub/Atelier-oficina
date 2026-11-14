import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const manifest = fs.readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8');
const boot = fs.readFileSync(new URL('../src/bootstrap.js', import.meta.url), 'utf8');

test('visible name is San Junipero Corp', () => {
  assert.match(html, /San Junipero Corp|SAN JUNIPERO CORP/);
  assert.match(html, /apple-mobile-web-app-title" content="San Junipero"/);
  assert.match(manifest, /"name": "San Junipero Corp"/);
  assert.match(manifest, /"short_name": "San Junipero"/);
});

test('PWA identity uses absolute /Atelier-oficina/ paths and SW scope', () => {
  assert.match(manifest, /"id": "\/Atelier-oficina\/"/);
  assert.match(manifest, /"start_url": "\/Atelier-oficina\/"/);
  assert.match(manifest, /"scope": "\/Atelier-oficina\/"/);
  assert.match(manifest, /\/Atelier-oficina\/icon-192\.png/);
  assert.match(boot, /import\.meta\.env\.BASE_URL/);
  assert.match(boot, /serviceWorker\.register/);
  assert.match(boot, /swScope|scope/);
  assert.match(boot, /pwa-install/);
});

test('compact chrome: dock + Más + views-bar below building', () => {
  assert.match(html, /id="dock"/);
  assert.match(html, /id="dock-equipo"/);
  assert.match(html, /id="dock-proyectos"/);
  assert.match(html, /id="dock-paneles"/);
  assert.match(html, /id="dock-noche"/);
  assert.match(html, /id="dock-lista"/);
  assert.match(html, /id="dock-mando"/);
  assert.match(html, /id="search-toggle"/);
  assert.match(html, /id="install-app"/);
  assert.match(html, /id="mas-panel"/);
  assert.match(html, /id="view-modes"[^>]*aria-label="Distribución del edificio"><label[^]*?id="floor-jump"/);
  assert.match(css, /\.dock\{[^}]*position:fixed/);
  assert.match(css, /backdrop-filter:blur\(20px\)/);
});

test('glass blur is on the panel, sheets are not fullscreen', () => {
  assert.match(css, /--glass-blur:blur\(20px\) saturate/);
  assert.match(css, /\.glass-sheet\{[^}]*max-height:min\(62dvh/);
  assert.match(css, /\.mcpanel\.plegado\{[^}]*left:-9999px/);
});

test('package is 0.22.3', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.version, '0.22.3');
});
