/** s22/s23 (Rob t459u/t460u/t462u): Registro del piso Tinta Rosa — Semana · Historial · Pendientes · Estadísticas.
 * Historial: API pública de tintarosa.mx (en vivo, sin claves). Semana, pendientes y estadísticas: tintarosa.enc,
 * cifrado como mando.enc; solo se abre con el mando. No guarda claves. */
import {assertEncEnvelope, decryptEncJson} from './crypto-mando.js';

export const TR_FLOOR_ID = 4;
export const TR_API = 'https://tintarosa.mx/wp-json/wp/v2/posts?per_page=15&_fields=date,link,title,slug';
export const REDES = [['web', 'Web'], ['fb', 'FB'], ['ig', 'IG'], ['x', 'X'], ['bluesky', 'Bluesky']];
const ESTADO = {
  'salio': ['ok', 'salió'],
  'programado': ['plan', 'programado'],
  'sin-confirmar': ['warn', 'sin confirmar'],
  'no-va': ['off', 'no va'],
};
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}
const decode = s => String(s ?? '').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/<[^>]*>/g, '');

export function tintaEncUrl(base = import.meta.env?.BASE_URL || '/') {
  return `${base.endsWith('/') ? base : base + '/'}tintarosa.enc`;
}

/** WordPress `date` is site-local (Chihuahua). */
export function fechaCorta(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(iso || ''));
  if (!m) return '';
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${DIAS[d.getUTCDay()]} ${+m[3]} ${MESES[+m[2] - 1]} · ${m[4]}:${m[5]}`;
}

export function historialDesdeApi(posts = []) {
  return (Array.isArray(posts) ? posts : []).map(p => ({
    slug: p.slug, link: p.link, fecha: p.date, cuando: fechaCorta(p.date), titulo: decode(p.title?.rendered ?? p.title),
  })).filter(p => p.slug && p.link && /^https:\/\/tintarosa\.mx\//.test(p.link));
}

/** Web status refreshed live: if the slug is already on tintarosa.mx it counts as published. */
export function estadoConVivo(fila, vivos = []) {
  const estado = {...(fila?.estado || {})};
  const hit = fila?.slug && vivos.find(p => p.slug === fila.slug);
  if (hit) estado.web = {e: 'salio', hora: String(hit.fecha).slice(11, 16), link: hit.link};
  return estado;
}

export function chipsHtml(estado = {}) {
  return REDES.map(([k, label]) => {
    const st = estado[k]?.e || 'no-va';
    const [tone, txt] = ESTADO[st] || ESTADO['no-va'];
    const hora = st === 'salio' && estado[k]?.hora ? ` ${esc(estado[k].hora)}` : '';
    return `<span class="tr-chip tr-${tone}">${label} · ${txt}${hora}</span>`;
  }).join('');
}

export const mayus = t => { const x = String(t ?? ''); return x.charAt(0).toUpperCase() + x.slice(1); };
export function fechaLarga(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? `${+m[3]} ${MESES[+m[2] - 1]} ${m[1]}` : String(iso || ''); }

export function hoyIso(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Chihuahua', year: 'numeric', month: '2-digit', day: '2-digit'}).format(now);
}

export async function loadTintaRosa(key, {fetcher = fetch, subtle = globalThis.crypto?.subtle, url = tintaEncUrl()} = {}) {
  if (!key) throw new Error('mando-locked');
  const r = await fetcher(`${url}?t=${Date.now()}`, {cache: 'no-store', credentials: 'omit', headers: {Accept: 'application/json'}});
  if (!r.ok) throw new Error(`tintarosa-enc-${r.status}`);
  const enc = await r.json();
  assertEncEnvelope(enc);
  return decryptEncJson(key, enc, subtle);
}

export async function loadHistorial({fetcher = fetch, url = TR_API} = {}) {
  const r = await fetcher(url, {credentials: 'omit', headers: {Accept: 'application/json'}});
  if (!r.ok) throw new Error(`wp-${r.status}`);
  return historialDesdeApi(await r.json());
}

export function mountTintaRegistro({getKey, onOpenMando, container = document.body, fetcher, now = () => new Date()} = {}) {
  const dialog = document.createElement('dialog');
  dialog.id = 'tr-registro';
  dialog.className = 'resumen-dialog tr-dialog';
  dialog.setAttribute('aria-labelledby', 'tr-registro-title');
  const emblema = `${(typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || './'}`.replace(/\/?$/, '/') + 'tr-emblema.svg';
  dialog.innerHTML = `<div class="lt"><div class="tr-brand"><img class="tr-emblema" src="${emblema}" alt=""><div><p class="eyebrow">Piso Tinta Rosa</p><b id="tr-registro-title">Registro</b></div></div><button type="button" data-close aria-label="Cerrar">✕</button></div>
  <div class="tr-tabs" role="tablist">${[['semana', 'Semana'], ['historial', 'Historial'], ['pendientes', 'Pendientes'], ['stats', 'Estadísticas']]
    .map(([id, l], i) => `<button type="button" class="tr-tab" role="tab" data-tab="${id}" aria-selected="${i === 0}">${l}</button>`).join('')}</div>
  <div class="tr-body" role="tabpanel"></div>`;
  container.appendChild(dialog);
  const body = dialog.querySelector('.tr-body');
  let tab = 'semana', privado = null, privErr = null, vivos = null, vivoErr = null, cargando = false;

  dialog.querySelector('[data-close]').addEventListener('click', () => close());
  dialog.addEventListener('click', e => { if (e.target === dialog) close(); });
  dialog.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; paint(); }));

  const f = fetcher || ((...a) => fetch(...a));
  async function cargar() {
    if (cargando) return; cargando = true;
    const key = getKey?.() || null;
    const tasks = [loadHistorial({fetcher: f}).then(v => { vivos = v; vivoErr = null; }).catch(e => { vivoErr = e; })];
    if (key) tasks.push(loadTintaRosa(key, {fetcher: f}).then(v => { privado = v; privErr = null; }).catch(e => { privado = null; privErr = e; }));
    else { privado = null; privErr = null; }
    await Promise.all(tasks);
    cargando = false;
    paint();
  }

  function locked() {
    return `<div class="tr-lock"><p>Lo programado, los pendientes y las estadísticas van cifrados. Abre el mando para verlos.</p><button type="button" data-mando>Abrir el mando</button></div>`;
  }
  function privMsg() {
    if (!getKey?.()) return locked();
    if (privErr) return `<p class="tr-note">No se pudo abrir el registro cifrado (${esc(String(privErr.message || privErr).slice(0, 40))}). Se vuelve a generar en la caja; intenta más tarde.</p>`;
    if (!privado) return '<p class="tr-note">Cargando…</p>';
    return '';
  }

  function semana() {
    const m = privMsg(); if (m) return m;
    const hoy = hoyIso(now());
    const filas = privado.semana?.filas || [];
    return `<div class="tr-week"><b>${esc(privado.semana?.rango || '')}</b><span>Hora de Chihuahua</span></div>
    ${filas.map(fi => `<article class="tr-row${fi.fecha === hoy ? ' tr-today' : ''}">
      <div class="tr-when"><span class="tr-day">${esc(fi.dia)}${fi.fecha === hoy ? ' · hoy' : ''}</span><span class="tr-hora">${esc(fi.horas)}</span></div>
      <p class="tr-title">${esc(fi.nota)}</p>
      <div class="tr-chips">${fi.fecha === hoy ? '<span class="tr-chip tr-hoy">Hoy</span>' : ''}${chipsHtml(estadoConVivo(fi, vivos || []))}${fi.historia ? '<span class="tr-chip tr-off">+ historia</span>' : ''}</div>
    </article>`).join('') || '<p class="tr-note">No hay calendario en el paquete de esta semana.</p>'}
    <p class="tr-foot">Fuente: paquete semanal autorizado (${esc(privado.semana?.fuente || '')}). «Sin confirmar» = su hora ya pasó y no hay bitácora de esa red. La web se revisa en vivo en tintarosa.mx.</p>`;
  }

  function historial() {
    if (vivoErr) return `<p class="tr-note">No se pudo leer tintarosa.mx ahora. Revisa tu conexión y vuelve a abrir.</p>`;
    if (!vivos) return '<p class="tr-note">Cargando…</p>';
    return `<p class="tr-sub">Salieron en la web · últimas ${vivos.length}</p>${vivos.map(p => `<a class="tr-row tr-link" href="${esc(p.link)}" target="_blank" rel="noopener">
      <span class="tr-day">${esc(p.cuando)}</span><span class="tr-title">${esc(p.titulo)}</span><span class="tr-url">${esc(p.link.replace(/^https:\/\//, ''))}</span></a>`).join('')}
    <p class="tr-foot">En vivo desde tintarosa.mx. Las redes de cada nota se anotan en su bitácora; aquí solo va la web.</p>`;
  }

  function pendientes() {
    const m = privMsg(); if (m) return m;
    const ps = privado.pendientes || [];
    return ps.length ? ps.map(p => `<div class="tr-pend tr-p-${esc(p.tipo)}"><b>${esc(p.titulo)}</b><p>${esc(mayus(p.detalle))}</p></div>`).join('')
      : '<p class="tr-note">Sin pendientes.</p>';
  }

  function stats() {
    const m = privMsg(); if (m) return m;
    const s = privado.stats || {};
    return `${s.viejo ? `<p class="tr-old">Corte viejo: ${esc(fechaLarga(s.corte))}. No hay cifras más nuevas en archivo.</p>` : ''}
    <table class="tr-table"><thead><tr><th>Canal</th><th>Cifra</th><th>Corte</th></tr></thead><tbody>
    ${(s.filas || []).map(r => `<tr><td>${esc(r.canal)}<small>${esc(r.dato)}</small></td><td class="tr-num">${r.cifra == null ? '—' : esc(r.cifra)}</td><td class="tr-mut">${esc(r.corte)}</td></tr>`).join('')}
    </tbody></table><p class="tr-foot">${esc(s.fuente || '')}</p>`;
  }

  function paint() {
    dialog.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    body.innerHTML = tab === 'historial' ? historial() : tab === 'pendientes' ? pendientes() : tab === 'stats' ? stats() : semana();
    body.querySelector('[data-mando]')?.addEventListener('click', () => { close(); onOpenMando?.(); });
    body.scrollTop = 0;
  }

  function open() {
    tab = 'semana';
    if (!dialog.open) { if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', ''); }
    paint(); cargar();
  }
  function close() { if (dialog.open) { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); } }
  return {open, close, isOpen: () => dialog.open, refresh: () => { if (dialog.open) cargar(); }, dialog};
}
