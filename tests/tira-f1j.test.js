import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {estadoModoDios} from '../src/tira-estado.js';

const css = readFileSync(new URL('../src/nav-shell.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../src/nav-shell.js', import.meta.url), 'utf8');

test('F1j: la etiqueta visible de Modo dios queda fija y el estado va en el candado y en aria/title', () => {
  const cerrado = estadoModoDios({classList: {contains: () => false}, textContent: 'Mando bloqueado'});
  const abierto = estadoModoDios({classList: {contains: c => c === 'unlocked'}, textContent: 'Mando desbloqueado · cifrado local'});
  assert.equal(cerrado.etiqueta, 'Modo dios');
  assert.equal(abierto.etiqueta, 'Modo dios');
  assert.notEqual(abierto.etiqueta, 'Modo dios abierto');
  assert.equal(cerrado.aria, 'Modo dios: cerrado');
  assert.equal(abierto.aria, 'Modo dios: abierto');
  assert.equal(cerrado.icono, 'candado');
  assert.equal(abierto.icono, 'candadoAbierto');
  assert.match(js, /tabDios\.title = m\.aria/);
  assert.match(css, /\.ns-tab \.ns-tl\{white-space:nowrap;overflow:hidden;max-width:100%/);
  assert.match(css, /\.ns-tab\{[^}]*overflow:hidden/);
});
