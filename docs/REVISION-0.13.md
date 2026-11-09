# Revisión 0.13, pendiente de QA

Solicitudes recibidas sobre 0.12.1:
1. Al seleccionar avatar desde listado móvil queda un solo bot y cerrar no devuelve todos. Ficha al tocar modelo debe abrir inmediatamente, con rol, actividad, estado, tarea actual y anterior.
2. Vista 2×2 aparenta omitir Penthouse. Conservar cuadrícula y dar acceso evidente al quinto nivel.
3. Todos los submenús deben ser consultas con datos, no formularios para llenar; quitar superficies blancas deslumbrantes.
4. Modo nocturno debe persistir al cambiar vistas/submenús y recargar.
5. Pantallas Ted/Julián deben mostrar rápidamente agenda y pendientes.

Reproducción en navegador de 0.12.1: seleccionar Ted filtra roster a1 y cerrar mantiene filtro; ficha queda fuera pantalla. Tap inequívoco en modelo sí funciona, pero a escala inicial móvil es diminuto. Noche se conserva entre piso y centro de mando; recarga la reinicia. No se atribuye el fallo a una causa no reproducida.

Implementación: lista y piso separados; ficha modal oscura; retorno Ver todos16; 2×2 página1 PB–03 y página2 Penthouse; submenús oscuros con información primero y filtros opcionales; consulta agenda/pendientes por bot; persistencia de tema; galería oscura; tolerancia táctil12px para avatares visibles sin saltar superficies opacas.

Datos: las tareas/actividad/historia mostradas durante DEMO son ejemplos locales rotulados. Fuera DEMO no se inventa actividad ni historial. No se conectan servicios reales.

QA pendiente: tap modelo y tarjeta de lista móvil/desktop; cerrar/Escape/restaurar foco/Ver todos; búsqueda y cambio de piso; página2 Penthouse y vuelta; todos los tabs oscuros; pantallasTed/Julián; noche→vistas→paneles→galería→reload y apagar→reload; regresión de ciclos de16, cámara/títulos y build relativo Pages. No publicar antes de aprobación correspondiente.

## Estado técnico y bloqueo visual
123/123 pruebas Node pasan; build:pages correcto y ambos HTML usan rutas relativas. ZIP Atelier-0.13-CONSULTA-REVISION.zip guardado en Proyecto nuevo privado, 3727713 bytes. Durante descarga para QA la laptop quedó offline: descarga de resultado incierto, sin extracción ni pruebas visuales de 0.13. Revisar Downloads antes de repetir. No publicar ni declarar QA visual aprobada hasta reconexión y matriz completada.

## QA 0.13 y ajuste de selección
QA real confirmó: ficha móvil inmediata, cierre/retorno16, búsqueda conservada y limpieza, Escape de agenda anidada restaura ficha/foco; paginación Penthouse; modo noche conservado entre vistas y recargas, también apagado; todos los paneles y galería oscuros; filtros, estadísticas, notificaciones y agenda/pendientes correctos; ciclo16sentados→paseo→descanso. Restó usabilidad de selección de avatares pequeños. Al probarlos en vista amplia1440, Ted sentado y sin DEMO sí abren ficha. No se confirmó un fallo de coordenadas dinámicas; emulación móvil usa ratón y no activaba halo táctil. La revisión0.13.1 amplía tolerancia también al ratón conservando oclusión y prioridades, y requiere retest.
