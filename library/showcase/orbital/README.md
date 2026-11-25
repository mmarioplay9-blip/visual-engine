# Orbital · Futurista

Panel de operaciones para una red de infraestructura orbital

- **Arquetipo:** dashboard
- **Estilo:** futuristic
- **Efectos:** `circuit-lines` + `radar-sweep`
- **Paleta:** fondo `#050b12`, texto `#e9fbff`, acento `#5ff2d6`
- **Tipografía:** VE Space Grotesk / VE Inter; hero 52px, cuerpo 14px
- **Layout:** 12 columnas, gutter 28px, máximo 1360px

## Uso

```bash
# desde la raíz del repositorio
npx serve library/showcase
# abrir /orbital/index.html
```

Los módulos de efectos y las fuentes se sirven desde `../../assets`; por eso no se abre con `file://` sin servidor local.

## Interacción

- Navegación y tabs con estado `aria-selected`.
- Botones de acción con `aria-pressed`.
- Movimiento de entrada con `prefers-reduced-motion`.
- Medición: 60 FPS, 587 ms de carga, 0 violaciones de contraste en 49 textos, overflow X 0px.

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
