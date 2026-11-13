/** Proyectos grandes sheet: decrypts public proyectos.enc with the same mando key. Never ships project data. */
import {assertEncEnvelope, decryptEncJson} from './crypto-mando.js';
import {avatarPhotoUrl} from './avatar-photo.js';

export const PROYECTOS_URL = 'https://josegren2-hub.github.io/Oficina-bots/proyectos.enc';
export const PROYECTO_STATUSES = ['En curso', 'Esperando a Rob', 'En pausa', 'Terminado', 'Descartado'];

export function normalizeProyecto(row) {
  if (!row || typeof row !== 'object') return null;
  const nombre = String(row.nombre || row.name || row.titulo || '').trim();
  if (!nombre) return null;
  let estado = String(row.estado || row.status || 'En curso').trim();
  if (!PROYECTO_STATUSES.includes(estado)) estado = 'En curso';
  const bots = Array.isArray(row.bots) ? row.bots.map(b => String(b || '').trim()).filter(Boolean).slice(0, 6) : [];
  return {id: String(row.id || nombre), nombre, estado, nota: String(row.nota || row.detalle || '').slice(0, 240), bots};
}

export async function loadProyectosEnc({url = PROYECTOS_URL, key, fetchImpl = fetch, subtle} = {}) {
  if (!key) return {state: 'locked', proyectos: []};
  let response;
  try {
    response = await fetchImpl(url, {cache: 'no-store', credentials: 'omit'});
  } catch {
    return {state: 'missing', proyectos: []};
  }
  if (response.status === 404) return {state: 'missing', proyectos: []};
  if (!response.ok) return {state: 'missing', proyectos: []};
  let enc;
  try { enc = await response.json(); } catch { return {state: 'missing', proyectos: []}; }
  try { assertEncEnvelope(enc); } catch { return {state: 'missing', proyectos: []}; }
  try {
    const data = await decryptEncJson(key, enc, subtle);
    const list = Array.isArray(data?.proyectos) ? data.proyectos : Array.isArray(data) ? data : [];
    return {state: 'ok', proyectos: list.map(normalizeProyecto).filter(Boolean)};
  } catch {
    return {state: 'locked', proyectos: []};
  }
}

const ALIAS = {tr: null, 'apps (charly)': 'apps', charly: 'apps', 'libro (rodrigo)': 'libro', rodrigo: 'libro', tommy: 'ceo', joss: 'director', valery: 'vale', naim: 'tr-editor', dany: 'tr-cm'};
const fold = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
/** D2: map responsable labels to office bot ids. Unknown labels (por confirmar, Rob, TR) give no chip. */
export function responsableIds(names = [], officeBots = []) {
  const out = [];
  for (const raw of names || []) {
    const k = fold(raw).split('·')[0].trim();
    let id = Object.prototype.hasOwnProperty.call(ALIAS, k) ? ALIAS[k] : undefined;
    if (id === undefined) {
      const first = k.split(/[\s(]/)[0];
      if (Object.prototype.hasOwnProperty.call(ALIAS, first)) id = ALIAS[first];
      else id = officeBots.find(b => fold(b.id) === k || fold(b.name) === k || fold(b.name).split(' ')[0] === first)?.id || null;
    }
    if (id && !out.includes(id) && officeBots.some(b => b.id === id)) out.push(id);
  }
  return out;
}

export function mountProyectosPanel({getKey = () => null, onClose = () => {}, getBots = () => [], onChoose = null} = {}) {
  const el = document.createElement('div');
  el.id = 'proyectos-sheet';
  el.className = 'glass-sheet';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Proyectos grandes');
  document.body.append(el);

  function chips(p) {
    if (!onChoose) return '';
    const bots = getBots() || [];
    const ids = responsableIds(p.bots, bots);
    if (!ids.length) return '';
    return '<span class="proy-bots">' + ids.map(id => `<button type="button" class="proy-bot" data-bot="${id}" aria-label="Ver a ${bots.find(b => b.id === id)?.name || id}"><img src="${avatarPhotoUrl(id)}" alt="" width="18" height="18">${bots.find(b => b.id === id)?.name || id}</button>`).join('') + '</span>';
  }
  let filtro = 'Todos';
  el.addEventListener('click', e => {
    const f = e.target.closest?.('[data-pf]');
    if (f) { e.stopPropagation(); filtro = f.dataset.pf; render(); return; }
    const b = e.target.closest?.('[data-bot]');
    if (b && onChoose) { e.stopPropagation(); onChoose(b.dataset.bot); }
  });

  async function render() {
    const key = getKey();
    const result = await loadProyectosEnc({key});
    let body = '';
    if (result.state === 'locked') {
      body = `<p class="sheet-empty">Desbloquea el mando para ver los proyectos cifrados.</p>`;
    } else if (result.state === 'missing' || !result.proyectos.length) {
      body = `<p class="sheet-empty">Aún no hay proyectos publicados. Cuando Rob apruebe el borrador de Ted aparecerán aquí.</p>`;
    } else {
      const ps = result.proyectos;
      const n = s => ps.filter(p => p.estado === s).length;
      const F = [['Todos', 'Todos', ps.length], ['En curso', 'En curso', n('En curso')], ['Esperando a Rob', 'Esperan a Rob', n('Esperando a Rob')], ['En pausa', 'Pausa', n('En pausa')]];
      const tone = {'En curso': 'working', 'Esperando a Rob': 'review', 'En pausa': 'idle'};
      body = '<div class="proy-filtros" role="group" aria-label="Filtrar">' + F.map(([k, l, c]) => `<button type="button" data-pf="${k}" class="${filtro === k ? 'on' : ''}">${l}${k === 'Todos' ? '' : ' ' + c}</button>`).join('') + '</div>';
      const vis = ps.filter(p => filtro === 'Todos' || p.estado === filtro);
      body += '<ul class="proy-list">' + vis.map(p =>
        `<li class="proy-row" data-estado="${p.estado}"><div class="proy-h"><strong>${p.nombre}</strong><span class="proy-st"><i class="sj-dot st-${tone[p.estado] || 'idle'}"></i>${p.estado === 'Esperando a Rob' ? 'Espera a Rob' : p.estado}</span></div>${p.nota ? `<small>${p.nota}</small>` : ''}${chips(p)}</li>`
      ).join('') + '</ul>';
      el.dataset.count = String(ps.length);
    }
    el.innerHTML = `<div class="sheet-top"><div><p class="eyebrow">Proyectos${el.dataset.count ? ' · ' + el.dataset.count : ''}</p><h2>Metas grandes</h2></div><button type="button" class="icon-btn sheet-close" aria-label="Cerrar">${''}</button></div>${body}`;
    const closeBtn = el.querySelector('.sheet-close');
    if (closeBtn) {
      closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      closeBtn.addEventListener('click', () => { close(); onClose(); });
    }
  }

  function open() {
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('open'));
    render();
  }
  function close() {
    el.classList.remove('open');
    const done = () => { el.hidden = true; el.removeEventListener('transitionend', done); };
    el.addEventListener('transitionend', done);
    setTimeout(done, 280);
  }
  return {element: el, open, close, isOpen: () => !el.hidden && el.classList.contains('open'), refresh: render};
}
