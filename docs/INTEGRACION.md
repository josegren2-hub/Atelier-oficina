# Handoff de integración para Grok / siguiente agente

La demo no llama ninguna API. No existe endpoint de Grok supuesto. Debe verificarse cuál es el sistema real que produce estados; el nombre del proyecto no acredita un proveedor de telemetría.

## Frontera propuesta, todavía no conectada
Backend de la misma aplicación expone GET /api/office/snapshot. Credenciales solamente servidor, con autorización del usuario y secretos fuera del repositorio. No introducir claves en Vite, variables VITE_* ni almacenamiento del navegador. No transmitir chats, salud, finanzas o documentos para representar presencia. Usar metadatos mínimos autorizados.

Respuesta propuesta:

    {"schemaVersion":1,"source":"Nombre verificable del origen","bots":[{"id":"ID canónico","status":"working","task":"Resumen autorizado opcional","lastSignal":"2026-11-04T22:00:00Z"}]}

Estados admitidos: working, review, idle, error, unknown. El adaptador rechaza IDs desconocidos/duplicados, tiempos inválidos o futuros y tareas >500 caracteres. Después de 120 s sin señal se presenta unknown. El backend debe autenticar emisor, limitar tasa, no reenviar secretos y preservar timestamp del origen, no el de una animación.

Antes de activar:
1. Confirmar fuente y permisos. Los 16 IDs canónicos ya están en src/data.js y se verificaron contra lista.js; conservarlos al conectar.
2. Implementar backend read-only y mapear nombres canónicos sin inferir por posición.
3. Completar UI live: origen, salud de transporte, señal por bot, estado caducado y señal incompleta. Bot sin registro queda unknown.
4. AbortController al salir/cambiar fuente, reintentos con backoff, timeout y desconexión visible. Nunca caer silenciosamente en demo tras error.
5. Separar modo demo, desconectado y live en controles visibles. No usar métricas sintéticas como producción.
6. Pruebas de esquema, ausencia de señales, caídas, reordenamientos, duplicados, permisos y límites antes de despliegue.

No se implementaron creación de tareas, escritura en servicios, mensajería, login ni API de Grok. Requieren trabajo y autorización aparte. La maqueta de ascensor y escaleras es visual, no navegación en primera persona. Los muebles son procedurales; sustituir por modelos GLB optimizados si se busca más realismo, respetando licencias y presupuesto móvil.

## Independencia obligatoria
La integración descrita es futura y pertenece exclusivamente a este proyecto nuevo. No enlazar por defecto con endpoints, service workers, almacenamiento, archivos de estado ni cuentas de la oficina anterior. El endpoint de ejemplo no existe todavía. Un despliegue debe tener destino propio y no sobrescribir ni redirigir el sitio existente.
