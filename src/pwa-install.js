/** Install button when beforeinstallprompt fires; iOS add-to-home hint. */
export function mountPwaInstall({root = document} = {}) {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent || '') && !window.MSStream;
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches
    || navigator.standalone === true;

  function ensureButton() {
    let btn = root.querySelector('#install-app');
    if (btn) return btn;
    btn = document.createElement('button');
    btn.id = 'install-app';
    btn.type = 'button';
    btn.className = 'btn-slim';
    btn.hidden = true;
    btn.textContent = 'Instalar como app';
    const host = root.querySelector('.mas-body') || root.querySelector('#mas-panel') || root.querySelector('.lista-header');
    host?.append?.(btn);
    return btn;
  }

  function showIosHint() {
    if (!isIos || standalone) return;
    if (root.querySelector('#install-ios-hint')) return;
    const p = document.createElement('p');
    p.id = 'install-ios-hint';
    p.className = 'muted small';
    p.textContent = 'En iPhone: toca Compartir y luego “Añadir a pantalla de inicio” para instalarla.';
    const host = root.querySelector('.mas-body') || root.querySelector('#mas-panel');
    host?.append?.(p);
  }

  let deferred = null;
  const btn = ensureButton();
  showIosHint();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    if (btn) {
      btn.hidden = false;
      btn.setAttribute('aria-label', 'Instalar San Junipero Corp como aplicación');
    }
  });

  btn?.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch {}
    deferred = null;
    btn.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    if (btn) btn.hidden = true;
  });

  return {button: btn};
}
