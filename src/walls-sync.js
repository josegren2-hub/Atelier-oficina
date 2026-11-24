/** Sincroniza la casilla «Fachada de vidrio» con office.setWalls.
 * Al pasar a Edificio cerrado (exterior) se enciende la fachada: hay que
 * llamar a setWalls, no solo marcar la casilla (.checked no dispara 'change').
 * Si la persona desmarca la casilla estando ya en Edificio cerrado, se respeta. */

export function wallsShouldBeOnAfterViewChange(viewMode, userChecked) {
  if (viewMode === 'exterior') return true;
  return Boolean(userChecked);
}

/** Escribe el mismo valor en la casilla y en el modelo 3D. */
export function syncWalls({on, setChecked, setWalls}) {
  const v = Boolean(on);
  if (typeof setChecked === 'function') setChecked(v);
  if (typeof setWalls === 'function') setWalls(v);
  return v;
}

/** La fachada solo se dibuja con el edificio completo (ninguna planta suelta). */
export function wallsFacadeApplies(floorId) {
  return Number(floorId) < 0;
}
