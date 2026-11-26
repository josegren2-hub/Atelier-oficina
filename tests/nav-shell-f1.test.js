import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {modoInicial, pantallaInicial, siguienteModo} from '../src/nav-prefs.js';
import {mandoEstaAbierto, debeVolverAInicioTrasMando} from '../src/mando-abierto.js';

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
  assert.match(src, /no hay una fuente de prioridades/);
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

test('F1g: Más módulos en filas verticales (ya no carrusel), separador sin «Desliza» y scroll solo en la lista', () => {
  assert.match(src, /function masFilas\(\)/);
  assert.match(src, /ns-mas-sep[^`]*Más módulos[^`]*\$\{navItems\(extras, \{chev: true\}\)\}/);
  assert.doesNotMatch(src, /ns-mas-rail|ns-mas-card|MAS_BLURB|Desliza/);
  assert.doesNotMatch(css, /ns-mas-rail|ns-mas-card|ns-mas-hint|scroll-snap-type:x mandatory/);
  assert.match(css, /\.ns-root nav\.ns-drawer\{display:flex;flex-direction:column;gap:0\}/);
  assert.doesNotMatch(css, /nav\.ns-drawer\{display:block\}/);
  assert.match(css, /\.ns-drawer \.ns-list\{[^}]*overflow-y:auto/);
  assert.match(css, /\.ns-drawer \.ns-dh,\.ns-drawer \.ns-dfoot\{flex:none\}/);
  assert.match(css, /max-height:min\(calc\(100dvh - 24px\),521px\)/);
  assert.doesNotMatch(src, /Más: Proyectos, Agenda, Archivo/);
});

test('F1c: apertura ~200ms con prefers-reduced-motion, 4 px y acento (el vidrio 28px lo sustituye F1e)', () => {
  assert.match(css, /transition:transform 200ms/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(src, /playEnter/);
  assert.match(css, /border-radius:4px/);
  assert.match(css, /#bcd9ec/);
});

test('F1e: menú con fondo de El equipo (navy, sin blur 28px), líneas, texto secundario y botones', () => {
  assert.match(css, /\.ns-drawer\{[^}]*background:rgba\(14,17,24,/);
  assert.match(css, /\.ns-drawer\{[^}]*backdrop-filter:blur\(20px\) saturate\(1\.3\)/);
  assert.doesNotMatch(css, /\.ns-drawer\{[^}]*blur\(28px\)/);
  assert.match(css, /#485a6b/);
  assert.match(css, /#344250/);
  assert.match(css, /#b4c9d9/);
  assert.match(css, /\.ns-drawer \.ns-btn:not\(\.p\):not\(\.tr\)[^}]*#314c62/);
  assert.match(css, /#90a9bd/);
  assert.match(css, /transition:transform 200ms/);
});

test('F1f: fondo del menú y de .ns-hub un poco más transparente, mismo tono navy', () => {
  assert.match(css, /\.ns-drawer\{[^}]*background:rgba\(14,17,24,\.74\)/);
  assert.match(css, /\.ns-hub\{[^}]*background:rgba\(14,17,24,\.74\)/);
  assert.doesNotMatch(css, /\.ns-drawer\{[^}]*background:rgba\(14,17,24,\.86\)/);
  assert.match(css, /\.ns-drawer\{[^}]*backdrop-filter:blur\(20px\) saturate\(1\.3\)/);
  assert.match(css, /\.ns-hub\{[^}]*backdrop-filter:blur\(20px\) saturate\(1\.3\)/);
});

test('F1d: la barra inferior (vistas + cámara) no se recorta: 39px + safe-area, no 16px', () => {
  assert.match(css, /#vista-toolbar\.vista-toolbar\{bottom:calc\(39px \+ env\(safe-area-inset-bottom/);
  assert.doesNotMatch(css, /body\.ns-on[^}]*#vista-toolbar[^}]*bottom:calc\(16px/);
});

test('F1h: Inicio detecta el mando abierto por .unlocked y no confunde desbloqueado con bloqueado', () => {
  const el = (text, unlocked = false) => ({
    classList: {contains: (c) => unlocked && c === 'unlocked'},
    textContent: text,
  });
  assert.equal(mandoEstaAbierto(el('Mando bloqueado')), false);
  assert.equal(mandoEstaAbierto(el('Mando desbloqueado · cifrado local')), true);
  assert.equal(mandoEstaAbierto(el('Mando desbloqueado · cifrado local', true)), true);
  assert.equal(mandoEstaAbierto(el('Mando bloqueado', true)), true);
  assert.equal(mandoEstaAbierto(el('Mando abierto', false)), true);
  assert.equal(mandoEstaAbierto(null), false);
  assert.equal(mandoEstaAbierto(undefined), false);
  assert.match(src, /mandoEstaAbierto\(\$\('#mando-status'\)\)/);
  assert.doesNotMatch(src, /!\/bloqueado\/i/);
  assert.doesNotMatch(src, /\/abierto\|desbloq\/i/);
});

test('F1k: Notas rápidas junta el formulario y la lista en una tarjeta, con aviso local y atelierCapturas', () => {
  assert.match(src, /Notas rápidas/);
  assert.match(src, /atelierCapturas/);
  assert.match(src, /Guardada en este celular/);
  assert.match(src, /aparece aquí abajo/);
  assert.match(src, /Borrar notas de este celular/);
  const render = src.slice(src.indexOf('export function renderInicio'), src.indexOf('function abrirInicio'));
  const formAt = render.indexOf('<form class="ns-qc"');
  const cardPlus = render.indexOf("card('plus', 'Notas rápidas'");
  const afterCard = render.indexOf('¿En qué me quedé?');
  assert.ok(cardPlus >= 0 && formAt > cardPlus && formAt < afterCard, 'el formulario vive dentro de Notas rápidas');
  assert.ok(!/card\('plus', 'Tus capturas'/.test(render));
  assert.doesNotMatch(render, /card\('star', 'Prioridades de hoy'/);
  assert.match(render, /Más adelante · Fase 2/);
  assert.match(render, /no hay una fuente de prioridades/);
  assert.match(css, /\.ns-inicio \.ns-aviso/);
});

test('F1k: cada tarjeta de Inicio explica qué hace; Agenda bloqueada usa .unlocked y el rosa de Tinta Rosa es el tenue', () => {
  const render = src.slice(src.indexOf('export function renderInicio'), src.indexOf('function abrirInicio'));
  assert.match(render, /ns-para/);
  assert.match(render, /Bloqueada: toca para desbloquear con tu clave/);
  assert.match(render, /Desbloquear con tu clave/);
  assert.match(render, /mandoEstaAbierto\(\$\('#mando-status'\)\)/);
  assert.match(render, /Solo informa el estado de la oficina/);
  assert.match(css, /\.ns-inicio \.ns-btn\.tr\{[^}]*rgba\(201,54,144,\.78\)/);
  assert.match(css, /\.ns-inicio \.ns-tr\{[^}]*rgba\(201,54,144,\.70\)/);
  assert.match(css, /\.ns-inicio \.ns-tr \.ns-ic\{[^}]*rgba\(201,54,144,\.12\)/);
});

test('F1k: al desbloquear el mando desde Inicio se vuelve a Inicio (bug 2)', () => {
  assert.equal(debeVolverAInicioTrasMando({solicitadoDesdeInicio: true, desbloqueado: true}), true);
  assert.equal(debeVolverAInicioTrasMando({solicitadoDesdeInicio: true, desbloqueado: false}), false);
  assert.equal(debeVolverAInicioTrasMando({solicitadoDesdeInicio: false, desbloqueado: true}), false);
  assert.equal(debeVolverAInicioTrasMando({}), false);
  assert.match(src, /volverInicioTrasMando = true/);
  assert.match(src, /#mando-dialog'\)\?\.addEventListener\('close'/);
  assert.match(src, /if \(volver\) abrirInicio\(\)/);
});

test('F1l: Inicio no desborda en horizontal: la retícula puede encoger y el formulario y los badges caben', () => {
  const start = css.indexOf('/* f1l:');
  const end = css.indexOf('/* ===== f1i', start);
  const block = css.slice(start, end > start ? end : undefined);
  assert.match(block, /\.ns-inicio \.ns-grid\{[^}]*grid-template-columns:minmax\(0,\s*1fr\)/);
  assert.match(block, /@media \(min-width:761px\)\{\.ns-inicio \.ns-grid\{grid-template-columns:repeat\(3,minmax\(0,\s*1fr\)\)\}\}/);
  assert.match(block, /\.ns-inicio \.ns-card\{[^}]*min-width:0/);
  assert.match(block, /\.ns-inicio \.ns-ch\{[^}]*min-width:0/);
  assert.match(block, /\.ns-inicio \.ns-qc[^{]*\{[^}]*min-width:0/);
  assert.match(block, /\.ns-inicio \.ns-in[^{]*\{[^}]*min-width:0/);
  assert.match(block, /\.ns-inicio \.ns-chip\{[^}]*min-width:0/);
  assert.match(block, /\.ns-inicio \.ns-btn\{[^}]*max-width:100%/);
  assert.doesNotMatch(block, /grid-template-columns:\s*1fr\s*[;}]/);
});
