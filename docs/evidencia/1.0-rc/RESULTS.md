# Visual Engine 1.0.0-rc.1 — evidencia de calidad visual

Cinco proyectos nuevos, medidos con el mismo motor y los mismos umbrales que 0.6. A es una plantilla genérica con el mismo copy; B usa dirección artística, paleta derivada de la referencia, contraste WCAG, jerarquía y movimiento. No se modificó ninguna fórmula, peso ni umbral. Una sola pasada por proyecto.

## Calidad

| Proyecto | Calidad A → B | Fidelidad A → B | Composición A → B | Accesibilidad A → B | Gates A → B |
| --- | ---: | ---: | ---: | ---: | --- |
| premium-landing | 75.9 → **86.2** | 72.5 → **80.1** | 94.6 → 75.0 | 100.0 → 100.0 | reject → **accept** |
| desktop-app | 68.1 → **89.7** | 65.0 → **93.4** | 87.7 → 99.6 | 100.0 → 100.0 | reject → **accept** |
| game-cinematic | 73.3 → **77.7** | 63.5 → **71.6** | 86.5 → 82.3 | 100.0 → 98.7 | reject → **reject** |
| scene-3d | 80.5 → **83.8** | 75.2 → **77.2** | 97.6 → 85.0 | 100.0 → 100.0 | reject → **accept** |
| motion-graphics | 73.2 → **86.9** | 71.4 → **90.5** | 88.9 → 97.8 | 100.0 → 100.0 | reject → **accept** |

## Rendimiento, crítica y coste

| Proyecto | FPS A → B | Carga ms A → B | Críticos/altos A → B | Tokens est. A → B |
| --- | ---: | ---: | ---: | ---: |
| premium-landing | 61.2 → 60.7 | 724 → 742 | 0/2 → 0/0 | 799 → 1561 |
| desktop-app | 61.2 → 61.4 | 716 → 720 | 0/2 → 0/0 | 898 → 2096 |
| game-cinematic | 61.7 → 60.4 | 730 → 734 | 0/2 → 0/1 | 778 → 1896 |
| scene-3d | 61.1 → 55.8 | 729 → 850 | 0/1 → 0/0 | 717 → 2101 |
| motion-graphics | 60.8 → 60.6 | 727 → 745 | 0/1 → 0/0 | 629 → 1394 |

## Motion graphics

- Referencia: 1280×720, 25 fps, 6.00 s, cortes medidos en 2.00 y 4.00 s.
- Resultado: 1280×720, 25 fps, 5.80 s, cortes 0.08 y 1.84 y 3.84 s.
- Fidelidad temporal: **37.6** (A, estático) → **76.6** (B, B).
- Curvas B: luma 0.694, forma -0.331, movimiento 0.508, F1 de cortes 0.8, deriva 0 s.
- Sin corrección de exposición: la primera medición superó el umbral de revisión.

## WebGL

- scene-3d: 1.49° medidos frente a 1.5° esperados (error 0.01°, 184 frames, interactivo: sí).

## Límites

- Las referencias son obras CC0 del MET usadas como dirección visual, no capturas de producto de esos dominios.
- La fidelidad estructural es un proxy: no demuestra intención artística ni superioridad frente a una pieza profesional externa.
- Los tokens son estimados por caracteres; no hay telemetría del proveedor.
- A y B los genera el mismo banco reproducible, no dos modelos distintos.
- La aprobación artística final es humana.
