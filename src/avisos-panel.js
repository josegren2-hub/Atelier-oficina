/** s11 (boceto A, Rob t403 «Todo»): «Avisos al celular» — una sola hoja que junta Avisos, Celular y Centro de mando › Notificaciones.
 * Estado en palabras simples, quién espera 24 h+, el tema de este teléfono e historial plegado. Nunca envía avisos al tema real. */
import {
  createNtfySession,
  waitingAlertCandidates,
  mapSalud,
  avisosHealthLabel,
  atelierDeepLink,
} from './ntfy-session.js';
import {avatarPhotoUrl} from './avatar-photo.js';

function el(tag, text, className) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null && text !== '') n.textContent = text;
  return n;
}
function btn(text, onClick, extra = {}) {
  const b = el('button', text);
  b.type = 'button';
  for (const [k, v] of Object.entries(extra)) b.dataset[k] = v;
  b.addEventListener('click', onClick);
  return b;
}

function dateText(value) {
  const d = new Date(value);
  if (Number.isNaN(+d)) return '';
  return d.toLocaleString('es-MX', {timeZone: 'America/Chihuahua', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'});
}

/** Estado en palabras simples, sin jerga técnica. */
export function plainAvisosState(saludMapped, now = Date.now()) {
  const s = saludMapped || {};
  const base = avisosHealthLabel(s, now);
  if (s.avisosConfig === false) return {tone: 'warn', text: 'Los avisos al celular no están activados en la caja.'};
  if (s.avisosConfig == null) return {tone: 'muted', text: 'Todavía no hay dato de cómo van los avisos.'};
  if (base.tone === 'warn') return {tone: 'warn', text: 'El último aviso no llegó. La caja lo vuelve a intentar sola.'};
  if (s.avisosOk) return {tone: 'ok', text: 'Los avisos están llegando bien.'};
  return {tone: 'ok', text: 'Todo listo; todavía no ha hecho falta mandar ningún aviso.'};
}

export function mountAvisosPanel({
  getSnapshot = () => ({}),
  onChoose = () => {},
  container = document.body,
  storage = globalThis.localStorage,
} = {}) {
  const session = createNtfySession({storage});
  const dialog = document.createElement('dialog');
  dialog.id = 'avisos-dialog';
  dialog.className = 'avisos-dialog';
  dialog.setAttribute('aria-labelledby', 'avisos-dialog-title');
  dialog.innerHTML = `
    <div class="detail-top">
      <div>
        <p class="eyebrow">AVISOS AL CELULAR</p>
        <h2 id="avisos-dialog-title">Avisos al celular</h2>
      </div>
      <button type="button" data-close class="sj-x" aria-label="Cerrar">✕</button>
    </div>
    <div class="avisos-body">
      <section class="avisos-block" data-health></section>
      <section class="avisos-block" data-waiting></section>
      <section class="avisos-block" data-demo hidden></section>
      <section class="avisos-block" data-phone>
        <h3>En este teléfono</h3>
        <div data-phone-saved hidden>
          <p class="muted" data-phone-status></p>
          <div class="detail-actions">
            <button type="button" data-subscribe>Abrir en ntfy</button>
            <button type="button" data-change>Cambiar tema</button>
            <button type="button" data-forget>Olvidar</button>
          </div>
        </div>
        <form class="avisos-form" data-topic-form hidden>
          <label for="avisos-tema">Tema de avisos (ntfy)</label>
          <input id="avisos-tema" name="tema" type="password" autocomplete="off" spellcheck="false" placeholder="Pega tu tema de avisos">
          <label class="switch"><input type="checkbox" name="remember" checked> Recordar en este teléfono</label>
          <div class="detail-actions">
            <button type="submit">Guardar tema</button>
            <button type="button" data-cancel-change hidden>Cancelar</button>
          </div>
          <p class="muted small">El tema es secreto: se guarda solo en este teléfono. En la app ntfy: Suscribirse → pega el tema.</p>
        </form>
        <p class="avisos-form-status" data-topic-status role="status"></p>
      </section>
      <details class="avisos-block avisos-hist" data-history-box>
        <summary><span class="avisos-hist-t">Historial (este teléfono)</span><span class="muted small" data-history-count></span></summary>
        <div data-history></div>
      </details>
    </div>`;
  container.append(dialog);

  const healthEl = dialog.querySelector('[data-health]');
  const waitingEl = dialog.querySelector('[data-waiting]');
  const demoEl = dialog.querySelector('[data-demo]');
  const historyEl = dialog.querySelector('[data-history]');
  const historyCount = dialog.querySelector('[data-history-count]');
  const form = dialog.querySelector('[data-topic-form]');
  const saved = dialog.querySelector('[data-phone-saved]');
  const phoneStatus = dialog.querySelector('[data-phone-status]');
  const statusEl = dialog.querySelector('[data-topic-status]');
  const cancelChange = dialog.querySelector('[data-cancel-change]');
  let returnFocus = null;
  let changing = false;

  function paintPhone() {
    const snap = session.snapshot();
    const showForm = !snap.configured || changing;
    saved.hidden = !snap.configured || changing;
    form.hidden = !showForm;
    cancelChange.hidden = !(snap.configured && changing);
    if (snap.configured) phoneStatus.textContent = `Tema guardado ${snap.topicMasked}`;
    form.tema.value = '';
  }

  function paint() {
    const snapshot = getSnapshot() || {};
    const salud = mapSalud(snapshot.salud);
    const st = plainAvisosState(salud);
    healthEl.replaceChildren(el('h3', 'Estado'));
    healthEl.className = `avisos-block avisos-estado ${st.tone}`;
    healthEl.append(el('p', st.text, 'avisos-estado-txt'));
    if (salud.avisosOk) healthEl.append(el('p', `Último aviso bien: ${dateText(salud.avisosOk)}`, 'muted small'));
    if (st.tone === 'warn' && salud.avisosError) healthEl.append(el('p', `Último que no llegó: ${dateText(salud.avisosError)}`, 'muted small'));

    const cands = waitingAlertCandidates(snapshot.bots || []);
    session.rememberCandidates(cands);
    waitingEl.replaceChildren(el('h3', 'Te esperan hace más de 24 h'));
    if (!cands.length) waitingEl.append(el('p', 'Nadie lleva más de 24 h esperándote.', 'muted'));
    for (const c of cands) {
      const card = el('article', undefined, 'avisos-card avisos-bot');
      const img = document.createElement('img');
      img.className = 'av'; img.src = avatarPhotoUrl(c.id); img.alt = ''; img.width = 28; img.height = 28; img.loading = 'lazy';
      const meta = el('div', undefined, 'avisos-bot-meta');
      meta.append(el('h4', c.title), el('p', `Desde ${dateText(c.waitingSince)} · ${c.hours} h`, 'muted small'));
      const row = el('div', undefined, 'detail-actions');
      row.append(btn('Abrir ficha', () => { dialog.close(); onChoose(c.id); }));
      const copy = btn('Copiar enlace', async () => {
        try { await navigator.clipboard.writeText(c.deepLink); copy.textContent = 'Copiado'; setTimeout(() => { copy.textContent = 'Copiar enlace'; }, 1500); }
        catch { copy.textContent = 'No se pudo copiar'; }
      });
      row.append(copy);
      meta.append(row);
      card.append(img, meta);
      waitingEl.append(card);
    }

    // Avisos de ejemplo del modo demostración (antes en Centro de mando › Notificaciones).
    const notes = snapshot.mode === 'demo' && Array.isArray(snapshot.notifications)
      ? snapshot.notifications.filter(n => n && n.id && n.title) : [];
    demoEl.hidden = !notes.length;
    demoEl.replaceChildren();
    if (notes.length) {
      demoEl.append(el('h3', 'Avisos de ejemplo (demostración)'));
      for (const n of notes) {
        const card = el('article', undefined, 'avisos-card');
        card.append(el('h4', n.title));
        if (n.body) card.append(el('p', n.body, 'muted small'));
        if (n.createdAt) card.append(el('p', dateText(n.createdAt), 'muted small'));
        demoEl.append(card);
      }
    }

    const hist = session.readHistory();
    historyEl.replaceChildren();
    historyCount.textContent = hist.length ? `${hist.length} ${hist.length === 1 ? 'aviso visto' : 'avisos vistos'} · toca para ver` : 'Sin avisos vistos todavía';
    if (!hist.length) historyEl.append(el('p', 'Aquí se anotan los avisos de más de 24 h que este teléfono ha visto.', 'muted small'));
    for (const h of hist.slice(0, 12)) {
      const card = el('article', undefined, 'avisos-card');
      card.append(el('h4', h.title), el('p', `Visto ${dateText(h.seenAt)}`, 'muted small'));
      card.append(btn('Abrir ficha', () => { dialog.close(); onChoose(h.id); }));
      historyEl.append(card);
    }
    paintPhone();
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    try {
      const fd = new FormData(form);
      session.saveTopic(fd.get('tema'), {remember: fd.get('remember') === 'on'});
      changing = false;
      statusEl.textContent = 'Tema guardado solo en este teléfono.';
      paintPhone();
    } catch (err) {
      statusEl.textContent = err.message || 'No se pudo guardar';
    }
  });
  dialog.querySelector('[data-change]').addEventListener('click', () => { changing = true; statusEl.textContent = ''; paintPhone(); form.tema.focus(); });
  cancelChange.addEventListener('click', () => { changing = false; statusEl.textContent = ''; paintPhone(); });
  dialog.querySelector('[data-forget]').addEventListener('click', () => {
    session.clearTopic();
    changing = false;
    statusEl.textContent = 'Tema olvidado en este teléfono.';
    paintPhone();
  });
  dialog.querySelector('[data-subscribe]').addEventListener('click', () => {
    const url = session.subscribeUrl();
    if (!url) { statusEl.textContent = 'Guarda un tema primero.'; return; }
    const w = window.open(url, '_blank');
    if (w) { try { w.opener = null; } catch {} } else statusEl.textContent = 'El navegador bloqueó la pestaña nueva.';
  });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { changing = false; try { returnFocus?.focus?.(); } catch {} });

  return {
    element: dialog,
    session,
    refresh: paint,
    open() {
      paint();
      returnFocus = document.activeElement;
      if (!dialog.open) dialog.showModal();
      dialog.querySelector('[data-close]')?.focus();
    },
    close() { if (dialog.open) dialog.close(); },
    isOpen: () => !!dialog.open,
    deepLinkFor: atelierDeepLink,
  };
}
