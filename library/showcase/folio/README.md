# Folio · Diseño editorial

Revista independiente de crítica cultural con retícula editorial

- **Arquetipo:** editorial
- **Estilo:** editorial
- **Efectos:** `ink-diffusion` + `dot-matrix`
- **Paleta:** fondo `#f3eee2`, texto `#17140f`, acento `#a62f24`
- **Tipografía:** VE Source Serif 4 / VE Inter; hero 98.2px, cuerpo 17px
- **Layout:** 12 columnas, gutter 36px, máximo 1300px

## Uso

```bash
# desde la raíz del repositorio
npx serve library/showcase
# abrir /folio/index.html
```

Los módulos de efectos y las fuentes se sirven desde `../../assets`; por eso no se abre con `file://` sin servidor local.

## Interacción

- Navegación y tabs con estado `aria-selected`.
- Botones de acción con `aria-pressed`.
- Movimiento de entrada con `prefers-reduced-motion`.
- Medición: 60 FPS, 615 ms de carga, 0 violaciones de contraste en 24 textos, overflow X 0px.

## Motion

- micro: 140 ms, respuesta a hover/focus
- enter: 440 ms, entrada de contenido
- exit: 317 ms, salida de contenido
- screen: 950 ms, transición entre pantallas
- coordinated: 440 ms, coreografía escalonada
- interaction: 140 ms, respuesta a puntero

## Límites

- Contenido y métricas son ficticios y verificables como maqueta, no datos de negocio reales.
- La composición usa los 58 efectos existentes; no añade efectos nuevos.
- La auditoría visual automática no sustituye la evaluación artística humana.
