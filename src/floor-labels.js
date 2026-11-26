/** HTML pills for separated office views. Positions come from the scene each frame. */
import {floors} from './data.js';
import {floorCaption} from './view-layout.js';
import {PIN, rectsOverlap} from './selection-labels.js';
export {FLOOR_LABEL_ANCHOR, floorLabelsShownFor, floorFramesVisible} from './view-layout.js';

/** Vertical band free of header/floor chips (top) and the view toolbar/dock (bottom). */
const TOP_CHROME = ['header', '#floors'];
const BOTTOM_CHROME = ['#vista-toolbar', '#dock', '.ns-tabbar'];

export function mountFloorLabels(container) {
  const root = document.createElement('div');
  root.className = 'floor-labels';
  root.setAttribute('aria-hidden', 'true');
  const pills = floors.map((_, i) => {
    const el = document.createElement('div');
    el.className = 'floor-label-pill';
    el.textContent = floorCaption(i);
    root.appendChild(el);
    return el;
  });
  container.appendChild(root);

  const widths = [], heights = [];
  let pw = 0, lastW = -1, band = null, bandAt = 0;
  const doc = container.ownerDocument || (typeof document !== 'undefined' ? document : null);
  function readBand(now) {
    // Layout read at most every 500 ms (toolbar can move when the view changes), never per frame.
    if (band && now - bandAt < 500) return band;
    bandAt = now;
    let top = 0, bottom = Infinity;
    try {
      const c = container.getBoundingClientRect();
      for (const s of TOP_CHROME) for (const el of doc?.querySelectorAll?.(s) || []) {
        const r = el.getBoundingClientRect(); if (r.height > 0 && r.top < c.top + c.height / 2) top = Math.max(top, r.bottom - c.top);
      }
      for (const s of BOTTOM_CHROME) for (const el of doc?.querySelectorAll?.(s) || []) {
        const r = el.getBoundingClientRect(); if (r.height > 0 && r.bottom > c.top + c.height / 2) bottom = Math.min(bottom, r.top - c.top);
      }
    } catch { /* jsdom / no layout */ }
    band = {top: top + 4, bottom: bottom - 4};
    return band;
  }
  function update(points = [], pinItems = []) {
    // caja VISUAL del pin (foto + nombre); el título no recibe toques (pointer-events:none), así que no compite con la zona de toque
    const pinBoxes = (pinItems || []).filter((it) => it && !it.hidden && Number.isFinite(it.x) && Number.isFinite(it.y)).map((it) => ({x: it.x - PIN.nameW / 2, y: it.y - (PIN.size + PIN.nameHBox), w: PIN.nameW, h: PIN.size + PIN.nameHBox}));
    let b = null;
    pills.forEach((el, i) => {
      const p = points[i];
      if (!p || !p.visible) { el.hidden = true; return; }
      if (!b) {
        const cw = container.clientWidth || 0;
        if (cw !== lastW) { lastW = cw; widths.length = 0; heights.length = 0; pw = root.getBoundingClientRect().width || cw; band = null; }
        b = readBand(typeof performance !== 'undefined' ? performance.now() : Date.now());
      }
      el.hidden = false;
      if (!widths[i]) { widths[i] = el.offsetWidth || 0; heights[i] = el.offsetHeight || 0; }
      // Left edge pinned to the slab's front-left corner, hanging just under the slab (clear of that floor's pins); clamp inside the screen.
      const x = Math.max(4, Math.min(Math.round(p.x), Math.max(4, pw - 4 - widths[i])));
      const h = heights[i] || 16, w = widths[i] || 0;
      // 1.º colgada bajo la losa; si ahí hay un pin, 2.º sobre la orilla de la losa (hasta 12 px más arriba); si tampoco cabe, se oculta.
      const fits = (yy) => yy >= b.top && yy + h <= b.bottom && !pinBoxes.some((q) => rectsOverlap({x, y: yy, w, h}, q));
      const below = Math.round(p.y) + 1, above = Math.round(p.y) - h - 1;
      const y = [below, above, above - 4, above - 8, above - 12].find(fits) ?? null;
      if (y === null) { el.hidden = true; return; }
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
  }

  update([]);
  return {
    update,
    destroy() { root.remove(); },
  };
}
