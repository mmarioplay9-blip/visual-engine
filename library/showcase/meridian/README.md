# Meridian · Dashboards financieros

Terminal de cartera para inversión sistemática

- **Arquetipo:** dashboard
- **Estilo:** financial-dashboard
- **Efectos:** `circuit-lines` + `waveform-monitor`
- **Paleta:** fondo `#071019`, texto `#f1f7fb`, acento `#36d6a4`
- **Tipografía:** VE Inter / VE Inter; hero 34.8px, cuerpo 14px
- **Layout:** 12 columnas, gutter 12px, máximo 1560px

## Uso

```bash
# desde la raíz del repositorio
npx serve library/showcase
# abrir /meridian/index.html
```

Los módulos de efectos y las fuentes se sirven desde `../../assets`; por eso no se abre con `file://` sin servidor local.

## Interacción

- Navegación y tabs con estado `aria-selected`.
- Botones de acción con `aria-pressed`.
- Movimiento de entrada con `prefers-reduced-motion`.
- Medición: 61 FPS, 588 ms de carga, 0 violaciones de contraste en 49 textos, overflow X 0px.

## Motion

- micro: 80 ms, respuesta a hover/focus
- enter: 80 ms, entrada de contenido
- exit: 58 ms, salida de contenido
- screen: 80 ms, transición entre pantallas
- coordinated: 80 ms, coreografía escalonada
- interaction: 80 ms, respuesta a puntero

## Límites

- Contenido y métricas son ficticios y verificables como maqueta, no datos de negocio reales.
- La composición usa los 58 efectos existentes; no añade efectos nuevos.
- La auditoría visual automática no sustituye la evaluación artística humana.
