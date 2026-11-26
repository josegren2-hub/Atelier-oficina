/** Vista calendario de la pestaña Agendas (F1s).
 *  Recibe los mismos eventos que ya lee el Centro de mando. No inventa citas ni lee la clave. */
export const TZ = 'America/Chihuahua';
export const PX_PER_MIN = 1.2;
export const MIN_HEIGHT = 44;

export function ymdChihuahua(d = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', {timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(d);
  const g = k => p.find(x => x.type === k)?.value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}

export function addDays(ymd, n) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d) + n * 86400000 + 18 * 3600000;
  return ymdChihuahua(new Date(utc));
}

export function minutesOf(hora) {
  const m = /^(\d{1,2})[:.h](\d{2})/.exec(String(hora || '').trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h >= 0 && h < 24 && mi >= 0 && mi < 60 ? h * 60 + mi : null;
}

export function fmtHour(min) {
  const h = Math.floor(min / 60), m = ((min % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Hora actual en America/Chihuahua, en minutos desde medianoche. */
export function nowMinutes(d = new Date()) {
  const p = new Intl.DateTimeFormat('en-GB', {timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(d);
  const g = k => Number(p.find(x => x.type === k)?.value);
  return g('hour') * 60 + g('minute');
}

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

export function groupClusters(events = []) {
  const list = events.slice().sort((a, b) => a.start - b.start);
  const clusters = [];
  let cur = [], end = -1;
  for (const e of list) {
    if (cur.length && e.start >= end) {
      clusters.push({events: cur});
      cur = [];
      end = -1;
    }
    cur.push(e);
    end = Math.max(end, e.start + (e.dur || 60));
  }
  if (cur.length) clusters.push({events: cur});
  return clusters;
}

export function maxConcurrency(events = []) {
  const pts = [];
  for (const e of events) {
    pts.push([e.start, 1], [e.start + (e.dur || 60), -1]);
  }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let n = 0, max = 0;
  for (const [, d] of pts) { n += d; max = Math.max(max, n); }
  return max;
}

/** Si coinciden 3 o más a la vez, deja 2 en columnas y el resto detrás de +N. */
export function compactCluster(cluster) {
  const evs = cluster.events.slice().sort((a, b) => a.start - b.start || (b.dur || 60) - (a.dur || 60));
  const peak = maxConcurrency(evs);
  cluster.maxConc = peak;
  if (peak < 3) {
    evs.forEach(e => { e.hidden = false; e.plusGutter = false; });
    cluster.compact = false;
    cluster.hidden = [];
    cluster.plus = 0;
    return cluster;
  }
  const shown = evs.slice(0, 2);
  const hidden = evs.slice(2);
  shown.forEach((e, i) => { e.lane = i; e.lanes = 2; e.hidden = false; e.plusGutter = true; });
  hidden.forEach(e => { e.hidden = true; });
  cluster.compact = true;
  cluster.shown = shown;
  cluster.hidden = hidden;
  cluster.plus = hidden.length;
  cluster.top = Math.min(...evs.map(e => e.start));
  cluster.bottom = Math.max(...evs.map(e => e.start + (e.dur || 60)));
  return cluster;
}

export function layoutDay(items, ymd) {
  const allDay = items.filter(e => e.fecha === ymd && (e.todoElDia || (!e.hora && !e.fin)));
  const timed = items.filter(e => e.fecha === ymd && e.hora && !e.todoElDia).map(e => {
    const start = minutesOf(e.hora);
    const endM = minutesOf(e.fin);
    const dur = start != null && endM != null && endM > start ? endM - start : 60;
    return {...e, start, dur, sinFin: !e.fin};
  }).filter(e => e.start != null);
  assignLanes(timed);
  const clusters = groupClusters(timed).map(c => compactCluster(c));
  let first = 8 * 60, last = 19 * 60;
  for (const e of timed) {
    first = Math.min(first, Math.floor(e.start / 60) * 60);
    last = Math.max(last, Math.ceil((e.start + e.dur) / 60) * 60);
  }
  return {allDay, events: timed, clusters, first, last};
}

const state = {
  view: 'calendario',
  dia: 'hoy',
  expanded: {},
};

function markToggle(b, on) {
  b.classList.add('ag-toggle');
  b.setAttribute('aria-pressed', String(!!on));
  if (on) {
    b.classList.add('ag-on');
    b.style.setProperty('background', '#bcd9ec', 'important');
    b.style.setProperty('background-color', '#bcd9ec', 'important');
    b.style.setProperty('color', '#131c26', 'important');
    b.style.setProperty('border-color', '#7aa3bc', 'important');
  }
}

function paintEvent(block, tipo) {
  const cal = tipo === 'cal';
  block.style.setProperty('background', cal ? '#2a4158' : '#3a2c4e', 'important');
  block.style.setProperty('border-left', cal ? '3px solid #6fb2ff' : '3px solid #ba85ea', 'important');
}

/** Pinta Hoy/Mañana, Calendario/Lista y el tablero o la lista del día dentro de `content`. */
export function renderAgendaCalendario({el, button, content, dialog, items = [], name = '', render} = {}) {
  const today = ymdChihuahua();
  const ymd = state.dia === 'manana' ? addDays(today, 1) : today;
  const dayItems = items.filter(e => e && String(e.fecha || '').slice(0, 10) === ymd);
  if (dialog) {
    dialog.classList.toggle('agenda-cal-view', state.view === 'calendario');
    dialog.classList.toggle('agenda-lista-view', state.view === 'lista');
  }

  const toolbar = el('div', undefined, 'ag-toolbar');
  const days = el('div', undefined, 'ag-days');
  days.setAttribute('role', 'group');
  days.setAttribute('aria-label', 'Día');
  for (const [id, label] of [['hoy', 'Hoy'], ['manana', 'Mañana']]) {
    const b = button(label, () => { state.dia = id; render(); }, 'ag-toggle');
    markToggle(b, id === state.dia);
    days.append(b);
  }
  const views = el('div', undefined, 'ag-views');
  views.setAttribute('role', 'group');
  views.setAttribute('aria-label', 'Tipo de vista');
  for (const [id, label] of [['calendario', 'Calendario'], ['lista', 'Lista']]) {
    const b = button(label, () => { state.view = id; render(); }, 'ag-toggle');
    markToggle(b, id === state.view);
    views.append(b);
  }
  toolbar.append(days, views);
  content.append(toolbar);

  const legend = el('ul', undefined, 'ag-legend');
  legend.setAttribute('aria-label', 'Leyenda');
  legend.innerHTML = '<li class="ag-leg-cal"><i></i>Calendario</li><li class="ag-leg-aud"><i></i>Audiencia</li>';
  content.append(legend);

  if (state.view === 'lista') {
    renderLista(dayItems, ymd, {el, content, name});
    return;
  }
  renderCalendario(dayItems, ymd, {el, button, content, render});
}

function renderLista(items, ymd, {el, content, name}) {
  const schedule = el('section', undefined, 'ag-lista');
  schedule.setAttribute('aria-label', `Compromisos de ${name}`);
  schedule.append(el('h3', state.dia === 'manana' ? 'Mañana' : 'Hoy'));
  if (!items.length) {
    const block = el('div', undefined, 'cc-empty');
    block.append(el('h3', 'Sin eventos en este día'), el('p', 'No hay eventos para este día en la fuente conectada.'));
    schedule.append(block);
    content.append(schedule);
    return;
  }
  for (const e of items) {
    const card = el('article', undefined, 'ag-li cc-ag-' + (e.tipo === 'cal' ? 'cal' : 'aud'));
    const rango = e.todoElDia || (!e.hora && !e.fin) ? 'Todo el día' : (e.hora ? e.hora + (e.fin ? '–' + e.fin : ' · sin hora de fin') : 'Sin hora');
    card.append(
      el('span', e.tipo === 'cal' ? 'Calendario' : 'Audiencia', 'ag-li-kind'),
      el('h4', e.titulo, 'ag-li-title'),
      el('p', rango, 'ag-li-hora'),
    );
    if (e.lugar) card.append(el('p', e.lugar, 'ag-li-lugar'));
    schedule.append(card);
  }
  content.append(schedule);
}

function renderCalendario(items, ymd, {el, button, content, render}) {
  const layout = layoutDay(items, ymd);
  const {allDay, events, clusters, first, last} = layout;
  const nowMin = nowMinutes();

  const allday = el('div', undefined, 'ag-allday');
  const lab = el('p', undefined, 'ag-allday-lab');
  lab.innerHTML = 'Todo el<br>día';
  const chips = el('div', undefined, 'ag-allday-chips');
  if (!allDay.length) chips.append(el('p', 'Ninguno este día', 'ag-allday-empty'));
  for (const e of allDay) {
    const chip = el('div', undefined, 'ag-chip ag-chip-' + (e.tipo === 'cal' ? 'cal' : 'aud'));
    chip.append(el('b', e.titulo, 'ag-ev-title'));
    chips.append(chip);
  }
  allday.append(lab, chips);
  content.append(allday);

  const hours = (last - first) / 60;
  const height = hours * PX_PER_MIN * 60;
  const board = el('div', undefined, 'ag-board');
  board.style.setProperty('--ag-h', `${height}px`);
  const rail = el('div', undefined, 'ag-rail');
  const grid = el('div', undefined, 'ag-grid');
  for (let t = first; t < last; t += 60) {
    const row = el('div', undefined, 'ag-hour');
    row.style.top = `${(t - first) * PX_PER_MIN}px`;
    row.style.height = `${60 * PX_PER_MIN}px`;
    row.append(el('span', fmtHour(t), 'ag-hour-lab'));
    rail.append(row);
    const line = el('div', undefined, 'ag-hline');
    line.style.top = `${(t - first) * PX_PER_MIN}px`;
    grid.append(line);
  }
  for (const e of events.filter(ev => !ev.hidden)) {
    const lanes = e.lanes || 1;
    const lane = e.lane || 0;
    const top = (e.start - first) * PX_PER_MIN;
    const h = Math.max(MIN_HEIGHT, e.dur * PX_PER_MIN);
    const block = el('article', undefined, 'ag-ev ag-ev-' + (e.tipo === 'cal' ? 'cal' : 'aud'));
    block.style.top = `${top}px`;
    block.style.height = `${h}px`;
    const inner = e.plusGutter ? 'calc(100% - 32px)' : '100%';
    block.style.left = `calc(${lane / lanes} * ${inner} + ${lane ? 2 : 0}px)`;
    block.style.width = `calc(${1 / lanes} * ${inner} - ${lanes > 1 ? 2 : 0}px)`;
    paintEvent(block, e.tipo);
    const rango = `${e.hora}${e.fin ? '–' + e.fin : ''}${e.sinFin ? ' · 1 h (sin fin)' : ''}`;
    block.append(el('b', e.titulo, 'ag-ev-title'), el('small', rango, 'ag-ev-time'));
    if (e.lugar) block.append(el('span', e.lugar, 'ag-ev-lugar'));
    block.title = `${e.titulo} · ${rango}`;
    grid.append(block);
  }
  for (const c of clusters) {
    if (!c.compact || !c.plus) continue;
    const key = 'c' + c.top;
    const top = (c.top - first) * PX_PER_MIN;
    const h = Math.max(MIN_HEIGHT, (c.bottom - c.top) * PX_PER_MIN);
    const plus = button('+' + c.plus, () => {
      state.expanded[key] = !state.expanded[key];
      render();
    }, 'ag-plus');
    plus.setAttribute('aria-expanded', String(!!state.expanded[key]));
    plus.setAttribute('aria-label', `${c.plus} eventos más en este horario`);
    plus.style.top = `${top + 4}px`;
    plus.style.right = '0';
    plus.style.left = 'auto';
    plus.style.width = '32px';
    grid.append(plus);
    if (state.expanded[key]) {
      const pop = el('div', undefined, 'ag-plus-list');
      pop.style.top = `${top + h + 4}px`;
      pop.append(el('p', 'También a esta hora', 'ag-plus-hd'));
      for (const e of c.hidden) {
        const row = el('div', undefined, 'ag-plus-row ag-ev-' + (e.tipo === 'cal' ? 'cal' : 'aud'));
        row.append(
          el('b', e.titulo, 'ag-ev-title'),
          el('small', `${e.hora}${e.fin ? '–' + e.fin : ''}`, 'ag-ev-time'),
        );
        pop.append(row);
      }
      grid.append(pop);
    }
  }
  if (nowMin >= first && nowMin <= last && ymd === ymdChihuahua()) {
    const now = el('div', undefined, 'ag-now');
    now.style.top = `${(nowMin - first) * PX_PER_MIN}px`;
    now.setAttribute('aria-label', `Ahora, ${fmtHour(nowMin)}`);
    const tag = el('span', undefined, 'ag-now-lab');
    tag.setAttribute('aria-hidden', 'true');
    tag.append(el('i', undefined, 'ag-now-dot'), el('em', fmtHour(nowMin)));
    tag.style.top = `${(nowMin - first) * PX_PER_MIN}px`;
    rail.append(tag);
    grid.insertBefore(now, grid.firstChild);
  }
  board.append(rail, grid);
  content.append(board);
}

/** Para pruebas: deja el selector en el estado inicial. */
export function resetAgendaCalendarioState() {
  state.view = 'calendario';
  state.dia = 'hoy';
  state.expanded = {};
}
