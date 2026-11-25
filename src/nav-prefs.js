/** Preferencias no sensibles de la navegación (Fase 1). Sin dependencias para poder probarlas en Node. */
export const NAV_MODOS = ['oculto', 'compacto', 'expandido'];
export const NAV_LS = {modo: 'atelierNavModo', inicio: 'atelierNavInicio'};
/** Celular: menú oculto por defecto. Escritorio: compacto. Respeta la preferencia guardada por tipo de dispositivo. */
export function modoInicial(store, phone) {
  const m = store?.get?.(NAV_LS.modo + (phone ? 'Movil' : 'Escritorio'), null);
  return NAV_MODOS.includes(m) ? m : (phone ? 'oculto' : 'compacto');
}
/** Decisión de Rob (Fase 0): el celular arranca en la Oficina 3D; el escritorio en Inicio, salvo preferencia guardada. */
export function pantallaInicial(store, phone) {
  const v = store?.get?.(NAV_LS.inicio + (phone ? 'Movil' : 'Escritorio'), null);
  return v === 'inicio' || v === 'oficina' ? v : (phone ? 'oficina' : 'inicio');
}
export function siguienteModo(m) { return NAV_MODOS[(NAV_MODOS.indexOf(m) + 1) % NAV_MODOS.length]; }
