/**
 * Fase 1i (boceto 79): estado puro de la tira flotante de abajo (Menú · Modo dios · Día).
 * Sin DOM propio: recibe el elemento #mando-status y la etiqueta de #dock-noche,
 * así se prueba sin navegador y no duplica lógica del mando ni de la luz.
 */
import {mandoEstaAbierto} from './mando-abierto.js';

/** «Modo dios» = el mando cifrado ya existente: candado cerrado o abierto (clase .unlocked). */
export function estadoModoDios(statusEl) {
  const abierto = mandoEstaAbierto(statusEl);
  return {
    abierto,
    estado: abierto ? 'abierto' : 'cerrado',
    icono: abierto ? 'candadoAbierto' : 'candado',
    etiqueta: abierto ? 'Modo dios abierto' : 'Modo dios',
    aria: abierto
      ? 'Modo dios: mando abierto. Toca para ver o cerrar el mando'
      : 'Modo dios: mando bloqueado. Toca para desbloquearlo',
  };
}

/** «Día» cicla Día / Noche / Auto reutilizando #dock-noche; aquí solo se lee su etiqueta. */
export function estadoDia(etiqueta, tema) {
  const lab = String(etiqueta || '').trim() || 'Auto';
  const noche = tema === 'night' || lab === 'Noche';
  return {
    lab,
    noche,
    icono: noche ? 'noche' : 'dia',
    aria: `Luz: ${lab}. Toca para cambiar entre Auto, Noche y Día`,
  };
}
