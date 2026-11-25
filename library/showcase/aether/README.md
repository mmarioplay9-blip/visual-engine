# Aether · Glassmorphism

Landing de espacio de trabajo para equipos distribuidos

- **Arquetipo:** landing
- **Estilo:** glassmorphism
- **Efectos:** `glass-refraction` + `bokeh-drift`
- **Paleta:** fondo `#0a1120`, texto `#f4f8ff`, acento `#9ee7ff`
- **Tipografía:** VE Space Grotesk / VE Inter; hero 52.9px, cuerpo 16px
- **Layout:** 12 columnas, gutter 28px, máximo 1240px

## Uso

```bash
# desde la raíz del repositorio
npx serve library/showcase
# abrir /aether/index.html
```

Los módulos de efectos y las fuentes se sirven desde `../../assets`; por eso no se abre con `file://` sin servidor local.

## Interacción

- Navegación y tabs con estado `aria-selected`.
- Botones de acción con `aria-pressed`.
- Movimiento de entrada con `prefers-reduced-motion`.
- Medición: 61 FPS, 592 ms de carga, 0 violaciones de contraste en 22 textos, overflow X 0px.

## Motion

- micro: 140 ms, respuesta a hover/focus
- enter: 460 ms, entrada de contenido
- exit: 331 ms, salida de contenido
- screen: 1000 ms, transición entre pantallas
- coordinated: 460 ms, coreografía escalonada
- interaction: 140 ms, respuesta a puntero

## Límites

- Contenido y métricas son ficticios y verificables como maqueta, no datos de negocio reales.
- La composición usa los 58 efectos existentes; no añade efectos nuevos.
- La auditoría visual automática no sustituye la evaluación artística humana.
