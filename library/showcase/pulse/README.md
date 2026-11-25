# Pulse · Motion graphics

Reproductor de música con análisis de frecuencia y movimiento

- **Arquetipo:** app
- **Estilo:** motion-graphics
- **Efectos:** `waveform-monitor` + `starfield-warp`
- **Paleta:** fondo `#090909`, texto `#ffffff`, acento `#ff6b35`
- **Tipografía:** VE Space Grotesk / VE Inter; hero 102.6px, cuerpo 16px
- **Layout:** 12 columnas, gutter 24px, máximo 1400px

## Uso

```bash
# desde la raíz del repositorio
npx serve library/showcase
# abrir /pulse/index.html
```

Los módulos de efectos y las fuentes se sirven desde `../../assets`; por eso no se abre con `file://` sin servidor local.

## Interacción

- Navegación y tabs con estado `aria-selected`.
- Botones de acción con `aria-pressed`.
- Movimiento de entrada con `prefers-reduced-motion`.
- Medición: 60 FPS, 581 ms de carga, 0 violaciones de contraste en 41 textos, overflow X 0px.

## Motion

- micro: 173 ms, respuesta a hover/focus
- enter: 575 ms, entrada de contenido
- exit: 414 ms, salida de contenido
- screen: 1380 ms, transición entre pantallas
- coordinated: 575 ms, coreografía escalonada
- interaction: 173 ms, respuesta a puntero

## Límites

- Contenido y métricas son ficticios y verificables como maqueta, no datos de negocio reales.
- La composición usa los 58 efectos existentes; no añade efectos nuevos.
- La auditoría visual automática no sustituye la evaluación artística humana.
