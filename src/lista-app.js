/** Vista Solo lista — sin Three/WebGL. */
import './style.css';
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
  <header class="lista-header">
    <strong>Atelier · Solo lista</strong>
    <span id="lista-source" class="muted">Conectando…</span>
    <button type="button" id="lista-resumen">📋 Resumen</button>
    <button type="button" id="lista-racha" class="lista-racha" title="Racha">🔥 –</button>
    <button type="button" id="lista-to-3d" title="Ver la oficina en 3D">🏢 3D</button>
    <button type="button" id="lista-mando">Desbloquear mando</button>
  </header>
  <div id="lista-stale-slot"></div>
  <div id="lista-counters" class="l16k" role="toolbar"></div>
  <p id="lista-meta" class="muted"></p>
  <div id="lista-body"></div>
  <p class="muted l16pie">Vista ligera sin 3D. Para volver a la oficina toca “🏢 3D”.</p>
`;
document.body.appendChild(main);

const stale = mountStaleBanner(document.getElementById('lista-stale-slot') || main);
let snapshot = disconnectedSnapshot();
let filtro = null;
const mandoSession = createMandoSession({onChange: () => { enrich(); paint(); }});

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
    ['review', 'Te esperan', c.review],
    ['working', 'Trabajando', c.working],
    ['idle', 'En pausa', c.idle],
  ];
  counters.innerHTML = items.map(([k, t, n]) =>
    `<button type="button" data-k="${k}" class="${filtro === k ? 'on' : ''}"><b class="status-${k}">${n}</b> ${t}</button>`).join('');
  document.getElementById('lista-meta').textContent =
    `${snapshot.mode === 'live' ? 'En vivo' : 'Sin conexión'} · ${filtro ? 'filtro activo' : 'toca un bot'}`;
  document.getElementById('lista-source').textContent =
    snapshot.mode === 'live' ? `En vivo · ${snapshot.source || ''}` : 'Sin conexión';
  document.getElementById('lista-racha').textContent = '🔥 ' + (snapshot.racha?.dias ?? '–');
  document.getElementById('lista-racha').title = rachaText(snapshot.racha);
  stale.refresh(snapshot);

  const body = document.getElementById('lista-body');
  const byId = Object.fromEntries(snapshot.bots.map(b => [b.id, b]));
  let html = '';
  for (const [dep, ids] of Object.entries(DEPARTMENTS)) {
    const rows = ids.map(i => byId[i]).filter(b => b && (!filtro || b.status === filtro));
    if (!rows.length) continue;
    html += `<h3>${dep}</h3>`;
    for (const b of rows) {
      const dot = b.callado ? 'callado' : b.status;
      html += `<button type="button" class="lista-row" data-id="${b.id}">
        <img class="av" src="${avatarPhotoUrl(b.id)}" alt="" width="36" height="36" loading="lazy">
        <span class="lx"><b>${b.name}</b>
          <small><span class="status-dot status-${dot}"></span> ${statusLabels[b.status] || 'Sin señal'} · ${b.task || b.role}</small>
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

function openFicha(id) {
  const b = snapshot.bots.find(x => x.id === id);
  if (!b) return;
  let dlg = document.getElementById('lista-ficha');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'lista-ficha';
    dlg.className = 'lista-ficha';
    document.body.appendChild(dlg);
  }
  const waiting = b.status === 'review' && !b.stale;
  dlg.innerHTML = `
    <div class="detail-top"><div>
      <img src="${avatarPhotoUrl(b.id)}" alt="" width="48" height="48">
      <h2>${b.name}</h2><p>${b.role} · ${departmentOf(b.id)}</p>
    </div><button type="button" data-close>Cerrar ×</button></div>
    <p><strong>${statusLabels[b.status] || 'Sin señal'}</strong>${b.task ? ` · ${b.task}` : ''}</p>
    ${b.agente ? `<p><a class="mir" href="${chatHref(b.agente)}" id="lista-chat">Abrir chat →</a></p>` : '<p class="muted">🔐 Chat con mando desbloqueado.</p>'}
    ${waiting && b.agente ? `<p class="v16rr">${QUICK_REPLIES.map(([l]) => `<button type="button" data-qr="${l}">${l}</button>`).join('')}</p>` : ''}
    ${waiting ? `<p class="v15pp"><button type="button" data-pos="3h">⏰ Posponer 3 h</button> <button type="button" data-pos="manana">🌙 Hasta mañana</button>${isPostponed(b) ? ' <span class="muted">(pospuesto)</span>' : ''}</p>` : ''}
    <details class="v15nota" ${getNote(b.id) ? 'open' : ''}><summary>📝 Nota privada</summary>
      <textarea rows="3" data-nota>${getNote(b.id).replace(/</g, '&lt;')}</textarea></details>
  `;
  dlg.showModal();
  dlg.querySelector('[data-close]').onclick = () => dlg.close();
  dlg.querySelector('#lista-chat')?.addEventListener('click', (e) => {
    e.preventDefault();
    copyAndOpenChat({agente: b.agente});
  });
  dlg.querySelectorAll('[data-qr]').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = QUICK_REPLIES.find(([l]) => l === btn.dataset.qr)?.[1];
      copyAndOpenChat({agente: b.agente, text});
    });
  });
  dlg.querySelectorAll('[data-pos]').forEach(btn => {
    btn.addEventListener('click', () => {
      postpone(b.id, b.waitingSince, btn.dataset.pos);
      dlg.close();
      paint();
    });
  });
  const ta = dlg.querySelector('[data-nota]');
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
document.getElementById('lista-to-3d').onclick = () => {
  localStorage.setItem('atelierVista', '3d');
  const u = new URL(location.href);
  u.searchParams.delete('abrir');
  location.replace(u.pathname + u.search);
};
document.getElementById('lista-resumen').onclick = () => resumen.open();
document.getElementById('lista-racha').onclick = () => resumen.open();
document.getElementById('lista-mando').onclick = () => {
  // Reuse 3D page mando by switching? Simpler: prompt unlock via same dialog markup
  const pass = prompt('Frase de mando (solo en este navegador):');
  if (pass) mandoSession.unlock(pass, {remember: true}).then(() => { enrich(); paint(); });
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
mandoSession.tryRestore?.();
