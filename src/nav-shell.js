/**
 * Fase 1 (plan maestro, OK de Rob t473u): navegación única de 11 módulos.
 * - Menú oculto (botón flotante), compacto (iconos) o expandido (iconos + texto); capa encima del 3D,
 *   no cambia el tamaño del canvas ni toca la cámara.
 * - Inicio con vidrio (bocetos 07/08) que solo refleja datos reales ya presentes en la página.
 * - Modo inmersivo con botón de recuperación.
 * Reutiliza las hojas existentes (sheets) y los botones existentes; no duplica su lógica.
 * Guarda solo preferencias no sensibles en localStorage; la captura rápida queda solo en este dispositivo.
 */
import {sheets} from './ui-chrome.js';
import './nav-shell.css';
import {modoInicial as modoInicialPuro, pantallaInicial as pantallaInicialPura} from './nav-prefs.js';
import {mandoEstaAbierto, debeVolverAInicioTrasMando} from './mando-abierto.js';
import {estadoModoDios, estadoDia} from './tira-estado.js';

const LS = {modo: 'atelierNavModo', inicio: 'atelierNavInicio', ultimo: 'atelierNavUltimo', capt: 'atelierCapturas', fijo: 'atelierNavFijo'};
const MODOS = ['oculto', 'compacto', 'expandido'];
const I = {
  inicio: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
  oficina: '<rect x="6" y="3" width="12" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
  agentes: '<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 19c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5M15 15.5c2.5-.3 4.5.9 5.5 3.5"/>',
  tareas: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M8 12l3 3 5-6"/>',
  bandeja: '<path d="M4 13l2.5-7h11L20 13v5H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>',
  proyectos: '<path d="M3 7h7l2 2h9v10H3z"/>',
  agenda: '<rect x="4" y="5" width="16" height="15" rx="1"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  automatizaciones: '<path d="M20 12a8 8 0 11-2.3-5.6M20 4v5h-5"/>',
  archivo: '<rect x="4" y="4" width="16" height="6" rx="1"/><rect x="4" y="12" width="16" height="8" rx="1"/><path d="M10 7h4M10 16h4"/>',
  estadisticas: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  configuracion: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  pin: '<path d="M9 4h6l-1 6 3 3H7l3-3z"/><path d="M12 13v7"/>', full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  back: '<path d="M9 14l-4-4 4-4"/><path d="M5 10h9a5 5 0 010 10h-2"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  star: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>', signal: '<path d="M4 18h2M9 18v-4M14 18V9M19 18V5"/>',
  chev: '<path d="M9 6l6 6-6 6"/>', cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
  dia: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"/>',
  noche: '<path d="M20.5 14.5A8.5 8.5 0 019.5 3.5a7 7 0 1011 11z"/>',
  slide: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  candado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  candadoAbierto: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 017.5-2"/>',
  camara: '<path d="M12 4a8 8 0 105.7 2.3M18 3v4h-4"/><circle cx="12" cy="12" r="1.6"/>',
};
const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${I[k] || ''}</svg>`;
export const MODULOS = [
  ['inicio', 'Inicio'], ['oficina', 'Oficina 3D'], ['agentes', 'Agentes'], ['tareas', 'Tareas'], ['bandeja', 'Bandeja de atención'],
  ['proyectos', 'Proyectos'], ['agenda', 'Agenda'], ['automatizaciones', 'Automatizaciones'], ['archivo', 'Archivo y memoria'],
  ['estadisticas', 'Estadísticas'], ['configuracion', 'Configuración'],
];
const MOVIL = ['inicio', 'oficina', 'agentes', 'tareas', 'bandeja'];

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
export function isPhoneNav() { return typeof matchMedia === 'function' && matchMedia('(max-width: 760px), (max-height: 500px)').matches; }
export function modoInicial(store = ls, phone = isPhoneNav()) { return modoInicialPuro(store, phone); }
export function pantallaInicial(store = ls, phone = isPhoneNav()) { return pantallaInicialPura(store, phone); }
const click = id => { const el = document.getElementById(id); if (el) { el.click(); return true; } return false; };
const pushBack = () => { try { history.pushState({atelierBack: Date.now()}, ''); } catch {} };
const waitCount = () => { const b = $('#dock-paneles .wait-badge, .dock-badge'); const n = parseInt(b?.textContent || '0', 10); return b && !b.hidden && n > 0 ? n : 0; };
const trTab = t => { sheets.open('tinta'); setTimeout(() => document.querySelector(`.tr-dialog[open] [data-tab="${t}"]`)?.click(), 30); };
const txt = sel => ($(sel)?.textContent || '').trim();

/* ---- Hubs: cada uno solo enlaza funciones que ya existen, o dice «No disponible». ---- */
function hubs() {
  return {
    oficina: {t: 'Oficina 3D', d: 'Apariencia y controles del edificio', items: [
      ['Ver la oficina', 'Cierra los paneles; la cámara se queda donde estaba', () => { sheets.closeAll(); }],
      ['Luz: Auto · Noche · Día', () => `Ahora: ${txt('#dock-noche .lbl') || 'Auto'}`, () => click('dock-noche'), true],
      ['Vidrios', 'Fachada de vidrio encendida o apagada', () => click('vidrios-toggle'), true],
      ['Restablecer cámara', 'Vuelve a la vista general', () => click('reset'), true],
      ['Modo inmersivo', 'Oculta todo menos un botón para volver', () => setInmersivo(true)],
      ['Galería de avatares', 'El equipo en detalle', () => sheets.open('avatares')],
    ]},
    agentes: {t: 'Agentes', d: 'Directorio y fichas', items: [
      ['Equipo', () => txt('#bot-count') || 'Directorio con búsqueda y filtros', () => sheets.open('equipo')],
      ['Vista lista (sin 3D)', 'Abre la lista ligera', () => click('dock-lista')],
      ['Avatares', 'Identidades', () => sheets.open('avatares')],
    ]},
    bandeja: {t: 'Bandeja de atención', d: 'Lo que espera tu intervención', items: [
      ['Te espera', () => { const n = waitCount(); return n ? `${n} ${n === 1 ? 'asunto' : 'asuntos'} · en el Pizarrón` : 'Nadie espera ahora'; }, () => sheets.open('pizarron')],
      ['Autorizaciones y tareas del mando', 'Centro de mando (solo lectura; requiere mando)', () => sheets.open('consulta')],
      ['Pendientes de Tinta Rosa', 'Registro Tinta Rosa › Pendientes', () => trTab('pendientes'), false, 'tr'],
      ['Aprobar o rechazar desde aquí', 'No disponible: no hay conexión de escritura. Respóndele al agente en su chat.', null],
    ]},
    agenda: {t: 'Agenda', d: 'Pizarrones y programación', items: [
      ['Pizarrón de Ted', 'Agenda de hoy (requiere mando)', () => sheets.open('pizarron')],
      ['Semana de Tinta Rosa', 'Notas y redes programadas', () => sheets.open('tinta'), false, 'tr'],
    ]},
    automatizaciones: {t: 'Automatizaciones', d: 'Solo lectura', items: [
      ['Inventario de rutinas', 'No disponible: todavía no hay una fuente publicada de rutinas. No se muestra nada inventado.', null],
    ]},
    archivo: {t: 'Archivo y memoria', d: 'Documentos y registros', items: [
      ['Archiveros', 'Toca un archivero en cualquier planta de la oficina', () => sheets.closeAll()],
      ['Historial de Tinta Rosa', 'Notas publicadas con fecha y link', () => trTab('historial'), false, 'tr'],
      ['Búsqueda en memorias y conversaciones', 'No disponible por ahora', null],
    ]},
    estadisticas: {t: 'Estadísticas', d: 'Con fecha de corte y fuente', items: [
      ['Resumen y racha', () => `Racha: ${txt('#racha-open .lbl') || '–'}`, () => sheets.open('resumen')],
      ['Estadísticas de Tinta Rosa', 'Último corte disponible', () => trTab('stats'), false, 'tr'],
      ['Productividad de agentes', 'No disponible: aún no hay historial de tareas', null],
    ]},
    configuracion: {t: 'Configuración', d: 'Seguridad, avisos y sistema', items: [
      ['Mando cifrado', () => txt('#mando-status') || 'Desbloquear o bloquear', () => click('mando-unlock')],
      ['Avisos al celular', 'Notificaciones', () => sheets.open('avisos')],
      ['Actualizar datos', 'Vuelve a leer el estado', () => click('refresh-office'), true],
      ['Versión, demostración e instalar', 'Más opciones', () => sheets.open('mas')],
      ['Menú', () => `Ahora: ${state.modo}`, () => ciclarModo(), true],
      ['Pantalla de inicio en este dispositivo', () => (pantallaInicial() === 'inicio' ? 'Inicio' : 'Oficina 3D'), () => { const p = isPhoneNav(); ls.set(LS.inicio + (p ? 'Movil' : 'Escritorio'), pantallaInicial() === 'inicio' ? 'oficina' : 'inicio'); }, true],
    ]},
  };
}

const state = {modo: 'oculto', abierto: false, activo: 'oficina', inmersivo: false, opener: null, hub: null};
const navStack = [];
let root, drawer, fab, rail, hubEl, inicioEl, scrim, salir, luzBtn, tabbar, tabMenu, tabDios, tabLuz, camBtn;

function aplicarModo() {
  document.body.dataset.navModo = state.modo;
  rail.hidden = state.modo === 'oculto' || state.inmersivo;
  rail.classList.toggle('ns-exp', state.modo === 'expandido');
  fab.hidden = state.modo !== 'oculto' || state.inmersivo;
}
function ciclarModo() {
  const i = (MODOS.indexOf(state.modo) + 1) % MODOS.length;
  setModo(MODOS[i]);
}
export function setModo(m) {
  if (!MODOS.includes(m)) return;
  state.modo = m; ls.set(LS.modo + (isPhoneNav() ? 'Movil' : 'Escritorio'), m); aplicarModo(); renderNav();
}

function navItems(lista, {chev = false} = {}) {
  const n = waitCount();
  return lista.map(([id, label]) => `<button type="button" class="ns-item${state.activo === id ? ' on' : ''}" data-mod="${id}" title="${esc(label)}" aria-label="${esc(label)}${id === 'bandeja' && n ? ` · ${n} te esperan` : ''}">${svg(id)}<span class="ns-lbl">${esc(label)}</span>${id === 'bandeja' ? `<em class="ns-badge wait-badge"${n ? '' : ' hidden'}>${n || ''}</em>` : ''}${chev ? `<span class="ns-chev" aria-hidden="true">${svg('chev')}</span>` : ''}</button>`).join('');
}
/* f1g (OK de Rob t496s2245): «Más módulos» deja de ser carrusel; mismas filas que arriba, debajo de Bandeja.
   «MÁS MÓDULOS» queda solo como separador y la lista hace scroll vertical dentro del menú. */
function masFilas() {
  const extras = MODULOS.filter(([id]) => !MOVIL.includes(id));
  return `<div class="ns-mas-sep" role="presentation"><span class="ns-eyebrow">Más módulos</span></div>${navItems(extras, {chev: true})}`;
}
function renderNav() {
  const phone = isPhoneNav();
  const lista = phone ? MODULOS.filter(([id]) => MOVIL.includes(id)) : MODULOS;
  drawer.querySelector('.ns-list').innerHTML = navItems(lista, {chev: true}) + (phone ? masFilas() : '');
  rail.querySelector('.ns-list').innerHTML = navItems(MODULOS);
  drawer.querySelector('[data-act=fijar]')?.setAttribute('aria-pressed', String(ls.get(LS.fijo, '0') === '1'));
  const n = waitCount();
  for (const host of [fab, tabMenu]) {
    const dot = host?.querySelector('.ns-dot');
    if (dot) { dot.textContent = n ? String(n) : ''; dot.hidden = !n; }
  }
}
function playEnter(el) {
  if (!el) return;
  el.classList.add('ns-enter');
  el.hidden = false;
  void el.offsetWidth;
  requestAnimationFrame(() => el.classList.remove('ns-enter'));
}

function syncScrim() { scrim.hidden = !(state.abierto || !hubEl.hidden); }
function cerrarTodoPorFuera() {
  navStack.length = 0;
  globalThis.__atelierSwallowPickAt = performance.now();
  sheets.closeAll();
  cerrarHub();
  cerrarMenu();
  cerrarInicio();
  syncScrim();
}
function abrirMenu(opener) {
  state.opener = opener || document.activeElement; state.abierto = true;
  renderNav(); root.classList.add('ns-open'); playEnter(drawer); syncScrim();
  fab.setAttribute('aria-expanded', 'true'); tabMenu?.setAttribute('aria-expanded', 'true'); pushBack();
  const lst = drawer.querySelector('.ns-list'); if (lst) lst.scrollTop = 0;
  const foco = drawer.querySelector('.ns-item.on, .ns-item');
  foco?.focus({preventScroll: true});
  if (foco && lst && foco.offsetTop + foco.offsetHeight > lst.clientHeight) foco.scrollIntoView({block: 'nearest'});
}
function cerrarMenu() {
  if (!state.abierto) return;
  state.abierto = false; drawer.hidden = true; root.classList.remove('ns-open'); syncScrim();
  fab.setAttribute('aria-expanded', 'false'); tabMenu?.setAttribute('aria-expanded', 'false');
  try { (state.opener && document.contains(state.opener) ? state.opener : fab).focus({preventScroll: true}); } catch {}
}

function recordar(id) { ls.set(LS.ultimo, JSON.stringify({mod: id, ts: Date.now()})); }
export function irA(id, {from} = {}) {
  const veníaDeMenu = state.abierto;
  state.activo = id; recordar(id);
  if (from) navStack.push(from);
  else if (veníaDeMenu) navStack.push({type: 'nav'});
  if (ls.get(LS.fijo, '0') !== '1') sheets.close('nav'); else renderNav();
  switch (id) {
    case 'inicio': sheets.open('inicio'); break;
    case 'proyectos': sheets.open('proyectos'); break;
    case 'tareas': sheets.open('consulta'); break;
    default: abrirHub(id);
  }
  renderNav();
}

function abrirHub(id) {
  const h = hubs()[id]; if (!h) return;
  state.hub = id;
  hubEl.innerHTML = `<div class="ns-head">${navStack.length ? `<button type="button" class="ns-x ns-back" data-act="volver" aria-label="Volver">${svg('back')}</button>` : ''}<span class="ns-ic">${svg(id)}</span><div><h2>${esc(h.t)}</h2><p>${esc(h.d)}</p></div><button type="button" class="ns-x" data-act="cerrar-hub" aria-label="Cerrar">${svg('x')}</button></div>
  <div class="ns-hub-list">${h.items.map(([t, d, fn, keep, cls], i) => `<button type="button" class="ns-hub-item${cls ? ' ns-' + cls : ''}" data-i="${i}"${fn ? '' : ' disabled aria-disabled="true"'}><span><b>${esc(t)}${cls === 'tr' ? '<em class="ns-tr-pill">Revista</em>' : ''}</b><small>${esc(typeof d === 'function' ? d() : d)}</small></span>${fn ? `<span class="ns-chev" aria-hidden="true">${svg('chev')}</span>` : '<em class="ns-nd">No disponible</em>'}</button>`).join('')}</div>`;
  sheets.closeAll('hub');
  hubEl.classList.add('open'); playEnter(hubEl); syncScrim(); pushBack();
  hubEl.querySelector('.ns-hub-item:not([disabled])')?.focus({preventScroll: true});
}
function cerrarHub() { hubEl.hidden = true; hubEl.classList.remove('open'); state.hub = null; syncScrim(); }

/* ---- Inicio ---- */
function ultimo() { try { return JSON.parse(ls.get(LS.ultimo, 'null')); } catch { return null; } }
function capturas() { try { const a = JSON.parse(ls.get(LS.capt, '[]')); return Array.isArray(a) ? a : []; } catch { return []; } }
const hace = ts => { const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? 'hace un momento' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
function saludo(d = new Date()) { const h = d.getHours(); return h < 5 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; }
function fechaLarga(d = new Date()) {
  try { const s = d.toLocaleDateString('es-MX', {weekday: 'long', day: 'numeric', month: 'long'}); return s.charAt(0).toUpperCase() + s.slice(1); } catch { return ''; }
}
function card(emo, t, body, extra = '') { return `<section class="ns-card"><div class="ns-ch"><span class="ns-emo" aria-hidden="true">${emo}</span><h3>${t}</h3>${extra}</div>${body}</section>`; }
const chip = (cls, t) => `<span class="ns-chip ns-c-${cls}">${esc(t)}</span>`;
let avisoNota = false;
let volverInicioTrasMando = false;
export function renderInicio() {
  const n = waitCount(); const u = ultimo(); const caps = capturas().slice().reverse();
  const nombre = Object.fromEntries(MODULOS);
  const src = txt('#source-label') || 'Sin datos'; const sig = txt('#last-signal') || 'ninguna';
  const conectado = /vivo/i.test(src) && !/sin conexi/i.test(src);
  const mandoAbierto = mandoEstaAbierto($('#mando-status'));
  const showAviso = avisoNota; avisoNota = false;
  const listaNotas = caps.length
    ? `<ul class="ns-caps">${caps.map(c => `<li><span>${esc(c.t)}</span><small>${hace(c.ts)}</small></li>`).join('')}</ul><div class="ns-row-btns"><button type="button" class="ns-btn" data-act="borrar-capturas">Borrar notas de este celular</button></div>`
    : '';
  const aviso = showAviso
    ? '<div class="ns-aviso on" role="status"><b>Guardada en este celular.</b> Nadie más la ve. Tus notas están aquí abajo.</div>'
    : '';
  const quede = u && nombre[u.mod] && u.mod !== 'inicio'
    ? `<p class="ns-para">Recuerda el último módulo que abriste en este teléfono, para retomarlo. No guarda tus notas.</p><p class="ns-t">${esc(nombre[u.mod])}</p><p class="ns-s">Lo abriste ${hace(u.ts)} en este dispositivo</p><div class="ns-row-btns"><button type="button" class="ns-btn p" data-go="${esc(u.mod)}">Retomar</button></div>`
    : '<p class="ns-para">Recuerda el último módulo que abriste en este teléfono, para retomarlo. No guarda tus notas.</p><p class="ns-t">Aún no has abierto otro módulo</p><p class="ns-s">Cuando abras Agenda, Tareas u otro módulo, aquí aparecerá un botón para volver a él.</p>';
  const espera = n
    ? `<p class="ns-para">Lo que un agente te deja pendiente de aprobación, según el estado en vivo de la oficina. Si hay algo, el botón abre la Bandeja.</p><p class="ns-t">${n} ${n === 1 ? 'agente te espera' : 'agentes te esperan'}</p><p class="ns-s">Según el estado en vivo de la oficina</p><div class="ns-row-btns"><button type="button" class="ns-btn p" data-go="bandeja">Abrir Bandeja</button></div>`
    : '<p class="ns-para">Lo que un agente te deja pendiente de aprobación, según el estado en vivo de la oficina. Si hay algo, el botón abre la Bandeja.</p><p class="ns-t">Nadie te espera ahora</p><p class="ns-s">Puedes abrir la Bandeja de todas formas para revisarla.</p><div class="ns-row-btns"><button type="button" class="ns-btn" data-go="bandeja">Abrir Bandeja</button></div>';
  const agenda = mandoAbierto
    ? '<p class="ns-para">Tu agenda del día está en el Pizarrón de Ted. El botón abre la Agenda.</p><p class="ns-s">El mando ya está abierto en este teléfono.</p><div class="ns-row-btns"><button type="button" class="ns-btn" data-go="agenda">Abrir Agenda</button></div>'
    : '<p class="ns-para">Tu agenda del día está protegida. Para verla, desbloquéala con tu clave de mando.</p><p class="ns-t">Bloqueada: toca para desbloquear con tu clave</p><p class="ns-s">Al desbloquear, se abre el mando y luego regresas aquí para ver el Pizarrón.</p><div class="ns-row-btns"><button type="button" class="ns-btn p" data-act="mando">Desbloquear con tu clave</button></div>';
  inicioEl.innerHTML = `<div class="ns-ini">
  <div class="ns-ini-top"><div><h2 class="ns-hello">${saludo()}</h2><p class="ns-sub">${esc(fechaLarga())}${n ? ` · <span class="ns-pink">${n} ${n === 1 ? 'asunto espera' : 'asuntos esperan'} tu OK</span>` : ''}</p></div>
   <div class="ns-ini-acts">${state.modo === 'oculto' ? `<button type="button" class="ns-x ns-ini-menu" data-act="menu-desde-inicio" aria-label="Abrir menú">${svg('menu')}</button>` : ''}<button type="button" class="ns-x" data-act="cerrar-inicio" aria-label="Cerrar Inicio">${svg('x')}</button></div></div>
  <div class="ns-grid">
  ${card('📝', 'Notas rápidas', `<p class="ns-para">Para apuntar una idea o un pendiente. Al guardar, aparece aquí abajo. No se envía a nadie ni sale de este teléfono.</p><form class="ns-qc" data-act="captura"><label class="ns-in">${svg('plus')}<input name="t" maxlength="280" autocomplete="off" placeholder="Escribe una nota" aria-label="Nota rápida"></label><button class="ns-btn p" type="submit">Guardar</button></form>${aviso}${listaNotas}`, chip('mut', 'Solo en este celular'))}
  ${card('🔖', '¿En qué me quedé?', quede)}
  ${card('✅', 'Espera tu OK', espera, n ? chip('wait', 'Te espera') : chip('ok', 'Al día'))}
  ${card('📅', 'Agenda inmediata', agenda, mandoAbierto ? '' : chip('mut', 'Bloqueada'))}
  ${card('📶', 'Conexión', `<p class="ns-para">Solo informa el estado de la oficina. No abre ningún menú.</p><p class="ns-t">${esc(src)}</p><p class="ns-s">Última señal: ${esc(sig)}</p>`, conectado ? chip('ok', 'Conectado') : chip('wait', 'Revisar'))}
  <section class="ns-card ns-tr"><div class="ns-ch"><img class="ns-emo ns-tr-logo" src="${((typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './').replace(/\/?$/, '/')}tinta-rosa-logo-icono-96.png" width="20" height="20" alt="Tinta Rosa"><h3>Tinta Rosa</h3></div><p class="ns-para">Semana, historial, pendientes y estadísticas de la revista. El botón abre el Registro.</p><div class="ns-row-btns"><button type="button" class="ns-btn tr" data-act="tinta">Abrir Registro</button></div></section>
  <section class="ns-card ns-of"><div class="ns-ch"><span class="ns-emo" aria-hidden="true">🏢</span><h3>Oficina 3D</h3></div><p class="ns-para">Vuelve al edificio o abre el resumen completo de la oficina.</p><p class="ns-s">${esc(txt('#bot-count') || '16 bots')}</p><div class="ns-row-btns"><button type="button" class="ns-btn p" data-act="cerrar-inicio">Ver la oficina</button><button type="button" class="ns-btn" data-act="resumen">Resumen completo</button></div></section>
  <details class="ns-card ns-later"><summary>Más adelante · Fase 2</summary><p><b>Prioridades de hoy</b> no aparece como tarjeta porque todavía no hay una fuente de prioridades. Llega con Tareas y Bandeja en la Fase 2.</p></details>
  </div></div>`;
}
function abrirInicio() { renderInicio(); sheets.closeAll('inicio'); inicioEl.hidden = false; inicioEl.classList.add('open'); state.activo = 'inicio'; pushBack(); }
function cerrarInicio() { inicioEl.hidden = true; inicioEl.classList.remove('open'); if (state.activo === 'inicio') state.activo = 'oficina'; renderNav(); }

/* ---- Inmersivo ---- */
export function setInmersivo(on) {
  state.inmersivo = !!on; document.body.classList.toggle('ns-inmersivo', state.inmersivo);
  salir.hidden = !state.inmersivo; if (on) { sheets.closeAll(); cerrarMenu(); }
  aplicarModo(); if (on) salir.focus({preventScroll: true});
}

function stopper(el) { for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'wheel']) el.addEventListener(ev, e => e.stopPropagation(), {passive: true}); }

export function mountNavShell() {
  if (document.getElementById('ns-root')) return;
  document.body.classList.add('ns-on');
  root = document.createElement('div'); root.id = 'ns-root'; root.className = 'ns-root';
  root.innerHTML = `
  <div class="ns-scrim" hidden></div>
  <nav id="ns-drawer" class="ns-drawer" hidden aria-label="Menú principal" role="dialog" aria-modal="false">
    <div class="ns-dh"><div class="ns-dh-txt"><span class="ns-eyebrow">Menú · Navegación</span><span class="ns-s">La cámara no se mueve</span></div>
      <div class="ns-dh-acts"><button type="button" class="ns-btn sm" data-act="fijar" aria-pressed="false" title="Fijar menú">${svg('pin')}<span>Fijar</span></button>
      <button type="button" class="ns-x" data-act="cerrar" aria-label="Cerrar menú">${svg('x')}</button></div></div>
    <div class="ns-list"></div>
    <div class="ns-dfoot"><button type="button" class="ns-btn" data-act="inmersivo">${svg('full')}<span>Inmersivo</span></button><button type="button" class="ns-btn" data-act="modo">${svg('menu')}<span>Tipo de menú</span></button></div>
  </nav>
  <nav class="ns-rail" aria-label="Menú principal (lateral)" hidden>
    <div class="ns-list"></div>
    <div class="ns-rail-foot"><button type="button" class="ns-item" data-act="inmersivo" title="Modo inmersivo" aria-label="Modo inmersivo">${svg('full')}<span class="ns-lbl">Inmersivo</span></button>
    <button type="button" class="ns-item" data-act="modo" title="Cambiar tipo de menú" aria-label="Cambiar tipo de menú">${svg('menu')}<span class="ns-lbl">Ocultar / expandir</span></button></div>
  </nav>
  <section class="ns-hub ns-glass" hidden role="dialog" aria-label="Módulo"></section>
  <section class="ns-inicio" hidden role="dialog" aria-label="Inicio"></section>
  <button type="button" class="ns-salir" hidden aria-label="Salir del modo inmersivo">${svg('full')}<span>Mostrar controles</span></button>`;
  document.body.appendChild(root);
  fab = document.createElement('button');
  fab.type = 'button'; fab.className = 'ns-fab';
  fab.setAttribute('aria-label', 'Abrir menú'); fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'ns-drawer');
  fab.innerHTML = `${svg('menu')}<em class="ns-dot wait-badge" hidden></em>`;
  const hdr = $('.chrome-primary');
  if (hdr) hdr.appendChild(fab); else root.prepend(fab); drawer = root.querySelector('.ns-drawer'); rail = root.querySelector('.ns-rail');
  hubEl = root.querySelector('.ns-hub'); inicioEl = root.querySelector('.ns-inicio'); scrim = root.querySelector('.ns-scrim'); salir = root.querySelector('.ns-salir');
  luzBtn = document.createElement('button');
  luzBtn.type = 'button'; luzBtn.className = 'ns-luz';
  const vp = $('#viewport');
  if (vp) vp.appendChild(luzBtn); else root.appendChild(luzBtn);
  /* Fase 1i (boceto 79): tira flotante de abajo (solo móvil vertical por CSS): Menú · Modo dios · Día. */
  tabbar = document.createElement('nav');
  tabbar.id = 'ns-tabbar'; tabbar.className = 'ns-tabbar'; tabbar.setAttribute('aria-label', 'Accesos rápidos');
  tabbar.innerHTML = `
    <button type="button" class="ns-tab ns-tab-menu" data-tab="menu" aria-label="Menú" aria-expanded="false" aria-controls="ns-drawer"><span class="ns-ti">${svg('menu')}</span><span class="ns-tl">Menú</span><em class="ns-dot wait-badge" hidden></em></button>
    <button type="button" class="ns-tab ns-tab-dios" data-tab="dios" aria-pressed="false"><span class="ns-ti"></span><span class="ns-tl">Modo dios</span></button>
    <button type="button" class="ns-tab ns-tab-luz" data-tab="luz"><span class="ns-ti"></span><span class="ns-tl">Auto</span></button>`;
  root.appendChild(tabbar);
  tabMenu = tabbar.querySelector('[data-tab=menu]'); tabDios = tabbar.querySelector('[data-tab=dios]'); tabLuz = tabbar.querySelector('[data-tab=luz]');
  const paintLuz = () => {
    const d = estadoDia(txt('#dock-noche .lbl'), document.documentElement.dataset.theme);
    luzBtn.innerHTML = `${svg(d.icono)}<span>${esc(d.lab)}</span>`;
    luzBtn.setAttribute('aria-label', d.aria);
    luzBtn.title = $('#dock-noche')?.title || `Luz: ${d.lab}`;
    tabLuz.querySelector('.ns-ti').innerHTML = svg(d.icono);
    tabLuz.querySelector('.ns-tl').textContent = d.lab;
    tabLuz.setAttribute('aria-label', d.aria);
    tabLuz.dataset.luz = d.noche ? 'noche' : 'dia';
  };
  paintLuz();
  const paintDios = () => {
    const m = estadoModoDios($('#mando-status'));
    tabDios.querySelector('.ns-ti').innerHTML = svg(m.icono);
    tabDios.querySelector('.ns-tl').textContent = m.etiqueta;
    tabDios.setAttribute('aria-label', m.aria);
    tabDios.title = m.aria;
    tabDios.setAttribute('aria-pressed', String(m.abierto));
    tabDios.dataset.estado = m.estado;
    tabDios.classList.toggle('unlocked', m.abierto);
  };
  paintDios();
  const cambiarLuz = () => { click('dock-noche'); setTimeout(paintLuz, 20); };
  luzBtn.addEventListener('click', cambiarLuz);
  tabLuz.addEventListener('click', cambiarLuz);
  tabDios.addEventListener('click', () => { sheets.closeAll(); click('mando-unlock'); setTimeout(paintDios, 30); });
  const dn = $('#dock-noche');
  if (dn && typeof MutationObserver !== 'undefined') new MutationObserver(paintLuz).observe(dn, {childList: true, subtree: true, attributes: true});
  if (typeof MutationObserver !== 'undefined') new MutationObserver(paintLuz).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
  const ms = $('#mando-status');
  if (ms && typeof MutationObserver !== 'undefined') new MutationObserver(paintDios).observe(ms, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class']});
  /* Cámara: los 4 chips de vistas siempre visibles; girar / acercar / alejar / restablecer detrás de un botón chico. */
  const vt = $('#vista-toolbar'), ctrls = vt?.querySelector('.controls');
  if (vt && ctrls) {
    camBtn = document.createElement('button');
    camBtn.type = 'button'; camBtn.className = 'ns-cams-toggle'; camBtn.id = 'ns-cams-toggle';
    camBtn.setAttribute('aria-label', 'Cámara: girar, acercar, alejar y restablecer'); camBtn.setAttribute('aria-expanded', 'false');
    camBtn.innerHTML = svg('camara');
    vt.insertBefore(camBtn, ctrls);
    camBtn.addEventListener('click', () => {
      const abierto = !vt.classList.contains('cams-open');
      vt.classList.toggle('cams-open', abierto); camBtn.setAttribute('aria-expanded', String(abierto));
    });
    document.addEventListener('pointerdown', e => {
      if (!vt.classList.contains('cams-open')) return;
      if (e.target instanceof Element && e.target.closest('#vista-toolbar .controls, #ns-cams-toggle')) return;
      vt.classList.remove('cams-open'); camBtn.setAttribute('aria-expanded', 'false');
    }, true);
  }
  const alternarMenu = opener => { if (state.abierto) { navStack.length = 0; sheets.close('nav'); } else { navStack.length = 0; sheets.closeAll('nav'); abrirMenu(opener); } };
  tabMenu.addEventListener('click', () => alternarMenu(tabMenu));
  for (const el of [drawer, rail, hubEl, inicioEl, fab, salir, luzBtn, tabbar]) stopper(el);
  /* Tocar fuera (scrim) cierra todo el menú sin dejar caer el toque al 3D ni al botón. */
  let scrimTap = null;
  for (const ev of ['pointerdown', 'touchstart']) scrim.addEventListener(ev, e => {
    e.stopPropagation();
    const pt = e.touches?.[0] || e;
    scrimTap = {x: pt.clientX || 0, y: pt.clientY || 0};
  }, {passive: true});
  scrim.addEventListener('pointerup', e => {
    e.stopPropagation();
    if (scrimTap && Math.hypot((e.clientX || 0) - scrimTap.x, (e.clientY || 0) - scrimTap.y) < 18) {
      scrimTap = null;
      cerrarTodoPorFuera();
    }
  });
  scrim.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); cerrarTodoPorFuera(); });
  /* Tocar fuera de un <dialog> modal (::backdrop) también cierra por completo. */
  document.addEventListener('click', e => {
    const d = e.target;
    if (!(d instanceof HTMLDialogElement) || !d.open) return;
    if (!e.clientX && !e.clientY) return;
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) cerrarTodoPorFuera();
  }, true);
  /* Tocar fuera de hojas (p.ej. Proyectos, Mas, Equipo) limpia la pila para no reabrir al cerrar. */
  document.addEventListener('pointerdown', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('.ns-drawer,.ns-hub,.ns-rail,.ns-fab,.ns-tabbar,.ns-inicio,.glass-sheet,aside.team,.cc-dialog,.resumen-dialog,.avisos-dialog,.tr-dialog,.pizarron-dialog,#mando-dialog,#detail,#ficha-flotante,#avatar-dropdown')) return;
    navStack.length = 0;
  }, true);

  sheets.register('nav', {open: () => abrirMenu(), close: cerrarMenu, isOpen: () => state.abierto});
  sheets.register('inicio', {open: abrirInicio, close: cerrarInicio, isOpen: () => !inicioEl.hidden});
  sheets.register('hub', {open: () => {}, close: cerrarHub, isOpen: () => !hubEl.hidden});

  fab.addEventListener('click', () => alternarMenu(fab));
  salir.addEventListener('click', () => setInmersivo(false));
  root.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t || !root.contains(t)) return;
    if (t.dataset.mod) { irA(t.dataset.mod); return; }
    if (t.dataset.mas) { const m = drawer.querySelector('.ns-more'); if (m) { m.hidden = !m.hidden; t.setAttribute('aria-expanded', String(!m.hidden)); } return; }
    if (t.dataset.go) { const mod = t.dataset.go; cerrarInicio(); irA(mod, {from: {type: 'inicio'}}); return; }
    if (t.classList.contains('ns-hub-item')) {
      const hid = state.hub;
      const h = hubs()[hid]; const it = h?.items[+t.dataset.i]; if (!it || !it[2]) return;
      if (it[3]) { it[2](); setTimeout(() => state.hub && abrirHub(state.hub), 60); }
      else { navStack.push({type: 'hub', id: hid}); cerrarHub(); it[2](); }
      return;
    }
    switch (t.dataset.act) {
      case 'cerrar': navStack.length = 0; sheets.close('nav'); break;
      case 'menu-desde-inicio': navStack.push({type: 'inicio'}); cerrarInicio(); abrirMenu(fab); break;
      case 'volver': {
        const prev = navStack.pop();
        cerrarHub();
        if (prev?.type === 'nav') abrirMenu(fab);
        else if (prev?.type === 'hub') abrirHub(prev.id);
        else if (prev?.type === 'inicio') abrirInicio();
        break;
      }
      case 'fijar': ls.set(LS.fijo, ls.get(LS.fijo, '0') === '1' ? '0' : '1'); renderNav(); break;
      case 'inmersivo': navStack.length = 0; setInmersivo(true); break;
      case 'modo': ciclarModo(); break;
      case 'cerrar-hub': navStack.length = 0; cerrarHub(); break;
      case 'cerrar-inicio': navStack.length = 0; cerrarInicio(); break;
      case 'mando': navStack.push({type: 'inicio'}); volverInicioTrasMando = true; cerrarInicio(); click('mando-unlock'); break;
      case 'tinta': navStack.push({type: 'inicio'}); cerrarInicio(); sheets.open('tinta'); break;
      case 'resumen': navStack.push({type: 'inicio'}); cerrarInicio(); sheets.open('resumen'); break;
      case 'borrar-capturas': ls.set(LS.capt, '[]'); renderInicio(); break;
    }
  });
  root.addEventListener('submit', e => {
    e.preventDefault(); const inp = e.target.querySelector('input'); const v = (inp?.value || '').trim(); if (!v) return;
    const a = capturas(); a.push({t: v.slice(0, 280), ts: Date.now()}); ls.set(LS.capt, JSON.stringify(a.slice(-30))); avisoNota = true; renderInicio(); inicioEl.querySelector('.ns-aviso')?.scrollIntoView({block: 'nearest', behavior: 'smooth'});
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (state.abierto) { e.preventDefault(); sheets.close('nav'); }
    else if (!hubEl.hidden) { e.preventDefault(); cerrarHub(); }
    else if (!inicioEl.hidden) { e.preventDefault(); cerrarInicio(); }
    else if (state.inmersivo) { e.preventDefault(); setInmersivo(false); }
  });
  /* Atrás: tras cerrar la capa superior en history-back, regresa al menú/submenú anterior de la pila. */
  addEventListener('popstate', () => {
    if (state.inmersivo && !sheets.anyOpen() && !navStack.length) { setInmersivo(false); return; }
    if (!navStack.length) return;
    const stillOpen = sheets.anyOpen() || !!document.querySelector('dialog[open]') || document.body.classList.contains('equipo-abierto');
    if (stillOpen) return;
    const prev = navStack.pop();
    if (prev?.type === 'nav') abrirMenu(fab);
    else if (prev?.type === 'hub') abrirHub(prev.id);
    else if (prev?.type === 'inicio') abrirInicio();
  });

  document.querySelector('#mando-dialog')?.addEventListener('close', () => {
    const volver = debeVolverAInicioTrasMando({solicitadoDesdeInicio: volverInicioTrasMando, desbloqueado: mandoEstaAbierto($('#mando-status'))});
    volverInicioTrasMando = false;
    if (volver) abrirInicio();
  });
  state.modo = modoInicial(); aplicarModo(); renderNav();
  let lastPhone = isPhoneNav();
  addEventListener('resize', () => { const p = isPhoneNav(); if (p !== lastPhone) { lastPhone = p; state.modo = modoInicial(); aplicarModo(); renderNav(); } });
  if (pantallaInicial() === 'inicio' && !new URLSearchParams(location.search).has('abrir')) setTimeout(() => { if (!sheets.anyOpen()) abrirInicio(); }, 400);
  globalThis.__atelierNav = {irA, setModo, setInmersivo, state, navStack, cerrarTodoPorFuera};
}
