/** Department map matching Oficina-bots ≤v16.20 (floor grouping for Solo lista / resumen). */
export const DEPARTMENTS = Object.freeze({
  'Personal': ['ted', 'luna', 'vale', 'emiliano'],
  'Jurídico y Finanzas': ['julian', 'ines'],
  'Proyectos': ['ceo', 'apps', 'libro', 'rulo', 'director', 'luca'],
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
