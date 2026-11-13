/** Resumen del día / semanal / racha 🔥 (datos públicos + mando cifrado local). */
import {avatarPhotoUrl} from './avatar-photo.js';
import {DEPARTMENTS, departmentOf} from './departments.js';
import {filterWaiting} from './local-waiting.js';
import {getUsoState, formatActualizado} from './uso-feed.js';

export function rachaText(racha) {
  if (!racha) return 'Racha: sin datos aún';
  const d = Number(racha.dias) || 0;
  return `Racha: ${d} día${d === 1 ? '' : 's'}${racha.hoy_cero ? ' · hoy ya llegaste a cero' : ' · hoy aún no llegas a cero'}`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function hace(t) {
  const m = Date.parse(t);
  if (!Number.isFinite(m)) return '';
  let s = Math.max(0, Date.now() - m) / 60e3;
  if (s < 1) return 'hace un momento';
  if (s < 60) return `hace ${Math.round(s)} min`;
  const h = Math.floor(s / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} días`;
}


export function horaCorta(h) {
  const n = Number(h);
  if (!Number.isFinite(n) || n < 0) return '';
  const hour = Math.floor(n) % 24;
  const h12 = hour % 12 || 12;
  return `${h12} ${hour < 12 ? 'am' : 'pm'}`;
}

/** Plain-language daily activity from mando.horas_hoy. Sorted by messages desc. */
export function todayMessageRows(mando, byId = {}) {
  const rows = [];
  for (const m of mando?.bots || []) {
    const hh = Array.isArray(m.horas_hoy) ? m.horas_hoy : [];
    const total = hh.reduce((a, n) => a + (Number(n) || 0), 0);
    let last = -1;
    for (let i = hh.length - 1; i >= 0; i--) if (Number(hh[i]) > 0) { last = i; break; }
    const name = byId[m.id]?.name || m.nombre || m.id;
    rows.push({id: m.id, name, total, last, lastLabel: last >= 0 ? horaCorta(last) : ''});
  }
  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'es'));
  const max = Math.max(1, ...rows.map(r => r.total));
  return rows.map(r => ({...r, bar: r.total / max}));
}

export function mountResumenPanel({getSnapshot, getMando, onChoose, container = document.body} = {}) {
  const dialog = document.createElement('dialog');
  dialog.id = 'resumen-dialog';
  dialog.className = 'resumen-dialog';
  dialog.innerHTML = `<div class="lt"><b>Resumen del día</b><button type="button" data-close aria-label="Cerrar">✕</button></div><div class="resumen-body"></div>`;
  container.appendChild(dialog);
  const body = dialog.querySelector('.resumen-body');
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    const f = e.target.closest('[data-bot]');
    if (f) { dialog.close(); onChoose?.(f.dataset.bot); }
  });

  function paint() {
    const snap = getSnapshot?.() || {};
    const mando = getMando?.() || null;
    const bots = snap.bots || [];
    const waiting = filterWaiting(bots);
    const byId = Object.fromEntries(bots.map(b => [b.id, b]));
    let html = `<p class="v16racha">${esc(rachaText(snap.racha))}</p>`;
    const usoState = getUsoState();
    html += '<h4>Uso</h4>';
    if (!mando || usoState.state === 'locked') html += '<p class="muted">Solo con el mando desbloqueado.</p>';
    else if (usoState.state === 'missing' || !usoState.uso) html += '<p class="muted">Aún sin datos.</p>';
    else {
      const u = usoState.uso;
      const semana = u.semana_pct == null ? '—' : (Number.isInteger(u.semana_pct) ? String(u.semana_pct) : String(Math.round(u.semana_pct * 10) / 10));
      html += `<p class="uso-semana">Uso del plan esta semana: <b>${esc(semana)} %</b></p>`;
      if (u.actualizado) {
        const when = formatActualizado(u.actualizado);
        if (when) html += `<p class="uso-actualizado muted">actualizado ${esc(when)}</p>`;
      }
      if (u.bots.length) {
        const max = Math.max(1, ...u.bots.map(b => b.pct));
        html += '<ul class="uso-bars">';
        for (const row of u.bots) {
          const n = Number.isInteger(row.pct) ? String(row.pct) : String(Math.round(row.pct * 10) / 10);
          const w = Math.round((row.pct / max) * 100);
          html += `<li class="uso-bar-row"><div class="uso-bar-line"><b>${esc(row.name)}</b> · ${esc(n)} %</div><span class="uso-bar" aria-hidden="true"><i style="width:${w}%"></i></span></li>`;
        }
        html += '</ul>';
      } else html += '<p class="muted">Aún sin datos.</p>';
    }

    html += '<h4>Atorado (te espera)</h4>';
    html += waiting.length
      ? waiting.map(b => `<button type="button" class="resumen-row" data-bot="${esc(b.id)}"><span class="status-dot status-review"></span><b>${esc(b.name)}</b> <span class="muted">${esc(hace(b.waitingSince))}</span></button>`).join('')
      : '<p class="muted">Nada atorado.</p>';

    for (const [dep, ids] of Object.entries(DEPARTMENTS)) {
      html += `<h4>${esc(dep)}</h4>`;
      for (const id of ids) {
        const b = byId[id];
        if (!b) continue;
        const m = mando?.bots?.find(x => x.id === id);
        const callado = m?.callado?.dias ? ` · callado ${Math.floor(m.callado.dias)} d` : '';
        const st = b.status === 'review' ? 'te espera' : b.status === 'working' ? 'trabajando' : b.status === 'idle' ? 'en pausa' : 'sin señal';
        html += `<button type="button" class="resumen-row sj-rrow" data-bot="${esc(id)}"><img class="av" data-st="${esc(b.status || 'unknown')}" src="${esc(avatarPhotoUrl(id))}" alt="" width="28" height="28" loading="lazy"><b>${esc(b.name)}</b><span class="sj-rst"><i class="sj-dot st-${esc(b.status)}"></i>${esc(st)}${esc(callado)}</span></button>`;
      }
    }


    html += '<h4>Resumen semanal</h4>';
    if (!mando) html += '<p class="muted">Solo con el mando desbloqueado.</p>';
    else if (!mando.semanal) html += '<p class="muted">Sin datos semanales.</p>';
    else {
      const a = mando.semanal.esta || {};
      const p = mando.semanal.anterior || {};
      html += `<ul class="resumen-semanal"><li>Esperas resueltas: <b>${esc(a.esperas_resueltas)}</b> <span class="muted">(antes ${esc(p.esperas_resueltas ?? '—')})</span></li>`;
      html += `<li>Más atorado: <b>${esc(a.mas_atorado?.nombre || '—')}</b></li>`;
      html += `<li>Uso (mensajes): <b>${esc(a.mensajes)}</b> vs ${esc(p.mensajes ?? '—')}</li></ul>`;
      if (mando.semanal.nota) html += `<p class="muted">${esc(mando.semanal.nota)}</p>`;
    }

    html += '<h4>Mensajes de hoy</h4>';
    if (!mando) html += '<p class="muted">Solo con el mando desbloqueado.</p>';
    else {
      const rows = todayMessageRows(mando, byId);
      if (!rows.length) html += '<p class="muted">Sin conteos de hoy.</p>';
      else {
        html += '<ul class="resumen-hoy">';
        for (const r of rows) {
          const msg = r.total === 1 ? '1 mensaje hoy' : `${r.total} mensajes hoy`;
          const last = r.lastLabel ? ` · último ${r.lastLabel}` : ' · sin mensajes';
          html += `<li class="resumen-hoy-row" data-bot="${esc(r.id)}"><div class="resumen-hoy-line"><b>${esc(r.name)}</b> · ${esc(msg)}${esc(last)}</div><span class="resumen-hoy-bar" aria-hidden="true"><i style="width:${Math.round(r.bar*100)}%"></i></span></li>`;
        }
        html += '</ul>';
      }
    }
    body.innerHTML = html;
  }

  return {
    open() { paint(); if (!dialog.open) dialog.showModal(); },
    close() { dialog.close(); },
    isOpen: () => !!dialog.open,
    refresh: paint,
    rachaText: () => rachaText(getSnapshot?.()?.racha),
  };
}
