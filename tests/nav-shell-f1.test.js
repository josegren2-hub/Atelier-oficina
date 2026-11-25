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
const css = readFileSync(new URL('../src/nav-shell.css', import.meta.url), 'utf8');
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
  assert.match(css, /body\.ns-on\{--dock-h:0px\}/);
  assert.match(css, /\.ns-drawer\{position:fixed/);
  assert.doesNotMatch(css, /#FFD|#ff0|yellow/i);
});

test('F1b: el botón ☰ va en .chrome-primary (40 px, vidrio, 4 px) y no se encima con #vista-toolbar', () => {
  assert.match(src, /\.chrome-primary/);
  assert.match(css, /\.ns-fab\{[^}]*width:40px;height:40px[^}]*border-radius:4px/);
  assert.match(css, /\.ns-fab\{[^}]*backdrop-filter:blur/);
  assert.match(css, /#vista-toolbar\.vista-toolbar\{bottom:calc\(39px/);
});

test('F1b: pila de historial (navStack) y cierre completo al tocar fuera', () => {
  assert.match(src, /navStack\.push\(/);
  assert.match(src, /navStack\.pop\(/);
  assert.match(src, /cerrarTodoPorFuera/);
  assert.match(src, /syncScrim/);
});

test('F1b: sin el letrero oscuro de área en la pared del fondo (se conserva el neón de Piso 04)', () => {
  const sc = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');
  assert.doesNotMatch(sc, /floors\[n\]\.name\.toUpperCase\(\).*-8\.64/);
  assert.match(sc, /furnishTintaRosa/);
});

test('F1b: botón persistente de Día/Noche (luz) con vidrio y 4 px visible incluso en inmersivo', () => {
  assert.match(src, /ns-luz/);
  assert.match(src, /dock-noche/);
  assert.match(css, /\.ns-luz\{[^}]*border-radius:4px/);
  assert.match(css, /\.ns-luz\{[^}]*backdrop-filter:blur/);
  assert.match(css, /body\.ns-inmersivo[^}]*\.ns-luz[^}]*visibility:visible/);
});

test('F1c: Más es un carrusel horizontal de tarjetas (no la fila desplegable anterior)', () => {
  assert.match(src, /ns-mas-rail/);
  assert.match(src, /ns-mas-card/);
  assert.match(src, /Desliza/);
  assert.match(src, /MAS_BLURB/);
  assert.doesNotMatch(src, /Más: Proyectos, Agenda, Archivo/);
  assert.match(css, /scroll-snap-type:x mandatory/);
  assert.match(css, /\.ns-mas-wrap::after/);
  assert.match(css, /Desliza|ns-mas-hint/);
});

test('F1c: apertura ~200ms con prefers-reduced-motion, 4 px y acento (el vidrio 28px lo sustituye F1e)', () => {
  assert.match(css, /transition:transform 200ms/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(src, /playEnter/);
  assert.match(css, /border-radius:4px/);
  assert.match(css, /#bcd9ec/);
});

test('F1e: menú con fondo de El equipo (navy casi sólido, sin blur 28px), líneas, texto secundario y botones', () => {
  assert.match(css, /\.ns-drawer\{[^}]*background:rgba\(14,17,24,\.86\)/);
  assert.match(css, /\.ns-drawer\{[^}]*backdrop-filter:blur\(20px\) saturate\(1\.3\)/);
  assert.doesNotMatch(css, /\.ns-drawer\{[^}]*blur\(28px\)/);
  assert.match(css, /#485a6b/);
  assert.match(css, /#344250/);
  assert.match(css, /#b4c9d9/);
  assert.match(css, /\.ns-drawer \.ns-btn:not\(\.p\):not\(\.tr\)[^}]*#314c62/);
  assert.match(css, /#90a9bd/);
  assert.match(css, /transition:transform 200ms/);
});

test('F1d: la barra inferior (vistas + cámara) no se recorta: 39px + safe-area, no 16px', () => {
  assert.match(css, /#vista-toolbar\.vista-toolbar\{bottom:calc\(39px \+ env\(safe-area-inset-bottom/);
  assert.doesNotMatch(css, /body\.ns-on[^}]*#vista-toolbar[^}]*bottom:calc\(16px/);
});
