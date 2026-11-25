# Signal · Ciencia ficción

Sala de señales para monitorización de sensores remotos

- **Arquetipo:** dashboard
- **Estilo:** sci-fi
- **Efectos:** `radar-sweep` + `waveform-monitor`
- **Paleta:** fondo `#05090c`, texto `#f1f7ed`, acento `#b8f36b`
- **Tipografía:** VE JetBrains Mono / VE Inter; hero 44.5px, cuerpo 14px
- **Layout:** 12 columnas, gutter 15px, máximo 1400px

## Uso

```bash
# desde la raíz del repositorio
npx serve library/showcase
# abrir /signal/index.html
```

Los módulos de efectos y las fuentes se sirven desde `../../assets`; por eso no se abre con `file://` sin servidor local.

## Interacción

- Navegación y tabs con estado `aria-selected`.
- Botones de acción con `aria-pressed`.
- Movimiento de entrada con `prefers-reduced-motion`.
- Medición: 61 FPS, 586 ms de carga, 0 violaciones de contraste en 47 textos, overflow X 0px.

## Motion

- micro: 140 ms, respuesta a hover/focus
- enter: 380 ms, entrada de contenido
- exit: 274 ms, salida de contenido
- screen: 1200 ms, transición entre pantallas
- coordinated: 380 ms, coreografía escalonada
- interaction: 140 ms, respuesta a puntero

## Límites

- Contenido y métricas son ficticios y verificables como maqueta, no datos de negocio reales.
- La composición usa los 58 efectos existentes; no añade efectos nuevos.
- La auditoría visual automática no sustituye la evaluación artística humana.
