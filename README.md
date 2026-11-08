# Atelier · oficina 3D

Proyecto independiente de cuatro plantas y 16 avatares. Maqueta visual en tiempo real, no reproducción fotorrealista. Sin conexión a tareas reales ni backend.

## Desarrollo

Node20.19+ o22.12+. Ejecutar `npm ci`, `npm test` y `npm run dev`.

## Preparación de GitHub Pages

`npm run build:pages` genera `dist/` con rutas relativas, compatible con una URL de proyecto. Añadir `.nojekyll` vacío a la raíz del despliegue.

Publicación autorizada para el repositorio independiente `Atelier-oficina`, fuente en `main` y contenido de `dist/` en `gh-pages`, Pages desde `gh-pages` / raíz. No reutilizar ni modificar Oficina-bots. No se incluyen acciones de publicación automática.

GitHub Pages normal es público: no incluir claves, chats, tareas reales, archivos cifrados ni información privada. No ofrece autenticación privada equivalente al Site actual. El código y los avatares publicados pueden descargarse.

El estado inicial es desconectado. La simulación es explícita y optativa. Para Grokbot hace falta implementar backend seguro independiente y conexión validada, según docs/INTEGRACION.md.
