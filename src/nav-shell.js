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
let root, drawer, fab, rail, hubEl, inicioEl, scrim, salir;

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

function navItems(lista) {
  const n = waitCount();
  return lista.map(([id, label]) => `<button type="button" class="ns-item${state.activo === id ? ' on' : ''}" data-mod="${id}" title="${esc(label)}" aria-label="${esc(label)}${id === 'bandeja' && n ? ` · ${n} te esperan` : ''}">${svg(id)}<span class="ns-lbl">${esc(label)}</span>${id === 'bandeja' ? `<em class="ns-badge wait-badge"${n ? '' : ' hidden'}>${n || ''}</em>` : ''}</button>`).join('');
}
function renderNav() {
  const phone = isPhoneNav();
  const lista = phone ? MODULOS.filter(([id]) => MOVIL.includes(id)) : MODULOS;
  drawer.querySelector('.ns-list').innerHTML = navItems(lista) + (phone ? `<button type="button" class="ns-item" data-mas="1">${svg('menu')}<span class="ns-lbl">Más: Proyectos, Agenda, Archivo…</span></button><div class="ns-more" hidden>${navItems(MODULOS.filter(([id]) => !MOVIL.includes(id)))}</div>` : '');
  rail.querySelector('.ns-list').innerHTML = navItems(MODULOS);
  drawer.querySelector('[data-act=fijar]')?.setAttribute('aria-pressed', String(ls.get(LS.fijo, '0') === '1'));
}

function abrirMenu(opener) {
  state.opener = opener || document.activeElement; state.abierto = true;
  renderNav(); root.classList.add('ns-open'); drawer.hidden = false; scrim.hidden = false;
  fab.setAttribute('aria-expanded', 'true'); pushBack();
  drawer.querySelector('.ns-item.on, .ns-item')?.focus({preventScroll: true});
}
function cerrarMenu() {
  if (!state.abierto) return;
  state.abierto = false; drawer.hidden = true; scrim.hidden = true; root.classList.remove('ns-open');
  fab.setAttribute('aria-expanded', 'false');
  try { (state.opener && document.contains(state.opener) ? state.opener : fab).focus({preventScroll: true}); } catch {}
}

function recordar(id) { ls.set(LS.ultimo, JSON.stringify({mod: id, ts: Date.now()})); }
export function irA(id) {
  state.activo = id; recordar(id);
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
  hubEl.innerHTML = `<div class="ns-head"><span class="ns-ic">${svg(id)}</span><div><h2>${esc(h.t)}</h2><p>${esc(h.d)}</p></div><button type="button" class="ns-x" data-act="cerrar-hub" aria-label="Cerrar">${svg('x')}</button></div>
  <div class="ns-hub-list">${h.items.map(([t, d, fn, keep, cls], i) => `<button type="button" class="ns-hub-item${cls ? ' ns-' + cls : ''}" data-i="${i}"${fn ? '' : ' disabled aria-disabled="true"'}><span><b>${esc(t)}</b><small>${esc(typeof d === 'function' ? d() : d)}</small></span>${fn ? svg('chev') : '<em class="ns-nd">No disponible</em>'}</button>`).join('')}</div>`;
  sheets.closeAll('hub');
  hubEl.hidden = false; hubEl.classList.add('open'); pushBack();
  hubEl.querySelector('.ns-hub-item:not([disabled])')?.focus({preventScroll: true});
}
function cerrarHub() { hubEl.hidden = true; hubEl.classList.remove('open'); state.hub = null; }

/* ---- Inicio ---- */
function ultimo() { try { return JSON.parse(ls.get(LS.ultimo, 'null')); } catch { return null; } }
function capturas() { try { const a = JSON.parse(ls.get(LS.capt, '[]')); return Array.isArray(a) ? a : []; } catch { return []; } }
const hace = ts => { const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? 'hace un momento' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
function saludo(d = new Date()) { const h = d.getHours(); return h < 5 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; }
function fechaLarga(d = new Date()) {
  try { const s = d.toLocaleDateString('es-MX', {weekday: 'long', day: 'numeric', month: 'long'}); return s.charAt(0).toUpperCase() + s.slice(1); } catch { return ''; }
}
function card(ic, t, body, extra = '') { return `<section class="ns-card"><div class="ns-ch"><span class="ns-ic">${svg(ic)}</span><h3>${t}</h3>${extra}</div>${body}</section>`; }
const chip = (cls, t) => `<span class="ns-chip ns-c-${cls}">${esc(t)}</span>`;
export function renderInicio() {
  const n = waitCount(); const u = ultimo(); const caps = capturas().slice(-3).reverse();
  const nombre = Object.fromEntries(MODULOS);
  const src = txt('#source-label') || 'Sin datos'; const sig = txt('#last-signal') || 'ninguna';
  const conectado = /vivo/i.test(src) && !/sin conexi/i.test(src);
  const mando = txt('#mando-status'); const mandoAbierto = /abierto|desbloq/i.test(mando) && !/bloqueado/i.test(mando);
  inicioEl.innerHTML = `<div class="ns-ini">
  <div class="ns-ini-top"><div><h2 class="ns-hello">${saludo()}</h2><p class="ns-sub">${esc(fechaLarga())}${n ? ` · <span class="ns-pink">${n} ${n === 1 ? 'asunto espera' : 'asuntos esperan'} tu OK</span>` : ''}</p></div>
   <button type="button" class="ns-x" data-act="cerrar-inicio" aria-label="Cerrar Inicio">${svg('x')}</button></div>
  <form class="ns-qc" data-act="captura"><label class="ns-in">${svg('plus')}<input name="t" maxlength="280" autocomplete="off" placeholder="Captura rápida: idea, pendiente o instrucción…" aria-label="Captura rápida"></label><button class="ns-btn p" type="submit">Guardar</button></form>
  <p class="ns-note">La captura rápida se guarda solo en este dispositivo; no se envía a nadie.</p>
  <div class="ns-grid">
  ${card('back', '¿En qué me quedé?', u && nombre[u.mod] && u.mod !== 'inicio'
    ? `<p class="ns-t">${esc(nombre[u.mod])}</p><p class="ns-s">Lo abriste ${hace(u.ts)} en este dispositivo</p><div class="ns-row-btns"><button type="button" class="ns-btn p" data-go="${esc(u.mod)}">Retomar</button></div>`
    : '<p class="ns-s">Todavía no hay nada guardado en este dispositivo.</p>')}
  ${card('bandeja', 'Espera tu OK', n
    ? `<p class="ns-t">${n} ${n === 1 ? 'agente te espera' : 'agentes te esperan'}</p><p class="ns-s">Según el estado en vivo de la oficina</p><div class="ns-row-btns"><button type="button" class="ns-btn p" data-go="bandeja">Abrir Bandeja</button></div>`
    : `<p class="ns-t">Nadie te espera ahora</p><p class="ns-s">Según el estado en vivo de la oficina</p>`, n ? chip('wait', 'Te espera') : chip('ok', 'Al día'))}
  ${card('star', 'Prioridades de hoy', '<p class="ns-s">No disponible todavía: no hay una fuente de prioridades. Llega con Tareas y Bandeja (Fase 2).</p>', chip('mut', 'No disponible'))}
  ${card('agenda', 'Agenda inmediata', mandoAbierto
    ? '<p class="ns-s">Tu agenda está en el Pizarrón de Ted.</p><div class="ns-row-btns"><button type="button" class="ns-btn" data-go="agenda">Abrir Agenda</button></div>'
    : '<p class="ns-s">Protegida: abre el mando para verla.</p><div class="ns-row-btns"><button type="button" class="ns-btn" data-act="mando">Abrir mando</button></div>', mandoAbierto ? '' : chip('mut', 'Bloqueada'))}
  ${caps.length ? card('plus', 'Tus capturas', `<ul class="ns-caps">${caps.map(c => `<li><span>${esc(c.t)}</span><small>${hace(c.ts)}</small></li>`).join('')}</ul><div class="ns-row-btns"><button type="button" class="ns-btn" data-act="borrar-capturas">Borrar capturas</button></div>`, chip('mut', 'Solo aquí')) : ''}
  ${card('signal', 'Conexión', `<p class="ns-t">${esc(src)}</p><p class="ns-s">Última señal: ${esc(sig)}</p>`, conectado ? chip('ok', 'Conectado') : chip('wait', 'Revisar'))}
  <section class="ns-card ns-tr"><div class="ns-ch"><span class="ns-ic">${svg('agenda')}</span><h3>Tinta Rosa</h3></div><p class="ns-s">Semana, historial, pendientes y estadísticas</p><div class="ns-row-btns"><button type="button" class="ns-btn tr" data-act="tinta">Abrir Registro</button></div></section>
  <section class="ns-card ns-of"><div class="ns-ch"><span class="ns-ic">${svg('cube')}</span><h3>Oficina 3D</h3></div><p class="ns-s">${esc(txt('#bot-count') || '16 bots')}</p><div class="ns-row-btns"><button type="button" class="ns-btn p" data-act="cerrar-inicio">Ver la oficina</button><button type="button" class="ns-btn" data-act="resumen">Resumen completo</button></div></section>
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
  <button type="button" class="ns-fab" aria-label="Abrir menú" aria-expanded="false" aria-controls="ns-drawer">${svg('menu')}<em class="ns-dot wait-badge" hidden></em></button>
  <div class="ns-scrim" hidden></div>
  <nav id="ns-drawer" class="ns-drawer" hidden aria-label="Menú principal" role="dialog" aria-modal="false">
    <div class="ns-dh"><b>Menú</b><span class="ns-s">La cámara no se mueve</span>
      <button type="button" class="ns-btn sm" data-act="fijar" aria-pressed="false" title="Fijar menú">${svg('pin')}<span>Fijar</span></button>
      <button type="button" class="ns-x" data-act="cerrar" aria-label="Cerrar menú">${svg('x')}</button></div>
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
  fab = root.querySelector('.ns-fab'); drawer = root.querySelector('.ns-drawer'); rail = root.querySelector('.ns-rail');
  hubEl = root.querySelector('.ns-hub'); inicioEl = root.querySelector('.ns-inicio'); scrim = root.querySelector('.ns-scrim'); salir = root.querySelector('.ns-salir');
  for (const el of [drawer, rail, hubEl, inicioEl, fab, salir]) stopper(el);
  /* Tocar fuera cierra la capa sin que el toque llegue al 3D. */
  for (const ev of ['pointerdown', 'touchstart']) scrim.addEventListener(ev, e => { e.stopPropagation(); e.preventDefault?.(); sheets.close('nav'); }, {passive: false});

  sheets.register('nav', {open: () => abrirMenu(), close: cerrarMenu, isOpen: () => state.abierto});
  sheets.register('inicio', {open: abrirInicio, close: cerrarInicio, isOpen: () => !inicioEl.hidden});
  sheets.register('hub', {open: () => {}, close: cerrarHub, isOpen: () => !hubEl.hidden});

  fab.addEventListener('click', () => (state.abierto ? sheets.close('nav') : (sheets.closeAll('nav'), abrirMenu(fab))));
  salir.addEventListener('click', () => setInmersivo(false));
  root.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t || !root.contains(t)) return;
    if (t.dataset.mod) { irA(t.dataset.mod); return; }
    if (t.dataset.mas) { const m = drawer.querySelector('.ns-more'); if (m) { m.hidden = !m.hidden; t.setAttribute('aria-expanded', String(!m.hidden)); } return; }
    if (t.dataset.go) { cerrarInicio(); irA(t.dataset.go); return; }
    if (t.classList.contains('ns-hub-item')) {
      const h = hubs()[state.hub]; const it = h?.items[+t.dataset.i]; if (!it || !it[2]) return;
      if (it[3]) { it[2](); setTimeout(() => state.hub && abrirHub(state.hub), 60); } else { cerrarHub(); it[2](); }
      return;
    }
    switch (t.dataset.act) {
      case 'cerrar': sheets.close('nav'); break;
      case 'fijar': ls.set(LS.fijo, ls.get(LS.fijo, '0') === '1' ? '0' : '1'); renderNav(); break;
      case 'inmersivo': setInmersivo(true); break;
      case 'modo': ciclarModo(); break;
      case 'cerrar-hub': cerrarHub(); break;
      case 'cerrar-inicio': cerrarInicio(); break;
      case 'mando': cerrarInicio(); click('mando-unlock'); break;
      case 'tinta': cerrarInicio(); sheets.open('tinta'); break;
      case 'resumen': cerrarInicio(); sheets.open('resumen'); break;
      case 'borrar-capturas': ls.set(LS.capt, '[]'); renderInicio(); break;
    }
  });
  root.addEventListener('submit', e => {
    e.preventDefault(); const inp = e.target.querySelector('input'); const v = (inp?.value || '').trim(); if (!v) return;
    const a = capturas(); a.push({t: v.slice(0, 280), ts: Date.now()}); ls.set(LS.capt, JSON.stringify(a.slice(-30))); renderInicio();
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (state.abierto) { e.preventDefault(); sheets.close('nav'); }
    else if (!hubEl.hidden) { e.preventDefault(); cerrarHub(); }
    else if (!inicioEl.hidden) { e.preventDefault(); cerrarInicio(); }
    else if (state.inmersivo) { e.preventDefault(); setInmersivo(false); }
  });
  /* Atrás: history-back cierra cualquier hoja registrada (incluye nav, hub e inicio). En inmersivo, Atrás lo quita. */
  addEventListener('popstate', () => { if (state.inmersivo && !sheets.anyOpen()) setInmersivo(false); });

  state.modo = modoInicial(); aplicarModo(); renderNav();
  let lastPhone = isPhoneNav();
  addEventListener('resize', () => { const p = isPhoneNav(); if (p !== lastPhone) { lastPhone = p; state.modo = modoInicial(); aplicarModo(); renderNav(); } });
  if (pantallaInicial() === 'inicio' && !new URLSearchParams(location.search).has('abrir')) setTimeout(() => { if (!sheets.anyOpen()) abrirInicio(); }, 400);
  globalThis.__atelierNav = {irA, setModo, setInmersivo, state};
}
