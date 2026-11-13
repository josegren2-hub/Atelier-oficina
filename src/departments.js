/** Department map matching the approved floor assignment (Medios y Producción, t359u). */
export const DEPARTMENTS = Object.freeze({
  'Personal': ['ted', 'luna', 'emiliano'],
  'Jurídico y Finanzas': ['julian', 'ines'],
  'Proyectos': ['ceo', 'apps', 'libro', 'luca'],
  'Medios y Producción': ['director', 'rulo', 'vale'],
  'Tinta Rosa': ['mateo', 'tr-editor', 'tr-cm', 'tadeo'],
});

export const DEPARTMENT_OF = Object.freeze(
  Object.fromEntries(Object.entries(DEPARTMENTS).flatMap(([name, ids]) => ids.map(id => [id, name])))
);

export function departmentOf(id) {
  return DEPARTMENT_OF[id] || 'Sin departamento';
}

export function departmentIds(name) {
  return DEPARTMENTS[name] || [];
}
