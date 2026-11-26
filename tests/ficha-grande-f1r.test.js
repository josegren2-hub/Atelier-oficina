import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../src/lista-app.js', import.meta.url), 'utf8');
const f1r = css.slice(css.indexOf('/* f1r'));

test('F1r: la ficha de Solo lista es una hoja casi a pantalla, con foto grande y sin «…»', () => {
  assert.ok(f1r.length > 40, 'existe el bloque f1r');
  assert.match(f1r, /#lista-ficha\.lista-ficha-card\.ficha-flotante\{/);
  assert.match(f1r, /left:0!important/);
  assert.match(f1r, /right:0!important/);
  assert.match(f1r, /transform:none!important/);
  assert.match(f1r, /width:100%!important/);
  assert.match(f1r, /max-width:100%!important/);
  assert.match(f1r, /box-sizing:border-box!important/);
  assert.match(f1r, /overflow-x:hidden!important/);
  assert.match(f1r, /max-height:min\(96dvh/);
  assert.match(f1r, /#lista-ficha\.lista-ficha-card \.ficha-av\{[^}]*width:112px!important/);
  assert.match(f1r, /-webkit-line-clamp:unset!important/);
  assert.match(f1r, /overflow-wrap:anywhere/);
  // Paleta D: tokens, no el oro viejo ni colores de otras paletas
  assert.match(f1r, /color:var\(--sj-gold/);
  assert.match(f1r, /background:var\(--sj-glass-2/);
  assert.match(f1r, /border:1px solid var\(--sj-line/);
  assert.doesNotMatch(f1r, /#c9b896/);
  assert.doesNotMatch(f1r, /berenjena|lavanda|tinta y papel|grafito/i);
});

test('F1r: la ficha lista todos los datos del código y respeta el mando bloqueado', () => {
  assert.match(js, /function fichaDatosHtml\(/);
  assert.match(js, /import \{botProfile\} from '\.\/roster\.js'/);
  assert.match(js, /import \{dedupeFactRows\} from '\.\/text-clip\.js'/);
  assert.match(js, /formatActualizado/);
  for (const label of ['Planta', 'Puesto', 'Estado', '¿Está activo?', 'Actividad ahora', 'Tarea actual', 'Tarea anterior', 'Última señal real', 'Uso', 'Resumen', 'Te espera', 'Autorización', 'Callado', 'Rutina']) {
    assert.match(js, new RegExp(label.replace(/[?¿]/g, '\\$&')));
  }
  assert.match(js, /width="112" height="112"/);
  assert.match(js, /const tarea = b\.task \|\| \(b\.mandoUnlocked \? profile\.currentTask : null\)/);
  assert.match(js, /Chat con mando desbloqueado/);
  // No recorta el texto de la ficha con clipPhrase ni ellipsis forzado
  const open = js.slice(js.indexOf('function openFicha'), js.indexOf('function closeListaFicha') > js.indexOf('function openFicha') ? js.indexOf('document.getElementById(\'lista-counters\')') : js.length);
  assert.doesNotMatch(open, /clipPhrase/);
  assert.doesNotMatch(js, /fichaDatosHtml[\s\S]*clipPhrase/);
});

test('F1r: el bloque no pisa f1m, f1o ni f1p', () => {
  const nav = readFileSync(new URL('../src/nav-shell.css', import.meta.url), 'utf8');
  assert.match(nav, /\/\* f1o/);
  assert.match(nav, /body\.ns-on\.ns-inmersivo #app > header\.chrome-top/);
  const pal = readFileSync(new URL('../src/paleta-d.css', import.meta.url), 'utf8');
  assert.match(pal, /--d-peach:#f3b99f/);
  assert.equal(css.indexOf('/* f1r'), css.lastIndexOf('/* f1r'));
  // f1r solo toca #lista-ficha, no reescribe tokens de D
  assert.doesNotMatch(f1r, /--d-peach|--sj-gold:/);
});
