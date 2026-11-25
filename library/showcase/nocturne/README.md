# Nocturne · Cinematográfico

Sitio de estreno de un documental nocturno con grano y scope 2.39

- **Arquetipo:** landing
- **Estilo:** cinematic
- **Efectos:** `anamorphic-bloom` + `dissolve-grain`
- **Paleta:** fondo `#070707`, texto `#f5efe3`, acento `#e8b86b`
- **Tipografía:** VE Source Serif 4 / VE Inter; hero 74.4px, cuerpo 16px
- **Layout:** 12 columnas, gutter 40px, máximo 1280px

## Uso

```bash
# desde la raíz del repositorio
npx serve library/showcase
# abrir /nocturne/index.html
```

Los módulos de efectos y las fuentes se sirven desde `../../assets`; por eso no se abre con `file://` sin servidor local.

## Interacción

- Navegación y tabs con estado `aria-selected`.
- Botones de acción con `aria-pressed`.
- Movimiento de entrada con `prefers-reduced-motion`.
- Medición: 43 FPS, 717 ms de carga, 0 violaciones de contraste en 22 textos, overflow X 0px.

## Motion

- micro: 253 ms, respuesta a hover/focus
- enter: 713 ms, entrada de contenido
- exit: 513 ms, salida de contenido
- screen: 1610 ms, transición entre pantallas
- coordinated: 713 ms, coreografía escalonada
- interaction: 253 ms, respuesta a puntero

## Límites

- Contenido y métricas son ficticios y verificables como maqueta, no datos de negocio reales.
- La composición usa los 58 efectos existentes; no añade efectos nuevos.
- La auditoría visual automática no sustituye la evaluación artística humana.
