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
  import('./ui-chrome.js').catch(()=>{}).finally(()=>import('./main.js').finally(()=>import('./nav-shell.js').then(m=>m.mountNavShell()).catch(()=>{})));
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
    navigator.serviceWorker.register(swUrl.href, {scope, updateViaCache: 'none'}).then((reg) => {
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


// f1v: if the badge/HTML is stale vs live version.json, force a reload (SW or HTTP cache).
try {
  const verUrl = new URL('version.json', document.baseURI || location.href);
  fetch(verUrl.href, {cache: 'no-store'}).then((r) => r.ok ? r.json() : null).then((v) => {
    if (!v || !v.build) return;
    const badge = document.querySelector('.prueba-badge')?.textContent || '';
    const meta = document.querySelector('meta[name="atelier-build"]')?.getAttribute('content') || '';
    const seen = badge + ' ' + meta;
    if (seen.trim() && !seen.includes(v.build)) location.reload();
  }).catch(() => {});
} catch {}

import('./pwa-install.js').then(m => m.mountPwaInstall?.()).catch(() => {});
