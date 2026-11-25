# Mono · Brutalismo

Cartel tipográfico para un festival de diseño independiente

- **Arquetipo:** poster
- **Estilo:** brutalism
- **Efectos:** `ink-diffusion` + `dissolve-grain`
- **Paleta:** fondo `#f2f0e8`, texto `#0b0b0b`, acento `#ff3d00`
- **Tipografía:** VE JetBrains Mono / VE Inter; hero 121.5px, cuerpo 16px
- **Layout:** 12 columnas, gutter 12px, máximo 1440px

## Uso

```bash
# desde la raíz del repositorio
npx serve library/showcase
# abrir /mono/index.html
```

Los módulos de efectos y las fuentes se sirven desde `../../assets`; por eso no se abre con `file://` sin servidor local.

## Interacción

- Navegación y tabs con estado `aria-selected`.
- Botones de acción con `aria-pressed`.
- Movimiento de entrada con `prefers-reduced-motion`.
- Medición: 60 FPS, 591 ms de carga, 0 violaciones de contraste en 16 textos, overflow X 0px.

## Motion

- micro: 161 ms, respuesta a hover/focus
- enter: 345 ms, entrada de contenido
- exit: 248 ms, salida de contenido
- screen: 598 ms, transición entre pantallas
- coordinated: 345 ms, coreografía escalonada
- interaction: 161 ms, respuesta a puntero

## Límites

- Contenido y métricas son ficticios y verificables como maqueta, no datos de negocio reales.
- La composición usa los 58 efectos existentes; no añade efectos nuevos.
- La auditoría visual automática no sustituye la evaluación artística humana.
