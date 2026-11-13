/** Letrero ⚠️ cuando estado/latido/mando están viejos (umbrales alineados a Oficina v16.16). */
const ESTADO_THRESHOLD_MS = 45 * 60e3;
/** Oficina salud: mando <14 h verde, <26 h amarillo; banner duro a partir de 26 h. */
const MANDO_THRESHOLD_MS = 26 * 3600e3;

export function staleMessages(snapshot, now = Date.now()) {
  const msgs = [];
  if (!snapshot || snapshot.mode !== 'live') return msgs;
  const latido = snapshot.salud?.latido ? Date.parse(snapshot.salud.latido) : NaN;
  const signal = snapshot.lastSignal ? Date.parse(snapshot.lastSignal) : NaN;
  const t = Math.max(Number.isFinite(latido) ? latido : 0, Number.isFinite(signal) ? signal : 0);
  if (t && now - t > ESTADO_THRESHOLD_MS) {
    msgs.push(`Estados sin actualizar desde hace ${Math.round((now - t) / 60e3)} min`);
  }
  const mando = snapshot.salud?.mando ? Date.parse(snapshot.salud.mando) : NaN;
  if (Number.isFinite(mando) && now - mando > MANDO_THRESHOLD_MS) {
    msgs.push(`Mando cifrado sin actualizar desde hace ${Math.round((now - mando) / 3600e3)} h`);
  }
  return msgs;
}

/**
 * Place as a full-width sibling BETWEEN #app > header and #app > main
 * so the grid grows a row and the logo is never covered.
 * Lista mode uses #lista-stale-slot.
 */
export function mountStaleBanner(anchor = document.body) {
  let el = document.getElementById('atelier-stale');
  if (!el) {
    el = document.createElement('div');
    el.id = 'atelier-stale';
    el.className = 'atelier-stale';
    el.hidden = true;
    el.setAttribute('role', 'status');
  }
  const app = document.getElementById('app');
  const header = document.querySelector('#app > header');
  const main = document.querySelector('#app > main');
  const listaSlot = document.getElementById('lista-stale-slot');
  if (listaSlot && (anchor === listaSlot || anchor?.id === 'lista-stale-slot')) {
    listaSlot.replaceChildren(el);
  } else if (app && header && main) {
    if (el.parentNode !== app || el.previousElementSibling !== header) {
      app.insertBefore(el, main);
    }
  } else if (!el.parentNode) {
    (anchor || document.body).appendChild(el);
  }
  return {
    refresh(snapshot) {
      const msgs = staleMessages(snapshot);
      el.hidden = !msgs.length;
      el.textContent = msgs.length ? `${msgs.join(' · ')}` : '';
    },
    element: el,
  };
}
