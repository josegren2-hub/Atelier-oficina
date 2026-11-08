# Avatares reales: integración local

## Procedencia

Se incorporan sin rediseño 15 archivos GLB del paquete `Oficina-16-avatares-v1` (4 de noviembre de 2026), más `ted/ted-tierno.js` V2. El manifiesto original se conserva en `public/assets/avatars/manifest.json`. Las pruebas verifican SHA-256 de cada GLB y de Ted. La fuente declara lectura del README-VISUAL de `josegren2-hub/Oficina-bots`, rama fuente, blob `6eb6ecac09a71e6ca5c9796d8192260eed318cff`; Ted procede de la base `c6b00fbcbfc8166f34e9b0637d24747f795c70a6`. Esto no concede permisos nuevos de publicación.

La fuente se probó en Three r169; esta integración usa únicamente Three r180 ya instalado, incluyendo GLTFLoader y RoundedBoxGeometry. No hay CDN, texturas descargadas, nuevos paquetes ni servicios externos. Los previews fuente examinados son renders Blender de geometría real de los 15 GLB, no capturas de oficina.

## Correspondencia de IDs

- ted → ted (procedural)
- ceo → tommy; apps → charly; libro → rodrigo
- director → joss; tr-editor → naim; tr-cm → dany; vale → valery
- rulo, luca, mateo, tadeo, luna, emiliano, julian e ines conservan sus IDs.

El mapeo es explícito, biyectivo, y se contrasta contra los nombres del anfitrión y el manifiesto. Nunca se infiere por orden.

## API

`createAvatarModels({onLoaded,visualHeight=.9})` devuelve `attach(bot, parentGroup)`, `update(time, demo, reducedMotion)`, `stats` y `dispose()`.

`attach` recibe un **grupo hijo exclusivamente visual**, no la raíz del personaje. Devuelve una promesa que resuelve al grupo o `null` en error. Sustituye únicamente los hijos de ese grupo al cargar. Mantiene intactas posición, orientación y metadata de la raíz anfitriona; añade `userData.bot` y `userData.botId` al contenedor y mallas para picking. Normaliza cada cuerpo a altura local .9, centra x/z y apoya el mínimo y en cero. Si el anfitrión tiene escala propia, esta se aplica además: no duplicar escalas. Frente +Z, arriba +Y.

`onLoaded` recibe `{id, modelId, loaded, error, stats}` tanto en éxito como fallo. `stats` expone total, loaded, pending, failed y errors. Los fallos no se convierten en avatares sustitutos ni señales de actividad.

`demo=false` es el valor predeterminado: modelo estático, datos desconectados. `demo=true` reproduce idle. También se aceptan exclusivamente las cadenas `idle`, `wave`, `work`; todas son **poses de demostración**, nunca evidencia de trabajo real. Al desactivar demo se restablece pose estática. Movimiento reducido congela la pose en tiempo cero. La pose work de Ted no aplica el helper de asiento P5 ni cambia el host.

No hay relojes, listeners, solicitudes de estado, acciones externas ni bucle de render en el módulo. Solo se solicitan los GLB locales al adjuntarlos. El anfitrión posee el bucle. `dispose` libera los recursos propios y evita instalar cargas pendientes después del desmontaje.

## Galería y validación

La galería avatars.html conserva la escala0.9. La oficina usa visualHeight1.35 para mejorar legibilidad. Los GLB no se modificaron.

65 pruebas de proyecto pasan. QA en Chrome de laptop y móvil emulado: exterior, plantas y cuadrícula completos, sin errores de consola. No se ha certificado móvil físico ni equivalencia fotorrealista.
