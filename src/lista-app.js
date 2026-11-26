/** Vista Solo lista — sin Three/WebGL. */
import './style.css';
import {bindSwipeToClose} from './ui-sheets.js';
import {mountReleaseNotice} from './release-notice.js';
import {bots as catalog, floors, disconnectedSnapshot, statusLabels} from './data.js';
import {botProfile} from './roster.js';
import {dedupeFactRows} from './text-clip.js';
import {readSnapshot} from './adapter.js';
import {SOURCE_CONTRACT} from './source-contract.js';
import {createMandoSession} from './mando-session.js';
import {DEPARTMENTS, departmentOf} from './departments.js';
import {filterWaiting, isPostponed, postpone} from './local-waiting.js';
import {getNote, setNote} from './local-notes.js';
import {QUICK_REPLIES, chatHref, copyAndOpenChat} from './quick-replies.js';
import {mountResumenPanel, rachaText} from './resumen-panel.js';
import {mountStaleBanner} from './stale-banner.js';
import {avatarPhotoUrl} from './avatar-photo.js';
import {readLightPref, isNightHour, horaChihuahua} from './daylight.js';
import {loadUsoEnc, getUsoState, setUsoState, displayUsoLine, formatActualizado, onUsoChange} from './uso-feed.js';

mountReleaseNotice();
document.body.classList.add('lista-mode');
if (readLightPref() === 'noche' || (readLightPref() === 'auto' && isNightHour(horaChihuahua()))) {
  document.documentElement.dataset.theme = 'night';
  document.body.classList.add('noche');
}

const app = document.getElementById('app');
if (app) app.hidden = true;

const main = document.createElement('main');
main.id = 'lista-root';
main.innerHTML = `
  <header class="lista-header sj-lh">
    <div class="sj-lh-top">
      <button type="button" id="lista-back" class="lista-back sj-x" aria-label="Atrás"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button>
      <div class="sj-lh-t"><p class="eyebrow">San Junipero Corp</p><strong>Solo lista</strong></div>
      <span id="lista-source" class="sj-chip sj-live">Conectando…</span>
    </div>
    <div id="lista-counters" class="l16k sj-cnts" role="toolbar"></div>
    <div class="sj-lh-act">
      <button type="button" id="lista-resumen" class="btn-slim sj-mini">Resumen</button>
      <span id="lista-racha" class="racha-pill sj-mini" title="Racha" role="status">Racha –</span>
      <button type="button" id="lista-to-3d" class="sj-mini" title="Ver la oficina en 3D">Oficina 3D</button>
      <button type="button" id="lista-mando" class="sj-mini">Desbloquear mando</button>
    </div>
  </header>
  <div id="lista-stale-slot"></div>
  <p id="lista-meta" class="muted"></p>
  <div id="lista-body"></div>
  <p class="muted l16pie">Vista ligera sin 3D. Para volver a la oficina toca “← Atrás” o el gesto atrás del teléfono.</p>
`;
document.body.appendChild(main);

const stale = mountStaleBanner(document.getElementById('lista-stale-slot') || main);
let snapshot = disconnectedSnapshot();
let filtro = null;
const mandoSession = createMandoSession({onChange: () => { enrich(); refreshUso(); paint(); }});

async function refreshUso() {
  if (!mandoSession.unlocked || !mandoSession.key) {
    setUsoState({state: 'locked', uso: null});
    return;
  }
  const next = await loadUsoEnc({key: mandoSession.key});
  setUsoState(next);
}

function enrich() {
  if (snapshot.mode !== 'live') return;
  snapshot = {
    ...snapshot,
    bots: snapshot.bots.map(b => mandoSession.enrichBot(b)),
    mandoUnlocked: mandoSession.unlocked,
  };
}

const resumen = mountResumenPanel({
  getSnapshot: () => snapshot,
  getMando: () => (mandoSession.unlocked ? mandoSession.mando : null),
  onChoose: id => openFicha(id),
});
onUsoChange(() => { try { paint(); resumen.refresh?.(); } catch {} });

function counts() {
  const c = {review: 0, working: 0, idle: 0, unknown: 0};
  for (const b of snapshot.bots) {
    if (b.status === 'review' && isPostponed(b)) continue;
    c[b.status] = (c[b.status] || 0) + 1;
  }
  return c;
}

function paint() {
  const c = counts();
  const counters = document.getElementById('lista-counters');
  const items = [
    ['review', c.review === 1 ? 'te espera' : 'te esperan', c.review],
    ['working', 'trabajando', c.working],
    ['idle', 'en pausa', c.idle],
  ];
  counters.innerHTML = items.map(([k, t, n]) =>
    `<button type="button" data-k="${k}" class="sj-cnt${filtro === k ? ' on' : ''}"><i class="sj-dot st-${k}"></i><b>${n}</b> ${t}</button>`).join('');
  document.getElementById('lista-meta').textContent =
    `${snapshot.mode === 'live' ? 'En vivo' : 'Sin conexión'} · ${filtro ? 'filtro activo' : 'toca un bot'}`;
  document.getElementById('lista-source').textContent =
    snapshot.mode === 'live' ? 'En vivo' : 'Sin conexión';
  document.getElementById('lista-source').classList.toggle('off', snapshot.mode !== 'live');
  paintMandoBtn();
  document.getElementById('lista-racha').textContent = 'Racha ' + (snapshot.racha?.dias ?? '–');
  document.getElementById('lista-racha').title = rachaText(snapshot.racha);
  stale.refresh(snapshot);

  const body = document.getElementById('lista-body');
  const byId = Object.fromEntries(snapshot.bots.map(b => [b.id, b]));
  let html = '';
  for (const fl of [...floors].sort((a, b) => b.id - a.id)) {
    const rows = snapshot.bots.filter(b => b.floor === fl.id && (!filtro || b.status === filtro));
    if (!rows.length) continue;
    html += `<h3 class="sj-floor">${fl.name}</h3>`;
    for (const b of rows) {
      const dot = b.callado ? 'callado' : b.status;
      const sub = [statusLabels[b.status] || 'Sin señal', b.resumen || b.task].filter(Boolean).join(' · ');
      html += `<button type="button" class="lista-row sj-lrow" data-id="${b.id}">
        <img class="av" data-st="${b.status || 'unknown'}" src="${avatarPhotoUrl(b.id)}" alt="" width="32" height="32" loading="lazy">
        <span class="lx"><b>${b.name}</b>
          <small><span class="status-dot status-${dot}" hidden></span>${sub}</small>
          ${b.status === 'review' && b.agente ? quickHtml(b) : ''}
        </span>
        <span class="lir">›</span>
      </button>`;
    }
  }
  body.innerHTML = html || '<p class="muted">Nadie en este filtro.</p>';
}

function quickHtml(b) {
  if (!b.agente) return '';
  return `<span class="v16rr">${QUICK_REPLIES.map(([l, t]) =>
    `<a class="mir v16r" href="${chatHref(b.agente)}" data-copia="${t.replace(/"/g, '&quot;')}" data-agente="${b.agente}">${l}</a>`).join('')}</span>`;
}


function escTxt(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
function fichaDato(label, value) {
  if (value == null || String(value).trim() === '') return '';
  return `<div class="ficha-dato"><dt>${escTxt(label)}</dt><dd>${escTxt(String(value))}</dd></div>`;
}
function fichaDatosHtml(b) {
  const profile = botProfile(snapshot, b);
  const planta = Number.isInteger(b.floor)
    ? `${b.floor === 0 ? 'PB' : `Piso ${b.floor}`} · ${floors[b.floor]?.name || ''}`
    : '';
  const lastSig = (b.lastSignal && formatActualizado(b.lastSignal)) || profile.lastSignal || '';
  const actividad = b.activity || null;
  const tarea = b.task || (b.mandoUnlocked ? profile.currentTask : null);
  const rows = [
    ['Planta', planta, 'floor'],
    ['Puesto', [b.role, departmentOf(b.id)].filter(Boolean).join(' · '), 'role'],
    ['Estado', profile.status, 'status'],
    ['¿Está activo?', profile.active, 'active'],
    ['Actividad ahora', actividad, 'activity'],
    ['Tarea actual', tarea || profile.currentTask, 'current'],
  ];
  if (b.resumen && b.resumen !== profile.currentTask) rows.push(['Resumen', b.resumen, 'resumen']);
  if (profile.waitingNote) rows.push(['Te espera', profile.waitingNote, 'waiting']);
  if (profile.authorization) rows.push(['Autorización', profile.authorization, 'authorization']);
  rows.push(['Tarea anterior', profile.previousTask, 'previous']);
  rows.push(['Última señal real', lastSig, 'signal']);
  const kept = dedupeFactRows(rows);
  let html = kept.map(([k, v]) => fichaDato(k, v)).join('');
  html += fichaDato('Uso', displayUsoLine(getUsoState(), b.id, b.mandoUso));
  if (b.callado?.dias) {
    html += fichaDato('Callado', `Callado: ${Math.floor(b.callado.dias)} días sin actividad y con pendientes`);
  }
  if (b.id === 'ted' && b.rutina && (b.rutina.fallo || b.rutina.no_corrio)) {
    html += fichaDato('Rutina', `Rutina ${b.rutina.fallo ? 'con errores' : 'no corrió'}${b.rutina.ultima ? ` · última ${b.rutina.ultima}` : ''}`);
  }
  return html;
}

function closeListaFicha() {
  const card = document.getElementById('lista-ficha');
  const veil = document.getElementById('lista-ficha-veil');
  if (card) { card.classList.remove('open'); card.hidden = true; }
  if (veil) { veil.hidden = true; }
}

function openFicha(id) {
  const b = snapshot.bots.find(x => x.id === id);
  if (!b) return;
  let veil = document.getElementById('lista-ficha-veil');
  if (!veil) {
    veil = document.createElement('div');
    veil.id = 'lista-ficha-veil';
    veil.hidden = true;
    veil.addEventListener('click', closeListaFicha);
    document.body.appendChild(veil);
  }
  let card = document.getElementById('lista-ficha');
  if (!card) {
    card = document.createElement('aside');
    card.id = 'lista-ficha';
    card.className = 'ficha-flotante glass-card lista-ficha-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Ficha del bot');
    document.body.appendChild(card);
    bindSwipeToClose(card, () => closeListaFicha());
  }
  const waiting = b.status === 'review' && !b.stale;
  const st = statusLabels[b.status] || 'Sin señal';
  card.hidden = false;
  card.innerHTML = `
    <button type="button" class="icon-btn ficha-x" data-close aria-label="Cerrar"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <img class="ficha-av" data-st="${b.status || 'unknown'}" src="${avatarPhotoUrl(b.id)}" alt="" width="112" height="112">
    <b class="ficha-name">${escTxt(b.name)}</b>
    <span class="ficha-role">${escTxt(b.role || '')} · ${escTxt(departmentOf(b.id))}</span>
    <span class="ficha-st st-${b.status || 'unknown'}">${escTxt(st)}</span>
    <div class="ficha-datos">${fichaDatosHtml(b)}</div>
    ${b.agente ? `<p class="ficha-actions"><a class="mir sj-btn gold" href="${chatHref(b.agente)}" id="lista-chat">Abrir chat</a></p>` : '<p class="muted">Chat con mando desbloqueado.</p>'}
    ${waiting && b.agente ? `<p class="v16rr">${QUICK_REPLIES.map(([l]) => `<button type="button" class="btn-slim" data-qr="${l}">${l}</button>`).join('')}</p>` : ''}
    ${waiting ? `<p class="v15pp"><button type="button" class="btn-slim" data-pos="3h">Posponer 3 h</button> <button type="button" class="btn-slim" data-pos="manana">Hasta mañana</button>${isPostponed(b) ? ' <span class="muted">(pospuesto)</span>' : ''}</p>` : ''}
    <details class="v15nota" ${getNote(b.id) ? 'open' : ''}><summary>Nota privada</summary>
      <textarea rows="3" data-nota>${getNote(b.id).replace(/</g, '&lt;')}</textarea></details>
  `;
  veil.hidden = false;
  requestAnimationFrame(() => card.classList.add('open'));
  card.querySelector('[data-close]').onclick = closeListaFicha;
  card.querySelector('#lista-chat')?.addEventListener('click', (e) => {
    e.preventDefault();
    copyAndOpenChat({agente: b.agente});
  });
  card.querySelectorAll('[data-qr]').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = QUICK_REPLIES.find(([l]) => l === btn.dataset.qr)?.[1];
      copyAndOpenChat({agente: b.agente, text});
    });
  });
  card.querySelectorAll('[data-pos]').forEach(btn => {
    btn.addEventListener('click', () => {
      postpone(b.id, b.waitingSince, btn.dataset.pos);
      closeListaFicha();
      paint();
    });
  });
  const ta = card.querySelector('[data-nota]');
  ta?.addEventListener('input', () => setNote(b.id, ta.value));
}

document.getElementById('lista-counters').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-k]');
  if (!btn) return;
  filtro = filtro === btn.dataset.k ? null : btn.dataset.k;
  paint();
});
document.getElementById('lista-body').addEventListener('click', (e) => {
  const qr = e.target.closest('a.v16r');
  if (qr) {
    e.preventDefault();
    copyAndOpenChat({agente: qr.dataset.agente, text: qr.dataset.copia});
    return;
  }
  const row = e.target.closest('[data-id]');
  if (row) openFicha(row.dataset.id);
});
function goTo3d() {
  try { localStorage.setItem('atelierVista', '3d'); } catch {}
  const u = new URL(location.href);
  u.searchParams.delete('abrir');
  const dest = u.pathname + u.search;
  if (history.state && history.state.atelierLista && history.length > 1) {
    // Leave a flag so popstate (if it fires after back) is a no-op if we also assign.
    try { sessionStorage.setItem('atelierLeavingLista', '1'); } catch {}
    history.back();
    // If Back didn't unload us quickly (same-document pop), assign.
    setTimeout(() => {
      if (document.body.classList.contains('lista-mode')) location.assign(dest);
    }, 200);
    return;
  }
  location.assign(dest);
}
document.getElementById('lista-to-3d').onclick = goTo3d;
document.getElementById('lista-back').onclick = goTo3d;

(function setupListaHistory() {
  const u = new URL(location.href);
  try {
    if (!history.state || !history.state.atelierLista) {
      if (history.length <= 1) {
        const clean = new URL(location.href);
        clean.searchParams.delete('abrir');
        history.replaceState({atelierVista: '3d'}, '', clean.pathname + clean.search);
        u.searchParams.set('abrir', 'lista');
        history.pushState({atelierLista: true}, '', u.pathname + u.search);
      } else {
        history.replaceState({atelierLista: true}, '', u.pathname + u.search);
      }
    }
  } catch {}
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.atelierLista) return;
    try { localStorage.setItem('atelierVista', '3d'); } catch {}
    const clean = new URL(location.href);
    clean.searchParams.delete('abrir');
    location.assign(clean.pathname + clean.search);
  });
})();
document.getElementById('lista-resumen').onclick = () => resumen.open();
/* s10: el Mando en Solo lista usa una hoja propia con campo oculto (nunca la ventanita del
 * navegador, que mostraba la frase en claro) y pide confirmación antes de bloquear. */
function paintMandoBtn() {
  const b = document.getElementById('lista-mando');
  if (!b) return;
  b.textContent = mandoSession.unlocked ? 'Mando abierto' : 'Desbloquear mando';
  b.setAttribute('aria-pressed', String(!!mandoSession.unlocked));
}
function closeMandoHoja() {
  const h = document.getElementById('lista-mando-hoja');
  const v = document.getElementById('lista-mando-veil');
  if (h) { h.hidden = true; h.innerHTML = ''; }
  if (v) v.hidden = true;
}
function openMandoHoja() {
  let v = document.getElementById('lista-mando-veil');
  if (!v) { v = document.createElement('div'); v.id = 'lista-mando-veil'; v.addEventListener('click', closeMandoHoja); document.body.appendChild(v); }
  let h = document.getElementById('lista-mando-hoja');
  if (!h) { h = document.createElement('section'); h.id = 'lista-mando-hoja'; h.setAttribute('role', 'dialog'); h.setAttribute('aria-label', 'Mando'); document.body.appendChild(h); bindSwipeToClose(h, closeMandoHoja); }
  closeListaFicha();
  if (mandoSession.unlocked) {
    h.innerHTML = `<h3>Mando abierto</h3><p>Ves tareas, agenda y uso en este teléfono.</p>
      <div class="fila" data-paso1><button type="button" class="btn-slim" data-bloquear>Bloquear</button><button type="button" class="btn-slim" data-cerrar>Cerrar</button></div>
      <div data-paso2 hidden><p>¿Bloquear el mando y olvidar la frase en este teléfono? Tendrás que escribirla otra vez.</p>
      <div class="fila"><button type="button" class="btn-slim" data-si>Sí, bloquear</button><button type="button" class="btn-slim" data-cerrar>Cancelar</button></div></div>`;
    h.querySelector('[data-bloquear]').onclick = () => { h.querySelector('[data-paso1]').hidden = true; h.querySelector('[data-paso2]').hidden = false; };
    h.querySelector('[data-si]').onclick = () => { mandoSession.lock(); closeMandoHoja(); snapshot = {...snapshot, mandoUnlocked: false}; refresh(); paintMandoBtn(); };
  } else {
    h.innerHTML = `<h3>Desbloquear mando</h3><p>Escribe tu frase de mando. Se descifra solo en este teléfono.</p>
      <label for="lista-mando-pass">Frase de mando</label>
      <input id="lista-mando-pass" type="password" autocomplete="current-password" spellcheck="false">
      <p data-error role="alert"></p>
      <div class="fila"><button type="button" class="btn-slim" data-ok>Desbloquear</button><button type="button" class="btn-slim" data-cerrar>Cancelar</button></div>`;
    const inp = h.querySelector('#lista-mando-pass');
    const err = h.querySelector('[data-error]');
    const go = () => {
      const pass = inp.value;
      if (!pass) { err.textContent = 'Escribe la frase.'; return; }
      err.textContent = 'Desbloqueando…';
      mandoSession.unlock(pass, {remember: true})
        .then(() => { inp.value = ''; closeMandoHoja(); enrich(); refreshUso(); paint(); })
        .catch(() => { err.textContent = 'No se pudo desbloquear. Revisa la frase.'; });
    };
    h.querySelector('[data-ok]').onclick = go;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    setTimeout(() => inp.focus(), 50);
  }
  h.querySelectorAll('[data-cerrar]').forEach(b => { b.onclick = closeMandoHoja; });
  v.hidden = false;
  h.hidden = false;
}
document.getElementById('lista-mando').onclick = openMandoHoja;

async function refresh() {
  try {
    const result = await readSnapshot({knownIds: catalog.map(b => b.id)});
    snapshot = {
      mode: 'live',
      source: result.source,
      lastSignal: result.lastSignal,
      salud: result.salud,
      racha: result.racha,
      bots: catalog.map(base => {
        const live = result.bots.find(x => x.id === base.id);
        if (!live) return {...base, status: 'unknown', task: null, stale: true, waitingSince: null};
        return {...base, ...live};
      }),
    };
    enrich();
  } catch {
    snapshot = {...disconnectedSnapshot(), racha: null};
  }
  paint();
  // deep link bot
  const bot = new URLSearchParams(location.search).get('bot');
  if (bot) {
    openFicha(bot);
    const clean = new URL(location.href);
    clean.searchParams.delete('bot');
    history.replaceState({}, '', clean.pathname + clean.search);
  }
  if (new URLSearchParams(location.search).get('abrir') === 'resumen') resumen.open();
}

refresh();
setInterval(refresh, SOURCE_CONTRACT.pollIntervalMs || 60000);
Promise.resolve(mandoSession.tryRestore?.()).then(() => refreshUso());
