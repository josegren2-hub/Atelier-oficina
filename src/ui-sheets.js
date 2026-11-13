/** A single open sheet/menu at a time. Opening one closes the others. */
export function createSheetManager() {
  const registry = new Map();

  function register(name, api) {
    if (!name || !api) return;
    registry.set(name, {
      open: api.open || (() => {}),
      close: api.close || (() => {}),
      isOpen: api.isOpen || (() => false),
    });
  }

  function closeAll(except) {
    for (const [name, api] of registry) {
      if (name === except) continue;
      try { if (api.isOpen()) api.close(); } catch {}
    }
  }

  function open(name) {
    const api = registry.get(name);
    if (!api) return false;
    closeAll(name);
    if (!api.isOpen()) api.open();
    return true;
  }

  function close(name) {
    const api = registry.get(name);
    if (!api) return false;
    if (api.isOpen()) api.close();
    return true;
  }

  function toggle(name) {
    const api = registry.get(name);
    if (!api) return false;
    if (api.isOpen()) { api.close(); return false; }
    closeAll(name);
    api.open();
    return true;
  }

  function anyOpen(except) {
    for (const [name, api] of registry) {
      if (name === except) continue;
      try { if (api.isOpen()) return true; } catch {}
    }
    return false;
  }

  function isOpen(name) {
    return !!registry.get(name)?.isOpen();
  }

  return {register, open, close, toggle, closeAll, anyOpen, isOpen};
}

/**
 * Close a sheet with a clear DOWNWARD swipe only (C37).
 * - Starts in the header/handle zone (top 72 px of the sheet), or
 * - starts inside content that is scrollable and already scrolled to the top.
 * Upward swipes, scrolling, or a gesture that first moved up never close it.
 */
export function bindSwipeToClose(el, onClose, {headerPx = 72} = {}) {
  if (!el || typeof onClose !== 'function') return;
  let y0 = null, x0 = null, minY = null, eligible = false;
  const scrollerOf = (node) => {
    for (let n = node; n && n !== el.parentNode; n = n.parentNode) {
      if (!(n instanceof Element)) continue;
      if (n.scrollHeight > n.clientHeight + 2) {
        const oy = getComputedStyle(n).overflowY;
        if (oy === 'auto' || oy === 'scroll') return n;
      }
      if (n === el) break;
    }
    return null;
  };
  el.addEventListener('touchstart', e => {
    const p = e.changedTouches[0];
    y0 = p.clientY; x0 = p.clientX; minY = p.clientY;
    const top = el.getBoundingClientRect().top;
    const inHeader = p.clientY - top <= headerPx;
    const sc = scrollerOf(e.target);
    eligible = inHeader || (!!sc && sc.scrollTop <= 0);
  }, {passive: true});
  el.addEventListener('touchmove', e => {
    if (y0 == null) return;
    const p = e.changedTouches[0];
    if (p.clientY < minY) minY = p.clientY;
  }, {passive: true});
  el.addEventListener('touchend', e => {
    if (y0 == null) return;
    const p = e.changedTouches[0];
    const dy = p.clientY - y0, dx = Math.abs(p.clientX - x0), wentUp = y0 - minY > 8;
    y0 = null; x0 = null; minY = null;
    if (eligible && !wentUp && dy > 56 && dx < 80) onClose();
  }, {passive: true});
}
