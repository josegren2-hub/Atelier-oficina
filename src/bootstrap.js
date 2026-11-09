/** Entry: Solo lista skips Three.js; otherwise load the 3D office. */
const params = new URLSearchParams(location.search);
const abrir = params.get('abrir');
if (abrir === 'lista') {
  try { localStorage.setItem('atelierVista', 'lista'); } catch {}
} else if (abrir === '3d') {
  try { localStorage.setItem('atelierVista', '3d'); } catch {}
}
let vista = '3d';
try { vista = localStorage.getItem('atelierVista') || '3d'; } catch {}
if (vista === 'lista' || abrir === 'lista') {
  import('./lista-app.js');
} else {
  import('./main.js');
}
if ('serviceWorker' in navigator) {
  addEventListener('load', () => {
    const swUrl = new URL('sw.js', document.baseURI || location.href);
    navigator.serviceWorker.register(swUrl.href).catch(() => {});
  });
}
