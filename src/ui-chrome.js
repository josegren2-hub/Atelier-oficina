/** Immediate dock/sheet wiring. No Three.js. Lets Equipo open before the 3D scene loads. */
import './style.css';
import {createSheetManager} from './ui-sheets.js';

export const sheets = createSheetManager();

const $ = s => document.querySelector(s);

function isPhone() {
  return typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches;
}

function setEquipoFallback(open) {
  document.body.classList.toggle('equipo-cerrado', !open);
  document.body.classList.toggle('equipo-abierto', !!open);
  $('#dock-equipo')?.setAttribute('aria-pressed', String(!!open));
}

function setMasFallback(open) {
  const p = $('#mas-panel');
  if (!p) return;
  p.hidden = !open;
  p.classList.toggle('open', !!open);
  $('#mas-open')?.setAttribute('aria-expanded', String(!!open));
}

function setSimpleSheet(sel, open) {
  const el = $(sel);
  if (!el) return;
  el.hidden = !open;
  el.classList.toggle('open', !!open);
}

/** Register CSS-only fallbacks so a tap works before main.js finishes booting. */
export function registerFallbackSheets() {
  if (!sheets.isOpen('equipo') && !document.body.classList.contains('equipo-abierto')) {
    /* still (re)register fallbacks; later main overwrites with the full API */
  }
  sheets.register('equipo', {
    open: () => setEquipoFallback(true),
    close: () => setEquipoFallback(false),
    isOpen: () => isPhone()
      ? document.body.classList.contains('equipo-abierto')
      : !!$('#mcpanel') && !$('#mcpanel').classList.contains('plegado') && !$('#mcpanel')?.hidden,
  });
  sheets.register('mas', {
    open: () => setMasFallback(true),
    close: () => setMasFallback(false),
    isOpen: () => { const p = $('#mas-panel'); return !!(p && !p.hidden && p.classList.contains('open')); },
  });
  sheets.register('paneles', {
    open: () => setSimpleSheet('#paneles-sheet', true),
    close: () => setSimpleSheet('#paneles-sheet', false),
    isOpen: () => { const p = $('#paneles-sheet'); return !!(p && !p.hidden && p.classList.contains('open')); },
  });
  sheets.register('proyectos', {
    open: () => setSimpleSheet('#proyectos-sheet, .proy-sheet', true),
    close: () => setSimpleSheet('#proyectos-sheet, .proy-sheet', false),
    isOpen: () => { const p = $('#proyectos-sheet') || document.querySelector('.proy-sheet'); return !!(p && !p.hidden && p.classList.contains('open')); },
  });
}

export function bindPress(el, fn) {
  if (!el || el.dataset.sheetBound === '1') return;
  el.dataset.sheetBound = '1';
  let last = 0;
  const go = e => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - last < 280) {
      e.preventDefault?.();
      e.stopPropagation?.();
      return;
    }
    last = now;
    e.preventDefault?.();
    e.stopPropagation?.();
    fn(e);
  };
  el.addEventListener('pointerup', go);
  el.addEventListener('click', go);
  el.addEventListener('touchend', go, {passive: false});
}

export function bindChromeNow() {
  registerFallbackSheets();
  bindPress($('#dock-equipo'), () => sheets.toggle('equipo'));
  bindPress($('#dock-proyectos'), () => sheets.toggle('proyectos'));
  bindPress($('#dock-paneles'), () => sheets.toggle('paneles'));
  bindPress($('#dock-resumen'), () => sheets.toggle('resumen'));
  bindPress($('#mas-open'), () => sheets.toggle('mas'));
  bindPress($('#mas-close'), () => sheets.close('mas'));
  bindPress($('#command-open'), () => sheets.toggle('consulta'));
  bindPress($('#avatars-toggle'), () => sheets.toggle('avatares'));
  bindPress($('#pizarron-open'), () => sheets.open('pizarron'));
  bindPress($('#avisos-open'), () => sheets.open('avisos'));
  bindPress($('#notifications-open'), () => sheets.open('avisos'));
  /* pending-open stays in main so it can open the waiting tab */
}

export {setEquipoFallback};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => bindChromeNow(), {once: true});
  else bindChromeNow();
}
