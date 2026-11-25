# Relay · Aplicaciones profesionales

Consola de soporte para equipos de operaciones

- **Arquetipo:** app
- **Estilo:** professional-app
- **Efectos:** `circuit-lines` + `wave-contours`
- **Paleta:** fondo `#f4f6f9`, texto `#17202e`, acento `#2457d6`
- **Tipografía:** VE Inter / VE Inter; hero 34.8px, cuerpo 14px
- **Layout:** 12 columnas, gutter 15px, máximo 1440px

## Uso

```bash
# desde la raíz del repositorio
npx serve library/showcase
# abrir /relay/index.html
```

Los módulos de efectos y las fuentes se sirven desde `../../assets`; por eso no se abre con `file://` sin servidor local.

## Interacción

- Navegación y tabs con estado `aria-selected`.
- Botones de acción con `aria-pressed`.
- Movimiento de entrada con `prefers-reduced-motion`.
- Medición: 60 FPS, 578 ms de carga, 0 violaciones de contraste en 41 textos, overflow X 0px.

## Motion

- micro: 120 ms, respuesta a hover/focus
- enter: 260 ms, entrada de contenido
- exit: 187 ms, salida de contenido
- screen: 600 ms, transición entre pantallas
- coordinated: 260 ms, coreografía escalonada
- interaction: 120 ms, respuesta a puntero

## Límites

- Contenido y métricas son ficticios y verificables como maqueta, no datos de negocio reales.
- La composición usa los 58 efectos existentes; no añade efectos nuevos.
- La auditoría visual automática no sustituye la evaluación artística humana.
