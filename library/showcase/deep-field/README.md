# Deep Field · Diseño 3D inmersivo

Experiencia inmersiva de divulgación astronómica

- **Arquetipo:** scene3d
- **Estilo:** immersive-3d
- **Efectos:** `cube-field` + `starfield-warp`
- **Paleta:** fondo `#05060f`, texto `#f3f5ff`, acento `#8b7bff`
- **Tipografía:** VE Space Grotesk / VE Inter; hero 71.7px, cuerpo 16px
- **Layout:** 12 columnas, gutter 38px, máximo 1360px

## Uso

```bash
# desde la raíz del repositorio
npx serve library/showcase
# abrir /deep-field/index.html
```

Los módulos de efectos y las fuentes se sirven desde `../../assets`; por eso no se abre con `file://` sin servidor local.

## Interacción

- Navegación y tabs con estado `aria-selected`.
- Botones de acción con `aria-pressed`.
- Movimiento de entrada con `prefers-reduced-motion`.
- Medición: 61 FPS, 583 ms de carga, 0 violaciones de contraste en 17 textos, overflow X 0px.

## Motion

- micro: 161 ms, respuesta a hover/focus
- enter: 598 ms, entrada de contenido
- exit: 431 ms, salida de contenido
- screen: 1610 ms, transición entre pantallas
- coordinated: 598 ms, coreografía escalonada
- interaction: 161 ms, respuesta a puntero

## Límites

- Contenido y métricas son ficticios y verificables como maqueta, no datos de negocio reales.
- La composición usa los 58 efectos existentes; no añade efectos nuevos.
- La auditoría visual automática no sustituye la evaluación artística humana.
