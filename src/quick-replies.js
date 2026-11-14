/** Respuestas rápidas OK / Luego / No + grokbot:// (copia al portapapeles, como Oficina v16.16). */
export const QUICK_REPLIES = Object.freeze([
  ['OK', 'OK, adelante'],
  ['Luego', 'Lo veo más tarde'],
  ['No', 'No, gracias'],
]);

export function chatHref(agente) {
  if (!agente) return null;
  return `grokbot://app/v1/agent?id=${encodeURIComponent(agente)}`;
}

export async function copyAndOpenChat({agente, text, clipboard = navigator.clipboard, open = (u) => { location.href = u; }} = {}) {
  const href = chatHref(agente);
  if (!href) return {ok: false, reason: 'sin-agente'};
  try {
    if (text && clipboard?.writeText) await clipboard.writeText(text);
  } catch { /* clipboard may be blocked; still open chat */ }
  try { open(href); } catch { return {ok: false, reason: 'open-failed', href}; }
  return {ok: true, href, copied: Boolean(text)};
}

export function mountQuickReplies(container, {getBot, onToast} = {}) {
  if (!container) return {refresh() {}};
  const root = document.createElement('div');
  root.className = 'ficha-extras';
  root.hidden = true;
  container.appendChild(root);

  function refresh(bot) {
    const b = bot || getBot?.();
    root.replaceChildren();
    if (!b) { root.hidden = true; return; }
    root.hidden = false;
    const unlocked = b.mandoUnlocked === true;
    const waiting = b.status === 'review' && !b.stale;

    // The official «Abrir chat» control lives next to «Ir al avatar» in #detail-chat.
    if (!unlocked) {
      const lock = document.createElement('p');
      lock.className = 'muted';
      lock.textContent = 'Chat y respuestas rápidas con el mando desbloqueado.';
      root.appendChild(lock);
    }

    if (waiting && unlocked && b.agente) {
      const wrap = document.createElement('span');
      wrap.className = 'v16rr';
      for (const [label, text] of QUICK_REPLIES) {
        const a = document.createElement('a');
        a.className = 'mir v16r';
        a.href = chatHref(b.agente);
        a.textContent = label;
        a.title = `Copia “${text}” y abre el chat`;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          copyAndOpenChat({agente: b.agente, text}).then((r) => {
            if (r.ok) onToast?.('Copiado, pégalo en el chat');
            else onToast?.('No se pudo copiar / abrir el chat');
          });
        });
        wrap.appendChild(a);
      }
      root.appendChild(wrap);
    }
    root.hidden = !root.childElementCount;
  }

  return {refresh, root};
}
