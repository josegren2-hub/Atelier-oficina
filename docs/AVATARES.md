# Avatares de peluche: revisión visual

Los modelos actuales se construyen con geometría Three.js local a partir de la plantilla aprobada por Rob. Son interpretaciones 3D de una referencia raster, no los mismos modelos de la imagen ni reproducciones fotorrealistas exactas. No son planos ni tarjetas con imagen.

Se mantienen los 16 IDs y funciones. Ted se distingue como principal; Mateo, Naim, Tadeo y Dany usan cuatro rosas diferentes. Julián incorpora corbata negra y expresión formal. Ningún accesorio o halo informa actividad: solo el punto de estado separado lo hace.

Las animaciones son demostraciones explícitas. Sin fuente conectada no se inventan estados de trabajo. La geometría visual permanece dentro de su grupo; no recorre la oficina ni cambia ubicaciones.

Los GLB originales y ted-tierno.js se conservan intactos como legado para trazabilidad y posible reversión; no representan el diseño nuevo. Su manifiesto y pruebas de integridad siguen disponibles.

## API preservada

createAvatarModels({onLoaded,visualHeight}) devuelve attach(bot,parentGroup), update(time,demo,reducedMotion), stats y dispose(). Se integra tanto en la oficina como en la galería desplegable. No requiere nuevas dependencias, CDN, credenciales ni servicios externos.

## Verificación

Validar cuerpos, siluetas, materiales, expresiones, rosas diferenciados, prominencia de Ted, pie visual y límites de colisión. QA visual desktop/móvil sigue siendo necesario tras cambiar modelos, aun con tests de geometría y build correctos.
