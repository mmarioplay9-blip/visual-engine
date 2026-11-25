# Neon District · Cyberpunk

Menú de videojuego de acción en una metrópolis lluviosa

- **Arquetipo:** game-menu
- **Estilo:** cyberpunk
- **Efectos:** `glitch-slices` + `neon-rim`
- **Paleta:** fondo `#08060d`, texto `#fff4fb`, acento `#ff2e88`
- **Tipografía:** VE Space Grotesk / VE JetBrains Mono; hero 58.3px, cuerpo 14px
- **Layout:** 12 columnas, gutter 14px, máximo 1360px

## Uso

```bash
# desde la raíz del repositorio
npx serve library/showcase
# abrir /neon-district/index.html
```

Los módulos de efectos y las fuentes se sirven desde `../../assets`; por eso no se abre con `file://` sin servidor local.

## Interacción

- Navegación y tabs con estado `aria-selected`.
- Botones de acción con `aria-pressed`.
- Movimiento de entrada con `prefers-reduced-motion`.
- Medición: 61 FPS, 587 ms de carga, 0 violaciones de contraste en 28 textos, overflow X 0px.

## Motion

- micro: 161 ms, respuesta a hover/focus
- enter: 345 ms, entrada de contenido
- exit: 248 ms, salida de contenido
- screen: 805 ms, transición entre pantallas
- coordinated: 345 ms, coreografía escalonada
- interaction: 161 ms, respuesta a puntero

## Límites

- Contenido y métricas son ficticios y verificables como maqueta, no datos de negocio reales.
- La composición usa los 58 efectos existentes; no añade efectos nuevos.
- La auditoría visual automática no sustituye la evaluación artística humana.
