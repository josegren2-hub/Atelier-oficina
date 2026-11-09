# Handoff de integración

## Fase 1 (0.16.0) — estados en vivo de solo lectura
Atelier lee el `estado.json` **público** que ya publica la oficina anterior:

`https://josegren2-hub.github.io/Oficina-bots/estado.json`

- Cliente web solamente (fetch + poll ~45 s). Sin backend propio y sin costo de API.
- Sin credenciales. `credentials: 'omit'`, `cache: 'no-store'`.
- No se leen `tareas.enc` ni `mando.enc` (fase 2). Solo campos públicos: `id`, `estado`, `frase`, `actualizado`, `salud.latido`.

### Mapeo de estados
| estado.json | Atelier |
|---|---|
| trabajando | working |
| esperando | review |
| pausa | idle |
| (ausente / inválido) | unknown |

Los 16 IDs canónicos coinciden 1:1 (`ted`, `ceo`, `luna`, `emiliano`, `julian`, `ines`, `libro`, `tr-editor`, `mateo`, `tr-cm`, `vale`, `director`, `apps`, `luca`, `tadeo`, `rulo`).

### Frescura (importante)
El loop de la oficina anterior publica cuando cambia algo y además un **latido ~cada 30 min** (`salud.latido`). `actualizado` solo avanza si cambian bots.

Por eso **no** se usa el umbral de 120 s del contrato inicial (pensado para señales por bot de un backend propio). En fase 1:

- Reloj del feed = `max(actualizado, salud.latido)`
- Si ese reloj tiene más de **45 minutos**, todos los bots pasan a `unknown` y se oculta la frase.
- Si el feed está fresco, se muestran los estados mapeados aunque un bot lleve rato en `pausa` (eso es el estado actual publicado).

### Modos de UI
- **En vivo** (predeterminado): poll del estado.json público.
- **Demostración**: ejemplos locales; no consulta la fuente.
- **Sin conexión**: si el fetch falla, se muestra desconectado y se reintenta.

### Contrato schemaVersion 1 (interno tras el mapeo)
Tras mapear, el adaptador valida el mismo envelope:

    {"schemaVersion":1,"mode":"live","source":"…","provenance":{"kind":"runtime-observation"},"bots":[{"id":"…","status":"working","task":"…","lastSignal":"…"}]}

Estados admitidos: working, review, idle, error, unknown.

## Independencia
No se modifica el sitio ni el loop de Oficina-bots. Atelier solo consume el JSON ya publicado. Un despliegue de Atelier no debe sobrescribir ni redirigir la oficina anterior.

## Pendiente (fases siguientes)
Tareas cifradas, mando, paneles avanzados, movimiento real de avatares, notificaciones y cambio de dirección pública — solo con OK explícito de Rob.
