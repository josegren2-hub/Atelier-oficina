/** HTML selection labels above avatars: circular photo + name + status (C21/C27, Rob t295).
 *  Lightweight: each pin's HTML is built once and rebuilt only when its content changes;
 *  positions move via transform each frame (C41); frozen while a panel is open.
 *  s9d (Rob t370u): no "+N" clustering — each bot keeps its own circle, even if they overlap.
 *  Overlay lives on #canvas-container (same layer as the WebGL canvas), like Oficina-bots.
 *  s9e (Rob t375u): pin *visuals* are painted on a 2D canvas in the same frame as the 3D,
 *  because CSS transforms can stay frozen on Android while a finger is down.
 *  s13 (Rob t410u): chrome (view menu, dock, header, floors, sheets) stacks above the pin
 *  canvas; pins that sit under those zones are not painted and do not steal taps. */
import {statusLabels} from './data.js';
import {avatarPhotoUrl} from './avatar-photo.js';

const statusClass = status => status === 'working' ? 'trabajando' : status === 'review' ? 'te' : status === 'idle' ? 'pausa' : status === 'error' ? 'error' : 'unknown';


/** Axis-aligned overlap. Rects are {x,y,w,h}. */
export function rectsOverlap(a, b) {
  if (!a || !b) return false;
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Approximate pin visual box: photo + name, anchored at the projected feet (item.x, item.y). */
/** s16 (Rob t424u): opción B del boceto, ~40 % más chicos que s15.
 *  Foto 20.5, letra 9 px (piso legible en el Android), etiqueta 13×47 máx.,
 *  puntito 5 px (radio 2.5). pinBox usa el tamaño visual, no la zona de toque. */
export const PIN = {
  size: 20.5,
  fontPx: 9,
  border: 1.75,
  labelPadX: 7,
  labelMaxW: 47,
  labelH: 13,
  nameGap: 14,
  dotR: 2.5,
  nameW: 48,
  nameHBox: 17,
  touchMin: 44,
};

export function pinBox(item, size = PIN.size, nameW = PIN.nameW, nameH = PIN.nameHBox) {
  // El recuadro incluye la zona de toque mínima (44 px), para no dejar hits bajo el menú.
  const w = Math.max(size, nameW, PIN.touchMin);
  const h = Math.max(size + nameH, PIN.touchMin);
  return {x: item.x - w / 2, y: item.y - h, w, h};
}

export const CHROME_SELECTORS = [
  '#vista-toolbar',
  '#dock',
  '#app > header',
  'header.chrome-top',
  '#floors',
  'dialog[open]',
  '#mas-panel.open',
  '#paneles-sheet.open',
  '.proy-sheet.open',
  'aside.team',
  '#ficha-flotante.open',
];

/** Chrome rectangles in the same coordinate space as projectBots (container client space). */
export function chromeRectsIn(container, doc = typeof document !== 'undefined' ? document : null) {
  if (!container || !doc || typeof container.getBoundingClientRect !== 'function') return [];
  const crect = container.getBoundingClientRect();
  const out = [];
  for (const sel of CHROME_SELECTORS) {
    let els;
    try { els = doc.querySelectorAll(sel); } catch { continue; }
    for (const el of els) {
      if (el.id === 'capa-sel' || el.classList?.contains('capa-sel') || el.classList?.contains('capa-sel-draw') || el.closest?.('#capa-sel')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      let hidden = false;
      try {
        const st = (doc.defaultView || globalThis).getComputedStyle?.(el);
        if (st && (st.display === 'none' || st.visibility === 'hidden' || st.pointerEvents === 'none' && (st.opacity === '0' || Number(st.opacity) === 0))) hidden = true;
        // Equipo sheet stays in DOM when closed (visibility:hidden / opacity 0).
        if (st && (st.visibility === 'hidden' || Number.parseFloat(st.opacity || '1') === 0)) hidden = true;
      } catch {}
      if (hidden) continue;
      out.push({x: r.left - crect.left, y: r.top - crect.top, w: r.width, h: r.height});
    }
  }
  return out;
}

export function pinBlockedByChrome(box, chromeRects) {
  return (chromeRects || []).some((r) => rectsOverlap(box, r));
}


function panelOpen() {
  if (typeof document === 'undefined') return false;
  const b = document.body;
  if (b && (b.classList.contains('equipo-abierto') || b.classList.contains('sheet-open'))) return true;
  try { return !!document.querySelector('dialog[open]:not(.pizarron-dialog),#mas-panel.open,#paneles-sheet.open,.proy-sheet.open,#ficha-flotante.open'); } catch { return false; }
}

/** true si hay que (re)pintar posiciones; false si el panel sigue abierto y las posiciones ya se congelaron (t369u). El ocultado bajo chrome puede repetirse aparte (t425u). */
export function shouldPaintPins(panelIsOpen, alreadyPaintedWhileOpen) {
  return !(panelIsOpen && alreadyPaintedWhileOpen);
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
      const size = PIN.size;
      const name = em && em.textContent ? em.textContent : '';
      const nameH = name ? PIN.nameGap : 0;
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
      ctx.arc(cx, cy, size / 2 - 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = strokeOf(rec.el);
      ctx.lineWidth = PIN.border;
      ctx.stroke();
      // status dot
      const dot = statusClass(bot.status);
      const dotC = BORDER[dot] || BORDER.unknown;
      ctx.beginPath();
      ctx.arc(cx + size / 2 - 1.8, cy + size / 2 - 4.8, PIN.dotR, 0, Math.PI * 2);
      ctx.fillStyle = dotC;
      ctx.fill();
      ctx.strokeStyle = '#0e1118';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (name) {
        ctx.font = `700 ${PIN.fontPx}px Inter,system-ui,sans-serif`;
        const tw = Math.min(PIN.labelMaxW, ctx.measureText(name).width + PIN.labelPadX);
        const nx = cx - tw / 2, ny = item.y - PIN.labelH;
        const radius = Math.max(4, PIN.labelH / 2);
        ctx.fillStyle = '#fffffff0';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(nx, ny, tw, PIN.labelH, radius);
        else { ctx.rect(nx, ny, tw, PIN.labelH); }
        ctx.fill();
        ctx.fillStyle = '#141820';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, cx, ny + PIN.labelH / 2, PIN.labelMaxW - PIN.labelPadX + 4);
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
    // s18: la rueda sobre un pin visible sigue haciendo zoom en el 3D (antes se perdía en el botón).
    el.addEventListener('wheel', e => { const cv = container.querySelector?.('canvas'); if (!cv) return; e.preventDefault(); cv.dispatchEvent(new WheelEvent('wheel', e)); }, {passive: false});
    capa.append(el);
    rec = {el, key: '', cls: '', tf: '', shown: true};
    pins.set(id, rec);
    return rec;
  }

  let lastProjected = [];

  function paint(opts = {}) {
    const snapshot = getSnapshot() || {};
    const selected = getSelected();
    const byId = new Map((snapshot.bots || []).map(b => [b.id, b]));
    // t369u: no reproyectar sobre un 3D detenido. t425u: sí volver a ocultar
    // bajo el chrome cuando la hoja termina de abrirse o de animarse.
    let projected;
    if (opts.reuse && lastProjected.length) {
      projected = lastProjected.filter(i => i?.id && byId.has(i.id));
    } else {
      projected = (projectBots() || []).filter(i => i?.id && !i.hidden && byId.has(i.id));
      lastProjected = projected;
    }
    const chrome = chromeRectsIn(container);
    // s9d (Rob t370u): every visible bot keeps its own photo on its head. Overlap is OK.
    const seen = new Set();
    const drawable = [];
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
      // s13: hide pin visuals and hits under the view menu, dock, header, floor tabs, and open sheets.
      const blocked = pinBlockedByChrome(pinBox(item), chrome);
      // s18 (Rob t432u): en Edificio cerrado lejos los pines están ocultos (body.v17lejos); el estilo en línea
      // 'auto' le ganaba a la regla CSS y los botones invisibles (44 px) se comían el pellizco y la rueda sobre el edificio.
      const lejos = typeof document !== 'undefined' && document.body.classList.contains('v17lejos');
      rec.el.style.pointerEvents = (blocked || lejos) ? 'none' : 'auto';
      rec.el.style.visibility = (blocked || lejos) ? 'hidden' : '';
      if (!blocked) drawable.push(item);
    }
    for (const [id, rec] of pins) {
      if (!seen.has(id) && rec.shown) { rec.shown = false; rec.el.style.display = 'none'; }
    }
    paintCanvas(drawable, byId);
  }

  // Only paint after a 3D frame (Rob t369u): an independent loop would move pins
  // against a stale canvas whenever the 3D tick is busy or skips a frame.
  // s16 (Rob t425u): al abrir un menú se congelan las posiciones y se sigue
  // ocultando bajo el chrome (las hojas a menudo terminan de animarse después).
  let paintedWhilePanel = false;
  let live = true;
  let hideRaf = 0;
  const stopHideLoop = () => {
    if (hideRaf) {
      try { cancelAnimationFrame(hideRaf); } catch {}
      hideRaf = 0;
    }
  };
  const startHideLoop = () => {
    if (!live) return;
    paint({ reuse: true });
    paintedWhilePanel = true;
    if (hideRaf) return;
    const tick = () => {
      hideRaf = 0;
      if (!live || !panelOpen()) return;
      paint({ reuse: true });
      hideRaf = requestAnimationFrame(tick);
    };
    hideRaf = requestAnimationFrame(tick);
  };
  const syncPanelPaint = () => {
    if (!live) return;
    if (panelOpen()) { startHideLoop(); return; }
    stopHideLoop();
    if (paintedWhilePanel) { paintedWhilePanel = false; paint(); }
  };
  globalThis.__atelierAfterRender = () => {
    if (!live) return;
    if (panelOpen()) { startHideLoop(); return; }
    stopHideLoop();
    paintedWhilePanel = false;
    paint();
  };
  // Si el 3D se detiene al abrir un menú, el hook de arriba no corre: el observer y estos retardos arrancan el bucle de ocultar.
  const onUi = () => {
    requestAnimationFrame(syncPanelPaint);
    setTimeout(syncPanelPaint, 0);
    setTimeout(syncPanelPaint, 80);
    setTimeout(syncPanelPaint, 200);
    setTimeout(syncPanelPaint, 350);
  };
  let mo = null;
  if (typeof document !== 'undefined') {
    document.addEventListener('click', onUi, true);
    document.addEventListener('toggle', onUi, true);
    if (typeof MutationObserver === 'function') {
      mo = new MutationObserver(() => { syncPanelPaint(); });
      mo.observe(document.body, {attributes: true, attributeFilter: ['class', 'open', 'hidden', 'aria-hidden'], subtree: true, childList: true});
    }
  }

  return {
    element: capa,
    refresh: paint,
    destroy() {
      live = false;
      stopHideLoop();
      globalThis.__atelierAfterRender = null;
      try { mo && mo.disconnect(); } catch {}
      if (typeof document !== 'undefined') {
        document.removeEventListener('click', onUi, true);
        document.removeEventListener('toggle', onUi, true);
      }
      capa.remove();
      draw.remove();
      pins.clear();
    },
  };
}
