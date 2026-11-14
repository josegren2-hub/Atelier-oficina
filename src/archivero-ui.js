/** Glass filing-cabinet list and locked-mando notice. Names only; URLs open after decrypt. */
import {loadArchiveroMap, foldersFor} from './archivero-map.js';

const STYLE_ID = 'archivero-ui-style';
const CSS = `#archivero-lista{position:absolute;left:12px;right:12px;bottom:148px;z-index:40;
  background:rgba(14,20,32,.62);backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4);
  border:1px solid rgba(188,217,236,.38);border-radius:4px;padding:10px 12px 8px;color:#eef2f7;
  font-family:Inter,system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.35);}
#archivero-lista .ey{font:600 9px Inter,system-ui,sans-serif;letter-spacing:1.8px;text-transform:uppercase;color:#9aa7b6;margin:0 0 2px}
#archivero-lista h3{font:500 16px Georgia,serif;margin:0 0 2px;color:#eef2f7}
#archivero-lista .sub{font-size:10px;color:#9aa7b6;margin:0 0 8px;line-height:1.35}
#archivero-lista button{display:flex;align-items:center;gap:8px;width:100%;text-align:left;
  background:rgba(255,255,255,.06);border:1px solid rgba(188,217,236,.28);border-radius:4px;
  color:#eef2f7;padding:8px 10px;margin:0 0 6px;font:500 13px Inter,system-ui,sans-serif;cursor:pointer;}
#archivero-lista button small{display:block;font:400 10px Inter,system-ui,sans-serif;color:#9aa7b6;margin-top:1px}
#archivero-lista button .ch{margin-left:auto;color:#bcd9ec;font-size:18px;line-height:1}
#archivero-dim{position:absolute;inset:0;background:rgba(8,12,18,.28);z-index:39;}
#archivero-aviso{position:absolute;left:12px;right:12px;bottom:148px;z-index:40;
  background:rgba(14,20,32,.62);backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4);
  border:1px solid rgba(188,217,236,.38);border-radius:4px;padding:14px 14px 12px;color:#eef2f7;
  font-family:Inter,system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.35);}
#archivero-aviso p{margin:0 0 10px;font:500 14px Inter,system-ui,sans-serif;line-height:1.4}
#archivero-aviso button{border:0;border-radius:4px;background:#d7e6f0;color:#0c1824;font:600 13px Inter,system-ui,sans-serif;padding:8px 12px;cursor:pointer;}`;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.append(s);
}

function host() {
  return document.querySelector('#viewport') || document.body;
}

export function closeArchiveroUi() {
  document.getElementById('archivero-lista')?.remove();
  document.getElementById('archivero-aviso')?.remove();
  document.getElementById('archivero-dim')?.remove();
}

function mountDim() {
  const dim = document.createElement('div');
  dim.id = 'archivero-dim';
  dim.addEventListener('click', closeArchiveroUi);
  host().append(dim);
  return dim;
}

export function showArchiveroLocked() {
  ensureStyle();
  closeArchiveroUi();
  mountDim();
  const box = document.createElement('div');
  box.id = 'archivero-aviso';
  box.setAttribute('role', 'dialog');
  box.innerHTML = '<p>Para abrir las carpetas de Drive hay que abrir el mando.</p><button type="button">Entendido</button>';
  box.querySelector('button').addEventListener('click', closeArchiveroUi);
  host().append(box);
}

function openUrl(url) {
  if (!url) return;
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.assign(url);
}

export function showArchiveroList(nombre, folders) {
  ensureStyle();
  closeArchiveroUi();
  if (!folders?.length) return;
  if (folders.length === 1) {
    openUrl(folders[0].url);
    return;
  }
  mountDim();
  const box = document.createElement('div');
  box.id = 'archivero-lista';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', `Archivero de ${nombre || ''}`.trim());
  const buttons = folders.map((f, i) => {
    const path = f.path ? `<small>${f.path}</small>` : '';
    return `<button type="button" data-i="${i}"><span>${f.label || 'Carpeta'}${path}</span><span class="ch">›</span></button>`;
  }).join('');
  box.innerHTML = `<p class="ey">Archivero</p><h3>${nombre || 'Carpeta'}</h3><p class="sub">Cada opción abre directo su carpeta en Drive.</p>${buttons}`;
  box.addEventListener('click', ev => {
    const btn = ev.target.closest('button[data-i]');
    if (!btn) return;
    const folder = folders[Number(btn.dataset.i)];
    if (folder?.url) openUrl(folder.url);
  });
  host().append(box);
}

let cachedMap = null;

export function resetArchiveroCache() {
  cachedMap = null;
}

export async function openArchivero(botId, mandoSession) {
  if (!mandoSession?.unlocked || !mandoSession.key) {
    showArchiveroLocked();
    return {ok: false, reason: 'locked'};
  }
  try {
    if (!cachedMap) cachedMap = await loadArchiveroMap(mandoSession.key);
    const folders = foldersFor(cachedMap, botId);
    const nombre = cachedMap?.bots?.[botId]?.nombre || '';
    if (!folders.length) {
      showArchiveroLocked();
      return {ok: false, reason: 'empty'};
    }
    showArchiveroList(nombre, folders);
    return {ok: true, count: folders.length};
  } catch {
    cachedMap = null;
    showArchiveroLocked();
    return {ok: false, reason: 'error'};
  }
}

export const __atelierArchivero = {showArchiveroList, showArchiveroLocked, closeArchiveroUi, openArchivero, resetArchiveroCache};
if (typeof globalThis !== "undefined") globalThis.__atelierArchivero = __atelierArchivero;
