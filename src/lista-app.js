/** Vista Solo lista — sin Three/WebGL. */
import './style.css';
import {bindSwipeToClose} from './ui-sheets.js';
import {mountReleaseNotice} from './release-notice.js';
import {bots as catalog, floors, disconnectedSnapshot, statusLabels} from './data.js';
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
import {loadUsoEnc, getUsoState, setUsoState, displayUsoLine, onUsoChange} from './uso-feed.js';

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
  document.getElementById('lista-racha').textContent = 'Racha ' + (snapshot.racha?.dias ?? '–');
  document.getElementById('lista-racha').title = rachaText(snapshot.racha);
  stale.refresh(snapshot);

  const body = document.getElementById('lista-body');
  const byId = Object.fromEntries(snapshot.bots.map(b => [b.id, b]));
  let html = '';
  for (const fl of [...floors].sort((a, b) => b.id - a.id)) {
    const rows = snapshot.bots.filter(b => b.floor === fl.id && (!filtro || b.status === filtro));
    if (!rows.length) continue;
    html += `<h3 class="sj-floor">${fl.name.replace(' · Ted', '')}</h3>`;
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
    <img class="ficha-av" data-st="${b.status || 'unknown'}" src="${avatarPhotoUrl(b.id)}" alt="" width="48" height="48">
    <b class="ficha-name">${b.name}</b>
    <span class="ficha-role">${b.role || ''} · ${departmentOf(b.id)}</span>
    <span class="ficha-st st-${b.status || 'unknown'}">${st}</span>
    <p class="uso-line">${displayUsoLine(getUsoState(), b.id, b.mandoUso)}</p>
    ${b.resumen ? `<p class="ficha-resumen">${b.resumen}</p>` : ''}
    ${b.task && b.task !== b.resumen ? `<p class="ficha-task">${b.task}</p>` : ''}
    ${b.agente ? `<p><a class="mir sj-btn gold" href="${chatHref(b.agente)}" id="lista-chat">Abrir chat</a></p>` : '<p class="muted">Chat con mando desbloqueado.</p>'}
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
document.getElementById('lista-mando').onclick = () => {
  // Reuse 3D page mando by switching? Simpler: prompt unlock via same dialog markup
  const pass = prompt('Frase de mando (solo en este navegador):');
  if (pass) mandoSession.unlock(pass, {remember: true}).then(() => { enrich(); refreshUso(); paint(); });
};

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
