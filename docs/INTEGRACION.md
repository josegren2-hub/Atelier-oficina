## Fase 1 (0.16.0) — estados en vivo de solo lectura
Lee `estado.json` público de Oficina-bots. Sin tareas/mando cifrados.

## Fase 2 (0.17.0) — mando/tareas cifrados + «Te espera»
- Cliente lee solo URLs públicas ya publicadas: `mando.enc` y `tareas.enc`.
- Descifrado en el navegador con AES-GCM + PBKDF2-SHA256 (310000), misma UX que la oficina anterior.
- La frase la escribe Rob; opcionalmente se recuerda en `localStorage` (`atelierMandoClave`: sal + clave cruda exportada). Nunca se sube a Atelier ni al dist.
- «Te espera» = bots con estado vivo `esperando` → `review`. Se limpia en cuanto el vivo deja de marcar esperando.
- Frases de trabajo: prioridad `tareas.enc.frase` → último mensaje → tarea del mando → «Trabajando» (nunca «sin datos» si hay señal de trabajo).
- No se publican claves, plaintext ni chats en el repo.
