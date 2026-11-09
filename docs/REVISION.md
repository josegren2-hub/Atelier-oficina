# Revisión 0.10.0, no publicada

La base se verificó contra los 46 archivos de la rama main remota, árbol 6ce06ccff179cad23550079af2bae893a8aad451. Se trabaja en una copia local y rama revision/correcciones-oficina. La oficina anterior y el sitio publicado permanecen intactos.

## Cambios preparados
- Selector directo de planta dentro de Distribución, válido desde todas las vistas.
- Plantas más próximas en la vista de separación vertical.
- Modo nocturno y retirada de estructura perimetral que obstruye el piso aislado.
- Avatares en desplegable dentro de la misma página. Se conservan identidades y modelos originales; nuevas propuestas visuales se revisan por separado.
- Estados visibles por color y texto; sin fuente real, estado desconocido.
- Centro de mando de lectura con actividades, filtros, notificaciones y estadísticas de datos recibidos, no inventados.
- Pantallas de agenda en oficinas Ted/Julián y acceso accesible desde detalles.

## Pendientes que no se presentan como resueltos
- Distribución incorporada de equipo-bots-rob.docx: PB Personal (3), piso 1 Jurídico y Finanzas (2), piso 2 Proyectos (6), piso 3 Tinta Rosa (4), piso 4 Penthouse Ted (1). Compartir piso no implica colaboración habitual ni activa tareas.
- Agenda y actividad reales requieren backend privado y autorización para la fuente concreta. No se conectó ningún calendario ni bot, no hay credenciales, no se guardan datos personales en Pages.
- La actualización sin fuente solo actualiza la interfaz y declara la desconexión.
- Avatares sustituidos por modelos geométricos de peluche basados en la plantilla aprobada: 16 identidades, Ted principal +15%, cuatro tonos rosas Tinta Rosa y Julián con corbata negra. Son interpretación 3D, no reproducción fotorrealista exacta. Falta QA visual de los modelos nuevos.
- No se ha abierto PR ni publicado una rama remota. El paquete es candidato local para revisión y aprobación previa a cualquier publicación.

## Verificación
- 85/85 pruebas Node pasan, incluyendo disposición, cámara, datos, centro de mando y geometría/raycast reales con GPU y DOM simulados.
- Build Pages correcto. Advertencia conocida: dependencia Three.js produce chunk superior a 500 kB.
- QA visual desktop/móvil aún pendiente: Chromium local no puede crear socket en este entorno (Operation not permitted), incluso ejecución revisada. Navegador cloud no alcanza localhost (ERR_CONNECTION_REFUSED). Se entrega tests/review-ui.cjs para el entorno con navegador disponible. No se presenta esta etapa como aprobada.

## QA visual 0.9 y ajuste 0.9.1
La revisión en laptop confirmó distribución 3/2/6/4/1, estados demo reversibles, noches, paneles sin datos inventados, ambas agendas mediante clic 3D y controles desktop/móvil sin overflow. Se detectó título recortado; 0.9.1 reserva banda opaca de 84 px fuera del canvas y corrige singular «1 bot». Falta revalidar visualmente ese ajuste.
