# Revisión 0.11: ocho anotaciones originales y seguimiento

Estado: candidato local, no publicado. No presenta las fuentes reales como conectadas.

| Petición | Implementación | Evidencia y pendiente |
|---|---|---|
| 1. Seleccionar un piso directamente desde otra vista | Selector, botones y clic real sobre geometría del piso; prioridad para avatar/agenda; un arrastre no cuenta como clic | Pruebas de raycast reales y navegación. QA visual/interactivo 0.11 pendiente. El clic geométrico faltaba en0.10 y fue reproducido. |
| 2. Pisos más cerca en separación amplia | Distancia vertical6 en vez de9; hueco1.5; encuadre aprovechado sin cortar extremos. 2×2 compacto para cuatro pisos, Penthouse accesible individualmente | Pruebas de cámara/volúmenes sin recortes. Falta comparar capturas 0.11 desktop/móvil y pulsar pisos. |
| 3. Orden por funciones, noche y quitar estructura negra individual | Cinco niveles3/2/6/4/1 según archivo del equipo. Noche real y estructura perimetral oculta individual | Distribución exacta y geometría probadas; QA0.10 pasó noche/individual. Mantener en QA0.11. |
| 4. Menú de actividades | Filtros pendientes, en curso, autorización, urgentes, pospuestas, completadas; búsqueda y bot asignado | Tests de modelo/filter/XSS. QA0.10 panel responsive y Escape. No tareas reales ni historial conectados. |
| 5. Pantallas de agenda Ted/Julián | Pantallas en penthouse y piso jurídico, clic abre agenda, acceso alternativo botón detalle | Raycast ambas agendas y QA0.10 clic3D real aprobados. Calendarios en vivo pendientes de backend y autorización específica. |
| 6. Avatares desplegables, plantilla y más volumen | Galería dentro página;16 modelos3D de plantilla aprobada, Ted destacado,4TR rosas diferentes,Julián corbata | QA0.10 render16/16 y navegación modal. Material se percibe satinado, no pelo real; no prometer fidelidad fotorrealista. |
| 7. No solapamientos/muros y punto de estado | Ubicaciones estáticas seguras, sin caminar a través de paredes. Huellas visuales probadas; puntos desconocidos sin señal y demo rotulada | Test16huellas/colisión muebles y geometría real,6personajes pisoProyectos. QA0.10 sin colisión visible nueva. Estado real pendiente conexión. |
| 8. Notificaciones, actualizar, buscador, pendientes y centro de mando | Paneles y filtros con recuentos auditables; datos ausentes muestran no disponible. Comprobar versión independiente de actividad | Tests y QA0.10 sin datos inventados. Actualizar vista no consulta bots/calendarios desconectados. Historial operativo real pendiente fuente. |

## Corrección del reclamo posterior
- Se confirmó que el sitio0.10 servido en Chrome tiene cinco pisos y modelos nuevos. Las capturas enviadas representan una interfaz distinta/anterior; no se comprobó la causa en el navegador de Rob.
- No hay registro ni archivo service worker/PWA en el código0.10. No se verificaron registros del navegador de Rob, ni se atribuye el problema a caché.
-0.11 muestra versión visible y consulta release.json con no-store, sin credenciales. Si detecta versión nueva ofrece abrirla mediante URL versionada. No borra caché, no desregistra workers ni modifica instalaciones.
- Los títulos, botones y canvas ahora ocupan filas separadas en flujo; no se superponen por posiciones absolutas.
