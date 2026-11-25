# A/B controlado · referencia CC0

Referencia: `docs/evidencia/0.4/referencia-dominio-publico.jpg` — **CC0 · The Metropolitan Museum of Art (Moulin Rouge: La Goulue, Henri de Toulouse-Lautrec)**.

Mismo agente, mismas instrucciones y mismo presupuesto: dos páginas estáticas con idéntico copy, capturadas en Chromium a 1280×800, sin efectos de biblioteca. A es una reconstrucción genérica; B usa `buildReferenceDesign` y tokens del Art Director.

| Dimensión | A genérica | B Art Director | Δ |
| --- | ---: | ---: | ---: |
| Calidad total | 59.8 | 76.4 | 16.6 |
| Coherencia | 0 | 98.1 | 98.1 |
| Tipografía | 92.7 | 100 | 7.3 |
| Accesibilidad | 91.1 | 97.7 | 6.6 |
| Composición | 96.8 | 93.5 | -3.3 |

## Lectura honesta

- La coherencia y la tipografía sí se comparan sobre la misma referencia, mismo copy y misma captura.
- **Transiciones:** la referencia es una imagen; la dimensión de calidad temporal no existe. No se inventa un 40,0 → X. La transición se valida aparte con Motion Director: curva smoothstep monotónica, jerk máximo 0,006222, rotación medida 1,5° para 2° esperados (error 0,5°) y `prefers-reduced-motion` respetado en las 20 composiciones.
- La fidelidad global puede bajar si el sistema prioriza jerarquía y legibilidad sobre copiar píxeles; se muestra en el JSON, no se oculta.
- A y B usan el mismo copy y no cargan efectos; cualquier diferencia proviene de tokens, escala, layout y contraste.

## Archivos

- `baseline.html` / `art-direction.html`
- `capture-baseline/capture-01.png` / `capture-art/capture-01.png`
- `ab-metrics.json`
