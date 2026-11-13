/** Compact frosted character card anchored near the avatar (not fullscreen). */
import {avatarPhotoUrl} from './avatar-photo.js';
import {statusLabels} from './data.js';
import {getUsoState, displayUsoLine} from './uso-feed.js';

export function mountFichaFlotante({
  getProjected = () => null,
  onClose = () => {},
  onOpenFull = () => {},
  container = document.body,
} = {}) {
  const card = document.createElement('aside');
  card.id = 'ficha-flotante';
  card.className = 'ficha-flotante glass-card';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Ficha del bot');
  container.append(card);
  let current = null;

  function place() {
    if (!current || card.hidden) return;
    const proj = getProjected(current.id);
    const phone = typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches;
    const pad = 8;
    const dock = phone ? 64 : 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = card.offsetWidth || (phone ? 168 : 220);
    const ch = card.offsetHeight || (phone ? 140 : 160);
    const ax = proj?.x ?? vw / 2;
    const ay = proj?.y ?? vh / 2;
    // Prefer to the side and slightly above the avatar so the floor stays visible.
    let x = ax + 18;
    let y = ay - ch - 8;
    if (x + cw > vw - pad) x = Math.max(pad, ax - cw - 18);
    if (x < pad) x = pad;
    if (y < pad) y = Math.min(ay + 16, vh - ch - dock - pad);
    if (y + ch > vh - dock - pad) y = Math.max(pad, vh - ch - dock - pad);
    // On phone, never let the card cover more than ~40% of the viewport height: already sized in CSS.
    card.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  function open(bot, {taskText = '', resumen = ''} = {}) {
    current = bot;
    const st = statusLabels[bot.status] || 'Sin señal';
    card.innerHTML = `
      <button type="button" class="icon-btn ficha-x" aria-label="Cerrar"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <img class="ficha-av" data-st="${bot.status || 'unknown'}" src="${avatarPhotoUrl(bot.id)}" alt="" width="48" height="48">
      <b class="ficha-name">${bot.name}</b>
      <span class="ficha-role">${bot.role || ''}</span>
      <span class="ficha-st st-${bot.stale ? 'unknown' : (bot.status || 'unknown')}">${bot.stale ? 'Sin señal' : st}</span>
      <p class="uso-line">${displayUsoLine(getUsoState(), bot.id, bot.mandoUso)}</p>
      ${resumen ? `<p class="ficha-resumen">${resumen}</p>` : ''}
      ${taskText && taskText !== resumen ? `<p class="ficha-task">${taskText}</p>` : ''}
      <div class="ficha-actions"><button type="button" class="btn-slim" data-full>Ver ficha</button></div>`;
    card.hidden = false;
    requestAnimationFrame(() => card.classList.add('open'));
    card.querySelector('.ficha-x')?.addEventListener('click', () => close({notify: true}));
    card.querySelector('[data-full]')?.addEventListener('click', () => onOpenFull(bot.id));
    place();
  }

  function close({notify = false} = {}) {
    card.classList.remove('open');
    current = null;
    const done = () => { card.hidden = true; card.removeEventListener('transitionend', done); };
    card.addEventListener('transitionend', done);
    setTimeout(done, 380);
    if (notify) onClose();
  }

  let raf = 0;
  function tick() {
    raf = requestAnimationFrame(tick);
    if (!card.hidden && current) place();
  }
  tick();

  return {
    element: card,
    open,
    close,
    isOpen: () => !card.hidden,
    getCurrentId: () => current?.id || null,
    reposition: place,
    destroy() { cancelAnimationFrame(raf); card.remove(); },
  };
}
