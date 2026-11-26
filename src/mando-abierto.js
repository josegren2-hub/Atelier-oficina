/** True if #mando-status shows the mando is unlocked.
 *  paintMando() toggles the class .unlocked together with the label
 *  «Mando desbloqueado · cifrado local». That label also contains the
 *  substring «bloqueado», so a bare /bloqueado/ test is always true and
 *  would keep Agenda locked even after unlock.
 */
export function mandoEstaAbierto(el) {
  if (!el) return false;
  if (el.classList?.contains('unlocked')) return true;
  const s = String(el.textContent || '').trim();
  return /desbloqueado/i.test(s) || /mando abierto/i.test(s);
}

/** After the mando dialog closes, go back to Inicio only if the user opened it
 *  from Inicio and the mando actually unlocked (bug 2, f1k). */
export function debeVolverAInicioTrasMando({solicitadoDesdeInicio, desbloqueado} = {}) {
  return !!(solicitadoDesdeInicio && desbloqueado);
}
