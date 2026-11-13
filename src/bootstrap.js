/** Entry: Solo lista skips Three.js; otherwise load the 3D office. */
const params = new URLSearchParams(location.search);
const abrir = params.get('abrir');
if (abrir === 'lista') {
  try { localStorage.setItem('atelierVista', 'lista'); } catch {}
} else if (abrir === '3d') {
  try { localStorage.setItem('atelierVista', '3d'); } catch {}
}
// URL wins. Do not force Lista from localStorage alone — that trapped the Back gesture.
if (abrir === 'lista') {
  import('./lista-app.js');
} else {
  import('./ui-chrome.js').catch(()=>{}).finally(()=>import('./main.js'));
}

function swScope() {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
  try {
    const path = new URL(base, document.baseURI || location.href).pathname;
    return path.endsWith('/') ? path : path + '/';
  } catch {
    const dir = location.pathname.replace(/[^/]+$/, '');
    return dir || '/';
  }
}

if ('serviceWorker' in navigator) {
  addEventListener('load', () => {
    const scope = swScope();
    const swUrl = new URL('sw.js', document.baseURI || location.href);
    navigator.serviceWorker.register(swUrl.href, {scope}).then((reg) => {
      // s9e: if a previous SW was controlling this page, reload when the new one activates.
      if (navigator.serviceWorker.controller) {
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          const bar = document.createElement('div');
          bar.className = 'sw-update-banner';
          bar.setAttribute('role', 'status');
          bar.textContent = 'Hay una versión nueva · recargando…';
          document.body.append(bar);
          location.reload();
        });
        if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
      }
      try { reg.update(); } catch {}
    }).catch(() => {});
  });
}

import('./pwa-install.js').then(m => m.mountPwaInstall?.()).catch(() => {});
