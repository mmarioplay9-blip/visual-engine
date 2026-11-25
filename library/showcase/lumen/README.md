# Lumen · Minimalismo premium

Landing de estudio de arquitectura con luz natural y materialidad

- **Arquetipo:** landing
- **Estilo:** minimal-premium
- **Efectos:** `mesh-gradient` + `dust-motes`
- **Paleta:** fondo `#f6f2ea`, texto `#171512`, acento `#9b3d2e`
- **Tipografía:** VE Space Grotesk / VE Inter; hero 69.1px, cuerpo 16px
- **Layout:** 12 columnas, gutter 50px, máximo 1180px

## Uso

```bash
# desde la raíz del repositorio
npx serve library/showcase
# abrir /lumen/index.html
```

Los módulos de efectos y las fuentes se sirven desde `../../assets`; por eso no se abre con `file://` sin servidor local.

## Interacción

- Navegación y tabs con estado `aria-selected`.
- Botones de acción con `aria-pressed`.
- Movimiento de entrada con `prefers-reduced-motion`.
- Medición: 61 FPS, 624 ms de carga, 0 violaciones de contraste en 22 textos, overflow X 0px.

## Motion

- micro: 180 ms, respuesta a hover/focus
- enter: 480 ms, entrada de contenido
- exit: 346 ms, salida de contenido
- screen: 1100 ms, transición entre pantallas
- coordinated: 480 ms, coreografía escalonada
- interaction: 180 ms, respuesta a puntero

## Límites

- Contenido y métricas son ficticios y verificables como maqueta, no datos de negocio reales.
- La composición usa los 58 efectos existentes; no añade efectos nuevos.
- La auditoría visual automática no sustituye la evaluación artística humana.
