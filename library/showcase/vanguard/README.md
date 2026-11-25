# Vanguard · Interfaces de videojuego

HUD de escuadrón para un shooter táctico competitivo

- **Arquetipo:** hud
- **Estilo:** game-ui
- **Efectos:** `target-reticle` + `telemetry-grid`
- **Paleta:** fondo `#061016`, texto `#eafbff`, acento `#63ffb5`
- **Tipografía:** VE Space Grotesk / VE Inter; hero 60.1px, cuerpo 15px
- **Layout:** 12 columnas, gutter 14px, máximo 1500px

## Uso

```bash
# desde la raíz del repositorio
npx serve library/showcase
# abrir /vanguard/index.html
```

Los módulos de efectos y las fuentes se sirven desde `../../assets`; por eso no se abre con `file://` sin servidor local.

## Interacción

- Navegación y tabs con estado `aria-selected`.
- Botones de acción con `aria-pressed`.
- Movimiento de entrada con `prefers-reduced-motion`.
- Medición: 61 FPS, 585 ms de carga, 0 violaciones de contraste en 39 textos, overflow X 0px.

## Motion

- micro: 103 ms, respuesta a hover/focus
- enter: 345 ms, entrada de contenido
- exit: 248 ms, salida de contenido
- screen: 690 ms, transición entre pantallas
- coordinated: 345 ms, coreografía escalonada
- interaction: 103 ms, respuesta a puntero

## Límites

- Contenido y métricas son ficticios y verificables como maqueta, no datos de negocio reales.
- La composición usa los 58 efectos existentes; no añade efectos nuevos.
- La auditoría visual automática no sustituye la evaluación artística humana.
