# Terra · Interfaces naturales y orgánicas

Aplicación de temporada de cultivo y trazabilidad local

- **Arquetipo:** mobile
- **Estilo:** organic-natural
- **Efectos:** `caustic-light` + `ink-diffusion`
- **Paleta:** fondo `#f1eadc`, texto `#21352b`, acento `#31705a`
- **Tipografía:** VE Source Serif 4 / VE Inter; hero 63.1px, cuerpo 17px
- **Layout:** 12 columnas, gutter 38px, máximo 1200px

## Uso

```bash
# desde la raíz del repositorio
npx serve library/showcase
# abrir /terra/index.html
```

Los módulos de efectos y las fuentes se sirven desde `../../assets`; por eso no se abre con `file://` sin servidor local.

## Interacción

- Navegación y tabs con estado `aria-selected`.
- Botones de acción con `aria-pressed`.
- Movimiento de entrada con `prefers-reduced-motion`.
- Medición: 61 FPS, 590 ms de carga, 0 violaciones de contraste en 24 textos, overflow X 0px.

## Motion

- micro: 140 ms, respuesta a hover/focus
- enter: 620 ms, entrada de contenido
- exit: 446 ms, salida de contenido
- screen: 1300 ms, transición entre pantallas
- coordinated: 620 ms, coreografía escalonada
- interaction: 140 ms, respuesta a puntero

## Límites

- Contenido y métricas son ficticios y verificables como maqueta, no datos de negocio reales.
- La composición usa los 58 efectos existentes; no añade efectos nuevos.
- La auditoría visual automática no sustituye la evaluación artística humana.
