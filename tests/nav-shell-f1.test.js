import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {modoInicial, pantallaInicial, siguienteModo} from '../src/nav-prefs.js';

const store = (o = {}) => ({get: (k, d) => (k in o ? o[k] : d)});

test('F1: celular arranca en la Oficina 3D con menú oculto', () => {
  assert.equal(pantallaInicial(store(), true), 'oficina');
  assert.equal(modoInicial(store(), true), 'oculto');
});
test('F1: escritorio arranca en Inicio con menú compacto', () => {
  assert.equal(pantallaInicial(store(), false), 'inicio');
  assert.equal(modoInicial(store(), false), 'compacto');
});
test('F1: preferencias guardadas por tipo de dispositivo; valores raros se ignoran', () => {
  assert.equal(modoInicial(store({atelierNavModoMovil: 'expandido'}), true), 'expandido');
  assert.equal(modoInicial(store({atelierNavModoMovil: 'raro'}), true), 'oculto');
  assert.equal(pantallaInicial(store({atelierNavInicioEscritorio: 'oficina'}), false), 'oficina');
  assert.equal(siguienteModo('oculto'), 'compacto');
  assert.equal(siguienteModo('expandido'), 'oculto');
});
const src = readFileSync(new URL('../src/nav-shell.js', import.meta.url), 'utf8');
test('F1: los 11 módulos del plan maestro existen en el menú', () => {
  for (const m of ['Inicio', 'Oficina 3D', 'Agentes', 'Tareas', 'Bandeja de atención', 'Proyectos', 'Agenda', 'Automatizaciones', 'Archivo y memoria', 'Estadísticas', 'Configuración']) assert.ok(src.includes(`'${m}'`), m);
});
test('F1: las funciones del dock siguen accesibles desde el nuevo menú', () => {
  for (const s of ["sheets.open('equipo')", "sheets.open('proyectos')", "sheets.open('pizarron')", "sheets.open('avisos')", "sheets.open('consulta')", "click('refresh-office')", "click('dock-lista')", "click('mando-unlock')", "click('dock-noche')", "sheets.open('resumen')", "trTab(", "sheets.open('mas')"]) assert.ok(src.includes(s), s);
});
test('F1: Inicio no inventa datos: sin fuente dice No disponible', () => {
  assert.match(src, /No disponible todavía/);
  assert.doesNotMatch(src, /\b\d{1,3}\s?%/);
});
test('F1: no se guardan claves ni contenido del mando en localStorage desde la navegación', () => {
  const lsObj = src.match(/const LS = \{[^}]+\}/)[0];
  const keys = [...lsObj.matchAll(/'(atelier[A-Za-z]+)'/g)].map(m => m[1]);
  assert.ok(keys.length >= 4);
  assert.doesNotMatch(src, /localStorage\.setItem\([^)]*(mando|clave|key)/i);
  for (const k of keys) assert.match(k, /^atelier(Nav|Capturas)/, k);
});
test('F1: el service worker no guarda tintarosa.enc ni proyectos.enc', () => {
  const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.match(sw, /tintarosa\\\.enc/); assert.match(sw, /proyectos\\\.enc/);
});
test('F1: el menú es una capa y no reserva espacio (dock oculto, canvas intacto)', () => {
  const css = readFileSync(new URL('../src/nav-shell.css', import.meta.url), 'utf8');
  assert.match(css, /body\.ns-on\{--dock-h:0px\}/);
  assert.match(css, /\.ns-drawer\{position:fixed/);
  assert.doesNotMatch(css, /#FFD|#ff0|yellow/i);
});
