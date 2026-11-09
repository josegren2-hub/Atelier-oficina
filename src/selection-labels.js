/** HTML selection labels above avatars: circular photo + name + status + thin stem. */
import {statusLabels} from './data.js';
import {avatarPhotoUrl} from './avatar-photo.js';

const statusClass = status => status === 'working' ? 'trabajando' : status === 'review' ? 'te' : status === 'idle' ? 'pausa' : 'unknown';

export function mountSelectionLabels({
  getSnapshot = () => ({}),
  getSelected = () => null,
  projectBots = () => [],
  onSelect = () => {},
  container = document.body,
} = {}) {
  const capa = document.createElement('div');
  capa.id = 'capa-sel';
  capa.className = 'capa-sel';
  capa.setAttribute('aria-hidden', 'false');
  container.append(capa);
  const pins = new Map();

  function ensure(id) {
    let el = pins.get(id);
    if (el) return el;
    el = document.createElement('button');
    el.type = 'button';
    el.className = 'v17pin';
    el.dataset.id = id;
    el.addEventListener('click', e => { e.stopPropagation(); onSelect(id); });
    capa.append(el);
    pins.set(id, el);
    return el;
  }

  function paint() {
    const snapshot = getSnapshot() || {};
    const selected = getSelected();
    const byId = new Map((snapshot.bots || []).map(b => [b.id, b]));
    const projected = projectBots() || [];
    const seen = new Set();
    for (const item of projected) {
      if (!item?.id || item.hidden) continue;
      seen.add(item.id);
      const bot = byId.get(item.id);
      if (!bot) continue;
      const el = ensure(item.id);
      const st = statusClass(bot.status);
      const first = String(bot.name || bot.id).split(/\s*·\s*/)[0];
      el.className = `v17pin ${st}${selected === bot.id ? ' sel' : ''}${item.small ? ' chico' : ''}`;
      el.style.transform = `translate(${item.x}px, ${item.y}px) translate(-50%, -100%)`;
      el.style.display = '';
      el.setAttribute('aria-label', `${bot.name}, ${statusLabels[bot.status] || 'Sin señal'}`);
      el.innerHTML = `<span class="stem" aria-hidden="true"></span>`
        + `<img src="${avatarPhotoUrl(bot.id)}" alt="" width="40" height="40" loading="lazy">`
        + `<span class="sd" aria-hidden="true"></span>`
        + `<em>${first}</em>`;
    }
    for (const [id, el] of pins) {
      if (!seen.has(id)) el.style.display = 'none';
    }
  }

  let raf = 0;
  function tick() {
    raf = requestAnimationFrame(tick);
    paint();
  }
  tick();

  return {
    element: capa,
    refresh: paint,
    destroy() {
      cancelAnimationFrame(raf);
      capa.remove();
      pins.clear();
    },
  };
}
