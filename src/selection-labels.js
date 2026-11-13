/** HTML selection labels above avatars: circular photo + name + status (C21/C27, Rob t295).
 *  Lightweight: each pin's HTML is built once and rebuilt only when its content changes;
 *  positions move via transform each frame (C41); frozen while a panel is open.
 *  s9d (Rob t370u): no "+N" clustering — each bot keeps its own circle, even if they overlap.
 *  Overlay lives on #canvas-container (same layer as the WebGL canvas), like Oficina-bots.
 *  s9e (Rob t375u): pin *visuals* are painted on a 2D canvas in the same frame as the 3D,
 *  because CSS transforms can stay frozen on Android while a finger is down. */
import {statusLabels} from './data.js';
import {avatarPhotoUrl} from './avatar-photo.js';

const statusClass = status => status === 'working' ? 'trabajando' : status === 'review' ? 'te' : status === 'idle' ? 'pausa' : status === 'error' ? 'error' : 'unknown';

function panelOpen() {
  if (typeof document === 'undefined') return false;
  const b = document.body;
  if (b && (b.classList.contains('equipo-abierto') || b.classList.contains('sheet-open'))) return true;
  try { return !!document.querySelector('dialog[open]:not(.pizarron-dialog),#mas-panel.open,#paneles-sheet.open,.proy-sheet.open'); } catch { return false; }
}

export function mountSelectionLabels({
  getSnapshot = () => ({}),
  getSelected = () => null,
  projectBots = () => [],
  getActivity = () => null,
  onSelect = () => {},
  container = document.body,
} = {}) {
  const capa = document.createElement('div');
  capa.id = 'capa-sel';
  capa.className = 'capa-sel capa-sel-canvas-on';
  capa.setAttribute('aria-hidden', 'false');
  container.append(capa);
  const draw = document.createElement('canvas');
  draw.className = 'capa-sel-draw';
  draw.setAttribute('aria-hidden', 'true');
  container.append(draw);
  const pins = new Map();
  const BORDER = {trabajando:'#22c55e', te:'#ffcb65', pausa:'#94a3b8', error:'#f17c81', unknown:'#64748b'};

  function strokeOf(el) {
    const img = el.querySelector('img');
    if (img) {
      const c = getComputedStyle(img).borderColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
    }
    const st = [...el.classList].find(k => k in BORDER);
    return BORDER[st] || BORDER.unknown;
  }

  function paintCanvas(items, byId) {
    const w = capa.clientWidth, h = capa.clientHeight;
    if (w <= 0 || h <= 0) return;
    // C21 / s7d / s9d: in far Edificio cerrado, body.v17lejos hides HTML pins.
    // The 2D canvas must honor the same rule or every bot piles on the facade (Rob t377u).
    if (typeof document !== 'undefined' && document.body.classList.contains('v17lejos')) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const tw = Math.max(1, Math.round(w * dpr)), th = Math.max(1, Math.round(h * dpr));
      if (draw.width !== tw || draw.height !== th) { draw.width = tw; draw.height = th; }
      draw.getContext('2d').clearRect(0, 0, draw.width, draw.height);
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const tw = Math.max(1, Math.round(w * dpr)), th = Math.max(1, Math.round(h * dpr));
    if (draw.width !== tw || draw.height !== th) { draw.width = tw; draw.height = th; }
    const ctx = draw.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (const item of items) {
      const rec = pins.get(item.id);
      const bot = byId.get(item.id);
      if (!rec || !bot) continue;
      const img = rec.el.querySelector('img');
      const em = rec.el.querySelector('em');
      const size = 34;
      const name = em && em.textContent ? em.textContent : '';
      const nameH = name ? 15 : 0;
      const cx = item.x;
      const cy = item.y - 2 - nameH - size / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.clip();
      if (img && img.complete && img.naturalWidth) {
        ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
      } else {
        ctx.fillStyle = '#e8edf5';
        ctx.fill();
        if (img && !img.dataset.repaintBound) {
          img.dataset.repaintBound = '1';
          img.addEventListener('load', () => { try { paint(); } catch {} }, {once: true});
        }
      }
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2 - 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = strokeOf(rec.el);
      ctx.lineWidth = 3;
      ctx.stroke();
      // status dot
      const dot = statusClass(bot.status);
      const dotC = BORDER[dot] || BORDER.unknown;
      ctx.beginPath();
      ctx.arc(cx + size / 2 - 3, cy + size / 2 - 8, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = dotC;
      ctx.fill();
      ctx.strokeStyle = '#0e1118';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (name) {
        ctx.font = '700 10px Inter,system-ui,sans-serif';
        const tw = Math.min(78, ctx.measureText(name).width + 12);
        const nx = cx - tw / 2, ny = item.y - 14;
        ctx.fillStyle = '#fffffff0';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(nx, ny, tw, 14, 7);
        else { ctx.rect(nx, ny, tw, 14); }
        ctx.fill();
        ctx.fillStyle = '#141820';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, cx, ny + 7, 74);
      }
    }
  }

  function ensure(id) {
    let rec = pins.get(id);
    if (rec) return rec;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'v17pin';
    el.dataset.id = id;
    el.addEventListener('click', e => { e.stopPropagation(); onSelect(id); });
    capa.append(el);
    rec = {el, key: '', cls: '', tf: '', shown: true};
    pins.set(id, rec);
    return rec;
  }

  function paint() {
    const snapshot = getSnapshot() || {};
    const selected = getSelected();
    const byId = new Map((snapshot.bots || []).map(b => [b.id, b]));
    const projected = (projectBots() || []).filter(i => i?.id && !i.hidden && byId.has(i.id));
    // s9d (Rob t370u): every visible bot keeps its own photo on its head. Overlap is OK.
    const seen = new Set();
    for (const item of projected) {
      seen.add(item.id);
      const bot = byId.get(item.id);
      const rec = ensure(item.id);
      const act = getActivity?.(bot.id);
      const bub = act?.bubble || '';
      const st = statusClass(bot.status);
      const first = String(bot.name || bot.id).split(/\s*·\s*/)[0];
      const key = `${st}|${bub}|${first}`;
      if (key !== rec.key) {
        rec.key = key;
        // C47 (Rob t306): photo ring shows the STATUS color (CSS by class), not the bot's own color.
        rec.el.setAttribute('aria-label', `${bot.name}, ${statusLabels[bot.status] || 'Sin señal'}`);
        rec.el.innerHTML = `<span class="stem" aria-hidden="true"></span>`
          + (bub ? `<i class="bub${act?.status === 'review' ? ' te' : ''}${bub.includes('✅') ? ' ok' : ''}">${bub}</i>` : '')
          + `<img src="${avatarPhotoUrl(bot.id)}" alt="" width="40" height="40" decoding="async">`
          + `<span class="sd" aria-hidden="true"></span>`
          + `<em>${first}</em>`;
      }
      const cls = `v17pin chico v21 ${st}${selected === bot.id ? ' sel' : ''}`;
      if (cls !== rec.cls) { rec.cls = cls; rec.el.className = cls; }
      const tf = `translate(${item.x.toFixed(1)}px, ${item.y.toFixed(1)}px) translate(-50%, -100%)`;
      if (tf !== rec.tf) { rec.tf = tf; rec.el.style.transform = tf; }
      if (!rec.shown) { rec.shown = true; rec.el.style.display = ''; }
    }
    for (const [id, rec] of pins) {
      if (!seen.has(id) && rec.shown) { rec.shown = false; rec.el.style.display = 'none'; }
    }
    paintCanvas(projected, byId);
  }

  // Only paint after a 3D frame (Rob t369u): an independent loop would move pins
  // against a stale canvas whenever the 3D tick is busy or skips a frame.
  globalThis.__atelierAfterRender = () => { if (panelOpen()) return; paint(); };

  return {
    element: capa,
    refresh: paint,
    destroy() {
      globalThis.__atelierAfterRender = null;
      capa.remove();
      draw.remove();
      pins.clear();
    },
  };
}
