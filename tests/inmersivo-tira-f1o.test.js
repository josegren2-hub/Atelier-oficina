import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = readFileSync(new URL('../src/nav-shell.css', import.meta.url), 'utf8');
const f1o = css.slice(css.indexOf('/* f1o'));

test('F1o: en inmersivo la tira de arriba desaparece y la escena llena desde arriba', () => {
  assert.ok(f1o.length > 40, 'existe el bloque f1o');
  assert.match(f1o, /body\.ns-on\.ns-inmersivo #app > header\.chrome-top/);
  assert.match(f1o, /body\.ns-on\.ns-inmersivo #app aside\.navigation/);
  assert.match(f1o, /display:none!important/);
  assert.match(f1o, /height:0!important/);
  assert.match(f1o, /body\.ns-on\.ns-inmersivo #viewport,\s*body\.ns-on\.ns-inmersivo #viewport\.spread-view\{[^}]*height:100dvh!important/);
  assert.match(f1o, /padding-top:0!important/);
  // Al quitar .ns-inmersivo estas reglas dejan de aplicar (no reescriben el modo normal).
  const normalHeader = css.slice(css.indexOf('body.ns-on #app > header.chrome-top{'), css.indexOf('/* f1o'));
  assert.match(normalHeader, /height:36px!important/);
  assert.doesNotMatch(f1o, /body\.ns-on #app > header\.chrome-top\{display:none/);
});
