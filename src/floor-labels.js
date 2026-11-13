/** HTML pills for separated office views (stacked / 2×2). Positions come from the scene each frame. */
import {floors} from './data.js';
import {floorCaption} from './view-layout.js';

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

  const widths = [];
  let pw = 0, lastW = -1;
  function update(points = []) {
    let parentRect = null;
    pills.forEach((el, i) => {
      const p = points[i];
      if (!p || !p.visible) {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      const x = Math.round(p.x), y = Math.round(p.y);
      if (!parentRect) {
        const cw = container.clientWidth || 0;
        if (cw !== lastW) { lastW = cw; widths.length = 0; pw = root.getBoundingClientRect().width || cw; }
        parentRect = true;
      }
      if (!widths[i]) widths[i] = el.offsetWidth || 0;
      // Same rule as before (flip left if it would cross the right edge), without per-frame layout reads.
      if (x + 10 + widths[i] > pw - 6) el.style.transform = `translate(${x}px, ${y}px) translate(calc(-100% - 10px), -50%)`;
      else el.style.transform = `translate(${x}px, ${y}px) translate(10px, -50%)`;
    });
  }

  update([]);
  return {
    update,
    destroy() { root.remove(); },
  };
}
