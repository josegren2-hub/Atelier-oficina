import {avatarPhotoUrl} from './avatar-photo.js';
/** Ted's whiteboard: Agenda y pendientes de hoy (public + mando-unlocked only). */
export function buildPizarronModel({mando = null, waiting = [], bots = []} = {}) {
  if (!mando) return {unlocked: false, aud: [], esp: [], pend: [], gen: null, audEstado: null};
  const a = mando.audiencias;
  const aud = a && a.estado === 'ok' && Array.isArray(a.items) ? a.items : [];
  const byId = new Map(bots.map(b => [b.id, b]));
  const esp = (waiting || []).map(b => ({id: b.id, nombre: b.name || byId.get(b.id)?.name || b.id}));
  const pend = (mando.bots || []).flatMap(b => (b.pendientes || []).map(p => ({
    id: b.id,
    n: byId.get(b.id)?.name || b.nombre || b.id,
    t: typeof p === 'string' ? p : (p?.texto || p?.txt || ''),
  }))).filter(p => p.t);
  return {unlocked: true, aud, esp, pend, gen: mando.generado || null, audEstado: a?.estado || null};
}

export function mountPizarron({
  getModel = () => buildPizarronModel(),
  onSelect = () => {},
} = {}) {
  const dialog = document.createElement('dialog');
  dialog.id = 'v17pizarron';
  dialog.className = 'pizarron-dialog';
  dialog.setAttribute('aria-label', 'Agenda y pendientes de hoy');
  document.body.append(dialog);

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function render() {
    const d = getModel() || {unlocked: false};
    let h = `<div class="lt"><b>Agenda y pendientes de hoy</b><button type="button" class="lcerrar" aria-label="Cerrar">✕ Cerrar</button></div>`;
    if (!d.unlocked) {
      h += '<p class="s">🔐 Solo con el Centro de mando desbloqueado. Sin la clave no se muestra contenido privado.</p>';
    } else {
      const when = d.gen ? new Date(d.gen).toLocaleString('es-MX', {timeZone: 'America/Chihuahua', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short'}) : '—';
      h += `<p class="s">Se actualiza solo · datos al ${escapeHtml(when)}</p>`;
      h += '<h4>📅 Audiencias / agenda</h4>';
      if (d.aud.length) {
        h += '<ul>' + d.aud.map(x => `<li><b>${escapeHtml(x.hora || '')}</b> ${escapeHtml(x.titulo || x.asunto || x.txt || '')}${x.lugar ? ` · <span class="s">📍 ${escapeHtml(x.lugar)}</span>` : ''}</li>`).join('') + '</ul>';
      } else {
        h += `<p class="s">${d.audEstado && d.audEstado !== 'ok' ? `Sin datos de audiencias (${escapeHtml(d.audEstado)})` : 'Sin audiencias.'}</p>`;
      }
      h += '<h4>🟠 Te esperan</h4>';
      h += d.esp.length
        ? d.esp.map(b => `<button type="button" class="f" data-id="${escapeHtml(b.id)}"><img class="av" src="${escapeHtml(avatarPhotoUrl(b.id))}" alt="" width="28" height="28" loading="lazy"><span class="d e-te"></span><div class="lx"><b>${escapeHtml(b.nombre)}</b></div><span class="lir">›</span></button>`).join('')
        : '<p class="s">Nadie te espera.</p>';
      h += '<h4>📝 Pendientes</h4>';
      h += d.pend.length
        ? '<ul>' + d.pend.slice(0, 30).map(p => `<li data-id="${escapeHtml(p.id)}"><b>${escapeHtml(p.n)}:</b> ${escapeHtml(p.t)}</li>`).join('') + '</ul>'
        : '<p class="s">Sin pendientes.</p>';
    }
    dialog.innerHTML = h;
  }

  dialog.addEventListener('click', e => {
    if (e.target === dialog) { close(); return; }
    if (e.target.closest('.lcerrar')) { close(); return; }
    const row = e.target.closest('[data-id]');
    if (row?.dataset.id) { close(); onSelect(row.dataset.id); }
  });

  function open() { render(); if (!dialog.open) dialog.showModal(); }
  function close() { if (dialog.open) dialog.close(); }
  function isOpen() { return !!dialog.open; }

  return {open, close, isOpen, refresh: () => { if (dialog.open) render(); }, element: dialog, destroy() { close(); dialog.remove(); }};
}
