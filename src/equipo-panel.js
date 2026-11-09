/** Mission-control Equipo panel: dark, grouped by area/floor, folds on mobile. */
import {floors, statusLabels} from './data.js';
import {avatarPhotoUrl} from './avatar-photo.js';

const statusClass = status => {
  if (status === 'working') return 'trabajando';
  if (status === 'review') return 'te';
  if (status === 'idle') return 'pausa';
  return 'unknown';
};
const statusText = status => {
  if (status === 'working') return 'trabajando';
  if (status === 'review') return 'te espera';
  if (status === 'idle') return 'disponible';
  if (status === 'error') return 'error';
  return 'sin señal';
};


export function renderEquipoHtml({bots = [], floors: floorList = floors, selected = null, folded = false} = {}) {
  let html = `<button type="button" class="mc-tg" aria-expanded="${String(!folded)}">☰ Equipo</button>`;
  if (folded) return html;
  html += '<div class="mc-in"><div class="mc-h">MISSION CONTROL</div>';
  for (const floor of floorList) {
    const group = bots.filter(b => b.floor === floor.id);
    if (!group.length) continue;
    html += `<div class="mc-g">${floor.id === 0 ? 'PB' : `Piso ${floor.id}`} · ${floor.name}</div>`;
    for (const bot of group) {
      const on = bot.id === selected ? ' on' : '';
      const st = statusClass(bot.status);
      html += `<button type="button" class="mc-bot${on}" data-id="${bot.id}" aria-pressed="${String(bot.id === selected)}">`
        + `<span class="mc-av"><img src="${avatarPhotoUrl(bot.id)}" alt="" width="24" height="24" loading="lazy"><span class="sd ${st}" aria-label="${statusLabels[bot.status] || statusText(bot.status)}"></span></span>`
        + `<span class="mc-name">${bot.name}</span><small>${statusText(bot.status)}</small></button>`;
    }
  }
  return html + '</div>';
}

export function mountEquipoPanel({getSnapshot = () => ({}), getSelected = () => null, onSelect = () => {}} = {}) {
  const panel = document.createElement('aside');
  panel.id = 'mcpanel';
  panel.className = 'mcpanel';
  panel.setAttribute('aria-label', 'Equipo');
  if (typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches) panel.classList.add('plegado');
  document.body.append(panel);

  function render() {
    const snapshot = getSnapshot() || {};
    const selected = getSelected();
    const bots = Array.isArray(snapshot.bots) ? snapshot.bots : [];
    const folded = panel.classList.contains('plegado');
    panel.innerHTML = renderEquipoHtml({bots, selected, folded});
  }

  panel.addEventListener('click', e => {
    const tg = e.target.closest('.mc-tg');
    if (tg) { panel.classList.toggle('plegado'); render(); return; }
    const bot = e.target.closest('.mc-bot');
    if (bot?.dataset.id) onSelect(bot.dataset.id);
  });

  const mq = typeof matchMedia === 'function' ? matchMedia('(max-width: 760px)') : null;
  const onMq = () => {
    if (!mq) return;
    if (mq.matches) panel.classList.add('plegado');
    else panel.classList.remove('plegado');
    render();
  };
  mq?.addEventListener?.('change', onMq);

  render();
  return {
    element: panel,
    refresh: render,
    open() { panel.classList.remove('plegado'); render(); },
    fold() { panel.classList.add('plegado'); render(); },
    isOpen() { return !panel.classList.contains('plegado'); },
    destroy() { mq?.removeEventListener?.('change', onMq); panel.remove(); },
  };
}
