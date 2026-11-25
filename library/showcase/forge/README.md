# Forge · Futurista

Menú de estrategia para un juego de construcción de facciones

- **Arquetipo:** game-menu
- **Estilo:** futuristic
- **Efectos:** `terrain-grid` + `ember-sparks`
- **Paleta:** fondo `#050b12`, texto `#e9fbff`, acento `#5ff2d6`
- **Tipografía:** VE Space Grotesk / VE Inter; hero 55.7px, cuerpo 15px
- **Layout:** 12 columnas, gutter 28px, máximo 1320px

## Uso

```bash
# desde la raíz del repositorio
npx serve library/showcase
# abrir /forge/index.html
```

Los módulos de efectos y las fuentes se sirven desde `../../assets`; por eso no se abre con `file://` sin servidor local.

## Interacción

- Navegación y tabs con estado `aria-selected`.
- Botones de acción con `aria-pressed`.
- Movimiento de entrada con `prefers-reduced-motion`.
- Medición: 60 FPS, 583 ms de carga, 0 violaciones de contraste en 28 textos, overflow X 0px.

## Motion

- micro: 140 ms, respuesta a hover/focus
- enter: 420 ms, entrada de contenido
- exit: 302 ms, salida de contenido
- screen: 1100 ms, transición entre pantallas
- coordinated: 420 ms, coreografía escalonada
- interaction: 140 ms, respuesta a puntero

## Límites

- Contenido y métricas son ficticios y verificables como maqueta, no datos de negocio reales.
- La composición usa los 58 efectos existentes; no añade efectos nuevos.
- La auditoría visual automática no sustituye la evaluación artística humana.
