import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const lista = readFileSync(new URL('../src/lista-app.js', import.meta.url), 'utf8');
const cc = readFileSync(new URL('../src/command-center.js', import.meta.url), 'utf8');
const chrome = readFileSync(new URL('../src/ui-chrome.js', import.meta.url), 'utf8');

test('s10: el Mando abierto pide confirmación antes de bloquear', () => {
  assert.match(html, /id="mando-bloquear"/);
  assert.match(html, /id="mando-confirmar-si"/);
  const unlockHandler = main.slice(main.indexOf("$('#mando-unlock')?.addEventListener('click'"), main.indexOf("$('#mando-bloquear')"));
  assert.doesNotMatch(unlockHandler, /mandoSession\.lock\(\)/);
});

test('s10: archivero abre solo pestaña nueva (nunca navega la oficina)', async () => {
  globalThis.window = globalThis.window || {};
  const {openUrl} = await import('../src/archivero-ui.js');
  const fake = {opener: 'x'};
  assert.equal(openUrl('https://example.com/a', {open: () => fake}), true);
  assert.equal(fake.opener, null);
  assert.equal(openUrl('https://example.com/a', {open: () => null}), false);
  const src = readFileSync(new URL('../src/archivero-ui.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /location\.assign/);
});

test('s10→s11: Avisos y Celular ya son una sola hoja «Avisos al celular»', () => {
  assert.doesNotMatch(chrome, /bindPress\(\$\('#notifications-open'\)/);
  assert.doesNotMatch(main, /#notifications-open/);
  assert.match(main, /\['avisos-open','Avisos al celular','cel'\]/);
});

test('s10: Centro de mando sin ID interno ni «Cerrar ×»', () => {
  assert.doesNotMatch(cc, /ID: \$\{/);
  assert.doesNotMatch(cc, /Cerrar ×/);
});

test('s10: Solo lista no usa prompt() para la frase', () => {
  assert.doesNotMatch(lista, /prompt\(/);
  assert.match(lista, /type="password"/);
});

test('s10: Más dice 6 niveles', () => {
  assert.match(html, /6 niveles/);
  assert.doesNotMatch(html, /5 niveles/);
});
