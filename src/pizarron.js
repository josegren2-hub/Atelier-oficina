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
  // t302/t303: full agenda (Rob's Google Calendar, today + tomorrow) arrives encrypted as mando.agenda. Never invented.
  const g = mando.agenda;
  const agenda = g && g.estado === 'ok' && Array.isArray(g.eventos)
    ? g.eventos.map(e => ({fecha: e.fecha, hora: e.hora_inicio, fin: e.hora_fin, titulo: e.titulo, lugar: e.lugar, tipo: 'cal'}))
    : [];
  const audF = aud.map(x => ({...x, fecha: x.fecha || a?.fecha || null, tipo: 'aud'}));
  return {unlocked: true, aud: audF, agenda, agendaEstado: g?.estado || null, esp, pend, gen: mando.generado || null, audEstado: a?.estado || null, audFecha: a?.fecha || null};
}


const TZ = 'America/Chihuahua';
function ymd(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(date);
  const g = k => parts.find(p => p.type === k)?.value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}
function minutesOf(hora) {
  const m = /^(\d{1,2})[:.h](\d{2})/.exec(String(hora || '').trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h >= 0 && h < 24 && mi >= 0 && mi < 60 ? h * 60 + mi : null;
}
/** C36: lay agenda items into day columns (today / today+tomorrow) by hour. Never invents events. */
export function buildCalendar(items = [], {days = 1, now = new Date(), fallbackFecha = null} = {}) {
  const cols = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    cols.push({ymd: ymd(d), label: d.toLocaleDateString('es-MX', {timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short'}), events: []});
  }
  const sinHora = [];
  for (const it of items || []) {
    const f = String(it?.fecha || fallbackFecha || cols[0].ymd).slice(0, 10);
    const col = cols.find(c => c.ymd === f);
    if (!col) continue;
    const start = minutesOf(it?.hora);
    const endM = minutesOf(it?.fin);
    const ev = {titulo: it?.titulo || it?.asunto || it?.txt || '', hora: it?.hora || '', fin: it?.fin || '', lugar: it?.lugar || '', tipo: it?.tipo || 'aud', start, dur: start != null && endM != null && endM > start ? Math.max(20, endM - start) : 60};
    const dup = start != null && col.events.some(x => x.start === start && x.titulo.trim().toLowerCase() === ev.titulo.trim().toLowerCase());
    if (dup) continue;
    if (start == null) sinHora.push({...ev, col: col.label}); else col.events.push(ev);
  }
  let first = 8 * 60, last = 19 * 60;
  for (const c of cols) for (const e of c.events) { first = Math.min(first, Math.floor(e.start / 60) * 60); last = Math.max(last, Math.ceil((e.start + (e.dur || 60)) / 60) * 60); }
  const nowMin = (() => { const p = new Intl.DateTimeFormat('en-GB', {timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false}).format(now).split(':'); return Number(p[0]) * 60 + Number(p[1]); })();
  return {cols, first, last, nowMin, todayYmd: ymd(now), sinHora};
}

/** D14: side-by-side lanes for overlapping events within one day column (interval packing). */
export function assignLanes(events = []) {
  const list = events.filter(e => e && e.start != null).sort((a, b) => a.start - b.start || (b.dur || 60) - (a.dur || 60));
  let group = [], groupEnd = -1, laneEnds = [];
  const flush = () => { const n = laneEnds.length || 1; for (const e of group) e.lanes = n; group = []; laneEnds = []; };
  for (const e of list) {
    const end = e.start + (e.dur || 60);
    if (group.length && e.start >= groupEnd) flush(), groupEnd = -1;
    let lane = laneEnds.findIndex(x => x <= e.start);
    if (lane < 0) { lane = laneEnds.length; laneEnds.push(end); } else laneEnds[lane] = end;
    e.lane = lane; group.push(e); groupEnd = Math.max(groupEnd, end);
  }
  flush();
  return list;
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
  let days = 1;
  let who = 'ted'; // C46c: 'ted' = toda la agenda; 'julian' = solo agenda de trabajo

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function render() {
    const d = getModel() || {unlocked: false};
    const jul = who === 'julian';
    dialog.classList.toggle('pz-julian', jul);
    dialog.setAttribute('aria-label', jul ? 'Pizarrón de Julián · Solo agenda de trabajo' : 'Agenda y pendientes de hoy');
    let h = jul
      ? `<div class="lt"><b>Pizarrón de Julián</b><button type="button" class="lcerrar" aria-label="Cerrar">✕</button></div><p class="pz-sub">Solo agenda de trabajo</p>`
      : `<div class="lt"><b>Agenda y pendientes de hoy</b><button type="button" class="lcerrar" aria-label="Cerrar">✕</button></div>`;
    if (!d.unlocked) {
      h += '<p class="s">Solo con el Centro de mando desbloqueado. Sin la clave no se muestra contenido privado.</p>';
    } else {
      const when = d.gen ? new Date(d.gen).toLocaleString('es-MX', {timeZone: 'America/Chihuahua', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short'}) : '—';
      h += `<p class="s">Se actualiza solo · datos al ${escapeHtml(when)}</p>`;
      h += '<h4>Agenda</h4>';
      h += `<div class="pz-tog" role="group" aria-label="Días"><button type="button" data-days="1" aria-pressed="${days === 1}">Hoy</button><button type="button" data-days="2" aria-pressed="${days === 2}">2 días</button></div>`;
      if (d.audEstado && d.audEstado !== 'ok') h += `<p class="s">Audiencias: sin datos de mañana todavía.</p>`;
      {
        const cal = buildCalendar(jul ? d.aud : [...d.aud, ...(d.agenda || [])], {days, fallbackFecha: d.audFecha});
        const pxMin = 0.8, H = (cal.last - cal.first) * pxMin;
        h += `<div class="pz-cal" style="--cols:${cal.cols.length}"><div class="pz-hd"><span></span>${cal.cols.map(c => `<b>${escapeHtml(c.label)}</b>`).join('')}</div>`;
        h += `<div class="pz-grid" style="height:${Math.round(H)}px"><div class="pz-hours">`;
        for (let m = cal.first; m <= cal.last; m += 60) h += `<span style="top:${Math.round((m - cal.first) * pxMin)}px">${String(m / 60).padStart(2, '0')}:00</span>`;
        h += '</div>';
        for (const c of cal.cols) {
          h += '<div class="pz-col">';
          for (let m = cal.first; m <= cal.last; m += 60) h += `<i class="pz-line" style="top:${Math.round((m - cal.first) * pxMin)}px"></i>`;
          if (c.ymd === cal.todayYmd && cal.nowMin >= cal.first && cal.nowMin <= cal.last) h += `<i class="pz-now" style="top:${Math.round((cal.nowMin - cal.first) * pxMin)}px"></i>`;
          assignLanes(c.events);
          for (const e of c.events) h += `<div class="pz-ev pz-${e.tipo === 'cal' ? 'cal' : 'aud'}${(e.lanes || 1) > 1 ? ' pz-lane' : ''}" style="--lane:${e.lane || 0};--lanes:${e.lanes || 1};top:${Math.round((e.start - cal.first) * pxMin) + 1}px;height:${Math.max(16, Math.round((e.dur || 60) * pxMin) - 3)}px"><b>${escapeHtml(e.titulo)}</b><small>${escapeHtml(e.hora)}${e.fin ? `–${escapeHtml(e.fin)}` : ''}${e.lugar ? ` · ${escapeHtml(e.lugar)}` : ''}</small></div>`;
          h += '</div>';
        }
        h += '</div></div>';
        if (!cal.cols.some(c => c.events.length)) h += `<p class="s">${jul ? 'Sin audiencias en estos días.' : 'Sin eventos en estos días.'}</p>`;
        h += jul ? '<p class="s">Fuente: audiencias (trabajo).</p>' : `<p class="s"><span class="pz-key pz-aud"></span> Audiencias · <span class="pz-key pz-cal"></span> Calendario de Google${d.agendaEstado === 'ok' ? '' : ' (sin datos)'}</p>`;
        if (cal.sinHora.length) h += '<ul>' + cal.sinHora.map(e => `<li>${escapeHtml(e.titulo)} <span class="s">(sin hora)</span></li>`).join('') + '</ul>';
        h += '<p class="s">Las audiencias se muestran de 1 h aprox.; los eventos del calendario con su duración real.</p>';
      }
      if (!jul) {
      h += '<h4>Te esperan</h4>';
      h += d.esp.length
        ? d.esp.map(b => `<button type="button" class="f" data-id="${escapeHtml(b.id)}"><img class="av" src="${escapeHtml(avatarPhotoUrl(b.id))}" alt="" width="28" height="28" loading="lazy"><span class="d e-te"></span><div class="lx"><b>${escapeHtml(b.nombre)}</b></div><span class="lir">›</span></button>`).join('')
        : '<p class="s">Nadie te espera.</p>';
      h += '<h4>Pendientes</h4>';
      h += d.pend.length
        ? '<ul>' + d.pend.slice(0, 30).map(p => `<li data-id="${escapeHtml(p.id)}"><b>${escapeHtml(p.n)}:</b> ${escapeHtml(p.t)}</li>`).join('') + '</ul>'
        : '<p class="s">Sin pendientes.</p>';
      }
    }
    dialog.innerHTML = h;
  }

  dialog.addEventListener('click', e => {
    if (e.target === dialog) { close(); return; }
    if (e.target.closest('.lcerrar')) { close(); return; }
    const tg = e.target.closest('[data-days]');
    if (tg) { days = Number(tg.dataset.days) === 2 ? 2 : 1; render(); return; }
    const row = e.target.closest('[data-id]');
    if (row?.dataset.id) { close(); onSelect(row.dataset.id); }
  });

  // Rob t300: non-modal so the 3D stays movable behind it; tapping outside / Esc / back closes it.
  // Rob t301: if the agenda data is for tomorrow, open showing 2 días (today + tomorrow) so it is not empty.
  function defaultDays() {
    try { const d = getModel(); if (!d?.unlocked || !d.audFecha) return 1; return d.audFecha > buildCalendar([], {days: 1}).todayYmd ? 2 : 1; } catch { return 1; }
  }
  function open(opts = {}) { who = opts.who === 'julian' ? 'julian' : 'ted'; if (!dialog.open) days = defaultDays(); render(); if (!dialog.open) { if (typeof dialog.show === 'function') dialog.show(); else dialog.open = true; } }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && dialog.open) { e.preventDefault(); close(); } });
  function close() { if (dialog.open) dialog.close(); }
  function isOpen() { return !!dialog.open; }

  return {open, close, isOpen, who: () => who, refresh: () => { if (dialog.open) render(); }, element: dialog, destroy() { close(); dialog.remove(); }};
}
