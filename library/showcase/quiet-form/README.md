# Quiet Form · Neumorphism

Aplicación de seguimiento de hábitos con superficies suaves

- **Arquetipo:** app
- **Estilo:** neumorphism
- **Efectos:** `wave-contours` + `caustic-light`
- **Paleta:** fondo `#e8edf2`, texto `#24303c`, acento `#2e6f8e`
- **Tipografía:** VE Inter / VE Inter; hero 43.2px, cuerpo 16px
- **Layout:** 12 columnas, gutter 33px, máximo 1180px

## Uso

```bash
# desde la raíz del repositorio
npx serve library/showcase
# abrir /quiet-form/index.html
```

Los módulos de efectos y las fuentes se sirven desde `../../assets`; por eso no se abre con `file://` sin servidor local.

## Interacción

- Navegación y tabs con estado `aria-selected`.
- Botones de acción con `aria-pressed`.
- Movimiento de entrada con `prefers-reduced-motion`.
- Medición: 61 FPS, 588 ms de carga, 0 violaciones de contraste en 41 textos, overflow X 0px.

## Motion

- micro: 180 ms, respuesta a hover/focus
- enter: 380 ms, entrada de contenido
- exit: 274 ms, salida de contenido
- screen: 900 ms, transición entre pantallas
- coordinated: 380 ms, coreografía escalonada
- interaction: 180 ms, respuesta a puntero

## Límites

- Contenido y métricas son ficticios y verificables como maqueta, no datos de negocio reales.
- La composición usa los 58 efectos existentes; no añade efectos nuevos.
- La auditoría visual automática no sustituye la evaluación artística humana.
