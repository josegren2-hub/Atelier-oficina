/**
 * Phone/browser Back closes ficha → pizarrón → equipo → zoom/floor stepwise
 * instead of leaving the page (Oficina-bots v17d behavior).
 */
export function mountHistoryBack({
  isDetailOpen = () => false,
  closeDetail = () => {},
  isPizarronOpen = () => false,
  closePizarron = () => {},
  isEquipoOpen = () => false,
  foldEquipo = () => {},
  isZoomedOrFloor = () => false,
  resetView = () => {},
  isCommandOpen = () => false,
  closeCommand = () => {},
  isMandoOpen = () => false,
  closeMando = () => {},
} = {}) {
  let popping = false;
  const mark = () => {
    if (popping) return;
    try { globalThis.history?.pushState?.({atelierBack: Date.now()}, ''); } catch {}
  };

  const hist = globalThis.history;
  const win = globalThis;
  try {
    hist?.replaceState?.({atelierBack: 'inicio'}, '');
    hist?.pushState?.({atelierBack: 'base'}, '');
  } catch {}

  function closeTop() {
    if (isDetailOpen()) { closeDetail(); return true; }
    if (isMandoOpen()) { closeMando(); return true; }
    if (isCommandOpen()) { closeCommand(); return true; }
    if (isPizarronOpen()) { closePizarron(); return true; }
    if (isEquipoOpen() && (typeof matchMedia !== 'function' || matchMedia('(max-width: 760px)').matches)) {
      foldEquipo(); return true;
    }
    if (isZoomedOrFloor()) { resetView(); return true; }
    return false;
  }

  function onPop() {
    popping = true;
    const closed = closeTop();
    if (!closed || !hist?.state || hist.state.atelierBack === 'inicio') {
      try { hist?.pushState?.({atelierBack: 'base'}, ''); } catch {}
    }
    setTimeout(() => { popping = false; }, 40);
  }

  win.addEventListener?.('popstate', onPop);

  return {
    push: mark,
    destroy() { win.removeEventListener?.('popstate', onPop); },
  };
}
