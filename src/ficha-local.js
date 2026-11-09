/** Posponer + notas privadas en la ficha (localStorage only). */
import {isPostponed, postpone} from './local-waiting.js';
import {getNote, setNote} from './local-notes.js';

export function mountFichaLocal(container, {getBot, onChange, onToast} = {}) {
  if (!container) return {refresh() {}};
  const root = document.createElement('div');
  root.className = 'ficha-local';
  container.appendChild(root);

  function refresh(bot) {
    const b = bot || getBot?.();
    root.replaceChildren();
    if (!b) return;

    if (b.status === 'review' && !b.stale) {
      const row = document.createElement('p');
      row.className = 'v15pp';
      const b3 = document.createElement('button');
      b3.type = 'button'; b3.textContent = '⏰ Posponer 3 h';
      b3.addEventListener('click', () => {
        postpone(b.id, b.waitingSince, '3h');
        onToast?.('Pospuesto 3 horas (solo en este dispositivo)');
        onChange?.();
      });
      const bm = document.createElement('button');
      bm.type = 'button'; bm.textContent = '🌙 Hasta mañana';
      bm.addEventListener('click', () => {
        postpone(b.id, b.waitingSince, 'manana');
        onToast?.('Pospuesto hasta mañana 8:00 (solo en este dispositivo)');
        onChange?.();
      });
      row.append(b3, document.createTextNode(' '), bm);
      if (isPostponed(b)) {
        const mark = document.createElement('span');
        mark.className = 'muted';
        mark.textContent = ' (pospuesto)';
        row.append(mark);
      }
      root.appendChild(row);
    }

    if (b.callado?.dias) {
      const c = document.createElement('p');
      c.className = 'v15callado';
      c.textContent = `🤐 Callado: ${Math.floor(b.callado.dias)} días sin actividad y con pendientes`;
      root.appendChild(c);
    }
    if (b.id === 'ted' && b.rutina && (b.rutina.fallo || b.rutina.no_corrio)) {
      const r = document.createElement('p');
      r.className = 'v15rojo';
      r.textContent = `🔴 Rutina ${b.rutina.fallo ? 'con errores' : 'no corrió'}${b.rutina.ultima ? ` · última ${b.rutina.ultima}` : ''}`;
      root.appendChild(r);
    }

    const details = document.createElement('details');
    details.className = 'v15nota';
    const note = getNote(b.id);
    if (note) details.open = true;
    const sum = document.createElement('summary');
    sum.textContent = '📝 Nota privada (solo en este dispositivo)';
    const ta = document.createElement('textarea');
    ta.rows = 3;
    ta.placeholder = 'Escribe una nota…';
    ta.value = note;
    ta.addEventListener('input', () => setNote(b.id, ta.value));
    details.append(sum, ta);
    root.appendChild(details);
  }

  return {refresh, root};
}
