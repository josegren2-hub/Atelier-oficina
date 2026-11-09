/** Resumen del día / semanal / racha 🔥 (datos públicos + mando cifrado local). */
import {DEPARTMENTS, departmentOf} from './departments.js';
import {filterWaiting} from './local-waiting.js';

export function rachaText(racha) {
  if (!racha) return '🔥 Racha: sin datos aún';
  const d = Number(racha.dias) || 0;
  return `🔥 Racha: ${d} día${d === 1 ? '' : 's'}${racha.hoy_cero ? ' · hoy ya llegaste a cero' : ' · hoy aún no llegas a cero'}`;
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

export function mountResumenPanel({getSnapshot, getMando, onChoose, container = document.body} = {}) {
  const dialog = document.createElement('dialog');
  dialog.id = 'resumen-dialog';
  dialog.className = 'resumen-dialog';
  dialog.innerHTML = `<div class="lt"><b>📋 Resumen del día</b><button type="button" data-close aria-label="Cerrar">✕ Cerrar</button></div><div class="resumen-body"></div>`;
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
        const callado = m?.callado?.dias ? ` · 🤐 callado ${Math.floor(m.callado.dias)} d` : '';
        const st = b.status === 'review' ? 'te espera' : b.status === 'working' ? 'trabajando' : b.status === 'idle' ? 'en pausa' : 'sin señal';
        html += `<button type="button" class="resumen-row" data-bot="${esc(id)}"><span class="status-dot status-${esc(b.status)}"></span><b>${esc(b.name)}</b> <span class="muted">${esc(st)}${esc(callado)}</span></button>`;
      }
    }

    html += '<h4>📈 Resumen semanal</h4>';
    if (!mando) html += '<p class="muted">🔐 Solo con el mando desbloqueado.</p>';
    else if (!mando.semanal) html += '<p class="muted">Sin datos semanales.</p>';
    else {
      const a = mando.semanal.esta || {};
      const p = mando.semanal.anterior || {};
      html += `<ul class="resumen-semanal"><li>Esperas resueltas: <b>${esc(a.esperas_resueltas)}</b> <span class="muted">(antes ${esc(p.esperas_resueltas ?? '—')})</span></li>`;
      html += `<li>Más atorado: <b>${esc(a.mas_atorado?.nombre || '—')}</b></li>`;
      html += `<li>Uso (mensajes): <b>${esc(a.mensajes)}</b> vs ${esc(p.mensajes ?? '—')}</li></ul>`;
      if (mando.semanal.nota) html += `<p class="muted">${esc(mando.semanal.nota)}</p>`;
    }

    // timeline (hours_hoy from mando)
    html += '<h4>🕒 Línea de tiempo de hoy</h4>';
    if (!mando) html += '<p class="muted">🔐 Solo con el mando desbloqueado.</p>';
    else {
      html += '<p class="muted">Cada cuadro es una hora (0–23 h, Chihuahua); más verde = más mensajes. Solo conteos.</p>';
      const hb = new Date(new Date().toLocaleString('en-US', {timeZone: 'America/Chihuahua'})).getHours();
      for (const [dep, ids] of Object.entries(DEPARTMENTS)) {
        html += `<div class="v16dep">${esc(dep)}</div>`;
        for (const id of ids) {
          const m = mando.bots?.find(x => x.id === id);
          const b = byId[id];
          const hh = m?.horas_hoy;
          const mx = Math.max(1, ...(hh || [0]));
          const cel = hh
            ? hh.map((n, i) => `<i class="${i > hb ? 'fut' : ''}" style="${n ? `background:rgba(34,197,94,${(0.25 + 0.75 * n / mx).toFixed(2)})` : ''}" title="${i}:00 · ${n}"></i>`).join('')
            : '<span class="muted">sin datos</span>';
          html += `<div class="v16tl"><span class="n">${esc(b?.name || id)}</span><span class="h">${cel}</span></div>`;
        }
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
