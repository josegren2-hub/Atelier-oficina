import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = readFileSync(new URL('../src/paleta-d.css', import.meta.url), 'utf8');
const nav = readFileSync(new URL('../src/nav-shell.css', import.meta.url), 'utf8');
const src = readFileSync(new URL('../src/nav-shell.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('F1p: la paleta D está importada y es la paleta por defecto (sin ?paleta=)', () => {
  assert.match(src, /import '\.\/paleta-d\.css'/);
  assert.doesNotMatch(html, /\?paleta=/);
  assert.doesNotMatch(css, /data-paleta/);
  assert.doesNotMatch(css, /--k-[0-9a-f]{6}/);
  assert.doesNotMatch(css, /berenjena|lavanda|tinta y papel|grafito/i);
});

test('F1p: D conserva el azul base y solo añade durazno, franjas e íconos por módulo', () => {
  assert.match(css, /--d-peach:#f3b99f/);
  assert.match(css, /\.ns-eyebrow,\s*\.ns-ch h3\{color:var\(--d-peach\)\}/);
  assert.match(css, /\.ns-item\[data-mod\]\{box-shadow:inset 3px 0 0 var\(--mc\)\}/);
  assert.match(css, /\.ns-item\[data-mod\]>svg:first-child\{color:var\(--mc\)\}/);
  assert.match(css, /\.ns-inicio \.ns-grid>\.ns-card\{[^}]*border-left:3px solid var\(--mc\)\}/);
  for (const [mod, hex] of [
    ['oficina', '#b8c86e'], ['agentes', '#b9a6e3'], ['tareas', '#6ec9a0'],
    ['bandeja', '#e8c56a'], ['proyectos', '#e09886'], ['agenda', '#e0b07a'],
    ['automatizaciones', '#7ec8d4'], ['archivo', '#d2c4a0'], ['estadisticas', '#e09070'],
  ]) {
    assert.match(css, new RegExp(`--d-${mod}:${hex}`), mod);
  }
  assert.match(css, /--a-0:#8fc9a0/);
  assert.match(css, /--a-1:#d4a56a/);
  assert.match(css, /--a-4:#e6a9c6/);
  // El azul de f1e/f1f sigue en nav-shell, no lo reescribe D
  assert.match(nav, /\.ns-drawer\{[^}]*background:rgba\(14,17,24,\.74\)/);
  assert.match(nav, /#314c62/);
  assert.match(nav, /#bcd9ec/);
});

test('F1p: Tinta Rosa, el velo .68, los emojis sin marco y f1o se conservan', () => {
  assert.match(css, /\.ns-inicio \.ns-grid>\.ns-card\.ns-tr\{border-left:3px solid rgba\(201,54,144,\.70\)\}/);
  assert.match(nav, /rgba\(14,17,24,\.68\)/);
  assert.match(nav, /\.ns-inicio \.ns-emo\{[^}]*background:\s*none/);
  assert.match(nav, /img\.ns-tr-logo\{[^}]*width:20px/);
  const f1o = nav.slice(nav.indexOf('/* f1o'));
  assert.match(f1o, /body\.ns-on\.ns-inmersivo #app > header\.chrome-top/);
  assert.match(f1o, /display:none!important/);
  const render = src.slice(src.indexOf('export function renderInicio'), src.indexOf('function abrirInicio'));
  assert.doesNotMatch(render, /ns-ic/);
  assert.match(render, /img class="ns-emo ns-tr-logo"/);
});
