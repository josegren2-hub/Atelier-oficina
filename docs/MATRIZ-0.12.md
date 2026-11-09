# Matriz de revisión 0.12

Estado: implementación local; 108 pruebas técnicas aprobadas. La revisión visual de esta versión en navegador real sigue pendiente. No está publicada.

| Solicitud | Implementado | Evidencia disponible | Límite o pendiente |
| --- | --- | --- | --- |
| 1. Elegir piso desde cualquier vista | Selector Distribución y clic en geometría llevan al nivel | Pruebas de escena y QA real anterior 0.11.1 | Repetir QA visual con movimientos |
| 2. Pisos más cerca, 2×2 aprovechable | Separación compacta; PB–03 en 2×2 y Ted individual; cámara ajustada | Pruebas de encuadre; QA anterior desktop/móvil | Revisar nueva altura de controles demo |
| 3. Funciones, noche, líneas | Distribución 3/2/6/4/1 según archivo; noche real; perímetro oculto individual | Datos, iluminación y escena probados; QA anterior | Confirmar noche con nueva demo |
| 4. Actividades | Filtros para pendientes, en curso, autorización, urgente, pospuesta y completada; ejemplos ficticios | Pruebas de datos y filtros | Sin fuente real; filtros nuevos visibles requieren QA |
| 5. Agendas | Pantallas de Ted/Julián y botones abren agenda; eventos de ejemplo | Raycast y contrato; pantallas reales verificadas en 0.11.1 | Eventos ficticios; backend real desconectado |
| 6. Avatares | 16 modelos volumétricos, galería dentro página, Ted destacado, Julián corbata, cuatro rosas | QA anterior 16/16; pruebas nuevas de articulación y poses | Estética satinada, no pelo real; poses requieren QA visual |
| 7. Colisiones y estado | Rutas con obstáculos, silla propia, caminar/trabajar sentado/descansar; desconocido fuera demo | 16 completan ciclos, distancia y separación comprobadas por frame | Revisar apoyo visual y movimientos en GPU real; señal real ausente |
| 8. Centro de mando | Buscador, notificaciones, estadísticas, actualización y tareas con datos de ejemplo | Pruebas de panel y contrato; QA anterior de navegación | Ninguna actualización consulta bots/calendarios reales |

La demo es visible desde el inicio y está rotulada como simulación. Al salir se eliminan ejemplos de tareas, eventos y notificaciones y no se atribuye trabajo real. La versión permite comprobar la publicación sin borrar cachés ni datos.

No se copió contenido privado de Oficina-bots. Su señal pública de mensajes recientes no acredita ejecución real. Integración futura exige una fuente autenticada y datos expresamente permitidos.

## QA real de 0.12 completado
Chrome WebGL en laptop, sesión de aproximadamente diez minutos: se observó el ciclo 16 sentados → paseo y descanso → 16 sentados. Los seis de Proyectos, incluidos Luca y Rulo, ocuparon sus puestos. Sin atravesamientos evidentes en vistas normales y con acercamiento 2×; esto no equivale a inspección visual de cada frame.

Modo nocturno confirmado. Vistas en 1037×700 y móvil emulado 390×844 sin desbordamiento; clic de planta en escritorio y móvil confirmado. Galería 16/16. Tareas 6, filtro urgente 1, búsqueda inexistente 0, estadísticas coherentes, notificaciones 2. Las dos pantallas 3D abrieron las agendas con fechas ficticias 2030. Salir de DEMO eliminó tareas, avisos y eventos y mostró Sin señal. Consola sin errores ni advertencias.

Detalles encontrados: cabecera ocupaba dos filas y reducía el canvas 2×2 a 797×244.5; placa negra aparentemente suspendida en PB. La revisión 0.12.1 corrige estos detalles y requiere revalidación antes de publicación. Teléfono físico no probado. Apariencia satinada, no pelo real.

## Ajustes 0.12.1
La placa era la marquesina de entrada, que no se ocultaba al aislar PB. Ahora pertenece al grupo de estructura exterior, conservándose en edificio completo y ocultándose en interior. Se compactaron cabecera desktop y banda de título sin superponer controles sobre el canvas. Pruebas técnicas: 109/109 y build correcto. Paquete privado de QA generado; revalidación visual en curso.

## Revalidación 0.12.1
QA real aprobado: PB ya no muestra marquesina suspendida y exterior la conserva. Cabecera 1037×700 en una fila; canvas 2×2 recupera 797×316.5. Móvil emulado 390×844 sin desbordamiento, canvas 375×235.5 con controles y aviso visibles. Los 16 alcanzan asiento; panel de seis ejemplos y salida a Sin señal correctos; consola limpia. Regresión dirigida de los cambios, complementaria a la matriz larga de 0.12.

Publicación autorizada en Atelier-oficina: fuente 4b337d97276935fc18c32be21e9c96ad2f73228f; distribución fd94abee5a74b8dbb02e5278751537b9d5338440. Los 25 archivos de distribución coinciden exactamente con el build probado. Verificación live en curso.

## Corrección de publicación
QA live detectó que el primer build 0.12.1 usaba /assets y no cargaba bajo el subdirectorio de Pages. Se corrigió con build:pages, rutas relativas ./assets y base Vite relativa por defecto. Se añadió prueba de regresión de configuración. No se atribuyó el fallo a caché ni se entregó enlace como terminado.

## Cierre live
QA live corregida aprobada en https://josegren2-hub.github.io/Atelier-oficina/?v=0.12.1 : CSS/WebGL y 16/16 modelos; ciclo 16 sentados → 16 caminando → 16 descanso; noche; galería; panel de seis ejemplos y agenda ficticia 2030; PB sin marquesina suspendida; controles/títulos; móvil emulado 390×844 sin desbordamiento horizontal. Comprobar versión indica 0.12.1; consola limpia. URL sin query conservó HTML anterior durante esta prueba, por lo que se entrega la URL versionada comprobada. No se borraron datos ni cachés. Deploy final 338038b1883edef08c06aa45ebd71fad328f22f7, Pages 42535001095 success; fuente final 0318460f1901ce1a873ad5b93fa6f4f2567f2f22. 110 pruebas pasan.
