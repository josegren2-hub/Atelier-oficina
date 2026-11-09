# Demostración 0.12, pendiente de QA

Al abrir se muestra claramente una DEMOSTRACIÓN con datos ficticios locales, sin fuente real. Salir de demostración elimina tareas, eventos y notificaciones de ejemplo y muestra estados desconocidos.

## Qué debe probarse
1. Cinco niveles y selección geométrica, 2×2 PB–03 y penthouse individual, controles/cámara/títulos responsive.
2. Modo nocturno: iluminación exterior tenue e interior cálida, sin alterar estado de datos.
3.16 modelos nuevos, pies/brazos y poses, sin modificar identidades ni asignación3/2/6/4/1.
4. Ejemplo mixto: trabajando camina a puesto y se sienta; esperando revisión permanece disponible; inactivo muestra paseo/lectura/descanso.
5. Todos trabajando: cada uno de16 llega al asiento asignado y adopta postura visible. No atraviesa muebles/muros/personas. Repetir tras Descanso.
6. Pausa/reduced motion, pestaña oculta y volver, cambios rápidos de preset/vista, salir y reentrar demo.
7. Tareas de ejemplo: pendientes,en curso,autorización,urgentes,pospuestas,completadas. Buscar/filtrar,notificaciones y recuentos auditables.
8. Agendas Ted/Julián por pantalla3D y botón detalle. Eventos rotulados Ejemplo,fecha ficticia,fuentereal desconectada.
9. Galería dentro página y cierre/foco; estados desconocidos fuera demo; versión visible/comprobar versión.

## Fuente real
La oficina anterior publica un resumen cuyos estados se basan en mensajes recientes, no ejecución confirmada. No se importó como trabajo real. Sus tareas/agendas no se copiaron; no se accedió a fuentes cifradas ni credenciales. El adaptador está deshabilitado por defecto y requiere un backend autenticado, alcance autorizado y señales frescas por bot. Esta demostración no crea esa conexión.

## Apoyo en silla
Los asientos son únicos por personaje. La postura debe apoyar el torso en la altura del cojín usando el volumen real del torso, no la caja total de pies o halo. El apoyo se interpola visualmente; el motor controla X/Z y conserva rutas/obstáculos. La silla asignada permite contacto intencional; otras sillas y muebles siguen bloqueando.

## Evidencia de pruebas pendiente de cierre
Anotar recuento final de pruebas, duración de simulación, cuántos personajes llegan a puesto, desplazamiento real de cada inactivo, colisiones, cambios de modo y resultado QA visual. No sustituir QA visual por pruebas con GPU/DOM simulados.

## Pruebas técnicas completadas
108/108 pruebas Node pasan y build Vite correcto. El motor verifica 16 llegadas a silla, ciclo de descanso sostenido de los 16 y regreso a trabajar, con comprobaciones de trayectorias y separación en cada frame. QA visual real aún pendiente.
