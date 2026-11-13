/** Phase 5 UI: ntfy subscribe/configure + Te espera alert history. Does not POST to Rob's topic. */
import {
  createNtfySession,
  waitingAlertCandidates,
  mapSalud,
  avisosHealthLabel,
  atelierDeepLink,
  NTFY_WAIT_HOURS,
  sendThrowawayTest,
} from './ntfy-session.js';

function el(tag, text, className) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null && text !== '') n.textContent = text;
  return n;
}

function dateText(value) {
  const d = new Date(value);
  if (Number.isNaN(+d)) return '';
  return d.toLocaleString('es-MX', {timeZone: 'America/Chihuahua'});
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
        <h2 id="avisos-dialog-title">ntfy · misma fuente que la oficina anterior</h2>
        <p class="muted avisos-lead">El loop de la caja sigue enviando los avisos. San Junipero no vuelve a mandarlos (así no hay duplicados). Aquí configuras la suscripción en <em>este</em> navegador y ves el estado público.</p>
      </div>
      <button type="button" data-close aria-label="Cerrar">✕</button>
    </div>
    <div class="avisos-body">
      <section class="avisos-block" data-health></section>
      <section class="avisos-block">
        <h3>Suscripción en el teléfono</h3>
        <p class="muted">El tema es secreto (como la frase de mando). Se guarda solo en este navegador; nunca en el repo.</p>
        <form class="avisos-form" data-topic-form>
          <label for="avisos-tema">Tema ntfy</label>
          <input id="avisos-tema" name="tema" type="password" autocomplete="off" spellcheck="false" placeholder="Pega el mismo tema que en la oficina anterior">
          <label class="switch"><input type="checkbox" name="remember" checked> Recordar en este navegador</label>
          <p class="avisos-form-status" data-topic-status role="status"></p>
          <div class="detail-actions">
            <button type="submit">Guardar tema</button>
            <button type="button" data-subscribe>Abrir suscripción ntfy</button>
            <button type="button" data-forget>Olvidar tema</button>
          </div>
        </form>
        <p class="muted small">En la app ntfy: Suscribirse → pega el tema. Los avisos llegan del loop viejo; el clic aún abre Oficina-bots hasta que Rob apruebe cambiar la URL.</p>
      </section>
      <section class="avisos-block" data-waiting></section>
      <section class="avisos-block" data-history></section>
      <section class="avisos-block avisos-test">
        <h3>Prueba (tema desechable)</h3>
        <p class="muted">Solo con un tema que empiece por <code>prueba-atelier-</code> o <code>test-atelier-</code>. Nunca uses el tema real.</p>
        <div class="detail-actions">
          <button type="button" data-test-throwaway>Enviar prueba a tema desechable guardado</button>
        </div>
        <p class="avisos-form-status" data-test-status role="status"></p>
      </section>
    </div>`;
  container.append(dialog);

  const healthEl = dialog.querySelector('[data-health]');
  const waitingEl = dialog.querySelector('[data-waiting]');
  const historyEl = dialog.querySelector('[data-history]');
  const form = dialog.querySelector('[data-topic-form]');
  const statusEl = dialog.querySelector('[data-topic-status]');
  const testStatus = dialog.querySelector('[data-test-status]');
  let returnFocus = null;

  function paintTopicStatus() {
    const snap = session.snapshot();
    statusEl.textContent = snap.configured
      ? `Tema guardado en este navegador (${snap.topicMasked}).`
      : 'Sin tema en este navegador. Puedes suscribirte cuando lo pegues.';
    form.tema.value = '';
  }

  function paint() {
    const snapshot = getSnapshot() || {};
    const salud = mapSalud(snapshot.salud);
    const health = avisosHealthLabel(salud);
    healthEl.replaceChildren();
    healthEl.append(el('h3', 'Estado público (estado.json)'));
    const badge = el('p', health.text, `avisos-health ${health.tone}`);
    healthEl.append(badge);
    if (salud.avisosOk) healthEl.append(el('p', `Último envío OK: ${dateText(salud.avisosOk)}`, 'muted small'));
    if (salud.avisosError) healthEl.append(el('p', `Último error: ${dateText(salud.avisosError)}`, 'muted small'));
    healthEl.append(el('p', `Umbral del loop: ${NTFY_WAIT_HOURS} h en «Te espera».`, 'muted small'));

    const cands = waitingAlertCandidates(snapshot.bots || []);
    session.rememberCandidates(cands);
    waitingEl.replaceChildren();
    waitingEl.append(el('h3', 'Te espera · umbral 24 h'));
    waitingEl.append(el('p', 'Misma regla que el loop (solo lectura aquí; no se envía ntfy desde San Junipero).', 'muted small'));
    if (!cands.length) {
      waitingEl.append(el('p', 'Nadie lleva 24 h o más en Te espera ahora.', 'muted'));
    } else {
      for (const c of cands) {
        const card = el('article', undefined, 'avisos-card');
        card.append(el('h4', c.title));
        card.append(el('p', `Desde ${dateText(c.waitingSince)} · ${c.hours} h`, 'muted small'));
        const row = el('div', undefined, 'detail-actions');
        const open = el('button', 'Abrir ficha');
        open.type = 'button';
        open.addEventListener('click', () => { dialog.close(); onChoose(c.id); });
        const copy = el('button', 'Copiar enlace San Junipero');
        copy.type = 'button';
        copy.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(c.deepLink);
            copy.textContent = 'Copiado';
            setTimeout(() => { copy.textContent = 'Copiar enlace San Junipero'; }, 1500);
          } catch {
            copy.textContent = 'No se pudo copiar';
          }
        });
        row.append(open, copy);
        card.append(row);
        waitingEl.append(card);
      }
    }

    const hist = session.readHistory();
    historyEl.replaceChildren();
    historyEl.append(el('h3', 'Historial local (este navegador)'));
    historyEl.append(el('p', 'Se arma al ver candidatos ≥24 h. No es el registro .ntfy-enviados del servidor.', 'muted small'));
    if (!hist.length) historyEl.append(el('p', 'Aún no hay entradas locales.', 'muted'));
    else {
      for (const h of hist.slice(0, 12)) {
        const card = el('article', undefined, 'avisos-card');
        card.append(el('h4', h.title));
        card.append(el('p', `${h.source || ''} · visto ${dateText(h.seenAt)}`, 'muted small'));
        const open = el('button', 'Abrir ficha');
        open.type = 'button';
        open.addEventListener('click', () => { dialog.close(); onChoose(h.id); });
        card.append(open);
        historyEl.append(card);
      }
    }
    paintTopicStatus();
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    try {
      const fd = new FormData(form);
      session.saveTopic(fd.get('tema'), {remember: fd.get('remember') === 'on'});
      statusEl.textContent = 'Tema guardado solo en este navegador.';
      paintTopicStatus();
    } catch (err) {
      statusEl.textContent = err.message || 'No se pudo guardar';
    }
  });
  dialog.querySelector('[data-forget]').addEventListener('click', () => {
    session.clearTopic();
    paintTopicStatus();
  });
  dialog.querySelector('[data-subscribe]').addEventListener('click', () => {
    let topic = session.readTopic();
    if (!topic) {
      try { topic = form.tema.value; session.saveTopic(topic, {remember: form.remember.checked}); }
      catch (err) { statusEl.textContent = err.message; return; }
    }
    const url = session.subscribeUrl();
    if (!url) { statusEl.textContent = 'Guarda un tema primero.'; return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  });
  dialog.querySelector('[data-test-throwaway]').addEventListener('click', async () => {
    testStatus.textContent = '';
    try {
      const topic = session.readTopic() || form.tema.value;
      const st = await sendThrowawayTest({topic, confirmThrowaway: true});
      testStatus.textContent = `Prueba enviada (HTTP ${st}) al tema desechable.`;
    } catch (err) {
      testStatus.textContent = err.message || 'No se envió';
    }
  });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { try { returnFocus?.focus?.(); } catch {} });

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
