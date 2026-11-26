# Visual Intelligence 0.6 — A/B reproducible

Mismo agente, mismo brief, mismo copy y un máximo de 9.000 caracteres por implementación. B usa tokens, Art Director, critic, fidelidad y gates; A es una plantilla genérica oscura. El banco no ejecuta un proveedor de IA: las cifras de tokens son estimaciones por caracteres y el A/B es una sola pasada. **No se manipulan las métricas.**

| Dominio | Calidad A → B | Fidelidad A → B | Accesibilidad A → B | Composición A → B | Tipografía A → B | Gates A → B |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| professional-app | 66.4 → **89.7** | 64.6 → **91.6** | 100.0 → **90.5** | 87.8 → 96.3 | 94.8 → 99.2 | reject → accept |
| premium-landing | 73.8 → **86.1** | 71.2 → **81.1** | 100.0 → **100.0** | 91.5 → 91.6 | 100.0 → 100.0 | reject → accept |
| game-ui | 71.6 → **86.5** | 63.3 → **82.8** | 100.0 → **100.0** | 84.0 → 83.2 | 100.0 → 100.0 | reject → accept |
| scene-3d | 75.0 → **87.2** | 64.6 → **87.7** | 100.0 → **100.0** | 91.9 → 90.2 | 100.0 → 100.0 | reject → accept |
| motion-graphics | 74.0 → **78.6** | 69.4 → **83.5** | 100.0 → **100.0** | 84.2 → 82.5 | 100.0 → 91.2 | reject → accept |
| analytics-dashboard | 76.2 → **91.7** | 65.6 → **91.8** | 100.0 → **100.0** | 79.0 → 96.0 | 100.0 → 100.0 | reject → accept |
| launch-microsite | 87.1 → **92.0** | 71.8 → **79.9** | 100.0 → **100.0** | 90.5 → 79.1 | 100.0 → 100.0 | reject → accept |

## Rendimiento y tokens

| Dominio | FPS A → B | Carga A → B (ms) | Tokens est. A → B | Iteraciones |
| --- | ---: | ---: | ---: | ---: |
| professional-app | 60.8 → 61.5 | 820 → 817 | 951 → 1512 | 0 → 0 |
| premium-landing | 60.8 → 61 | 812 → 821 | 785 → 1322 | 0 → 0 |
| game-ui | 60.9 → 61.3 | 822 → 815 | 831 → 1218 | 0 → 0 |
| scene-3d | 61.3 → 58.7 | 822 → 898 | 748 → 1585 | 0 → 0 |
| motion-graphics | 60.8 → 60.4 | 813 → 815 | 747 → 925 | 0 → 0 |
| analytics-dashboard | 61 → 61.4 | 817 → 820 | 757 → 1319 | 0 → 0 |
| launch-microsite | 61.5 → 60.9 | 820 → 824 | 748 → 1331 | 0 → 0 |

## Transiciones de vídeo

- Referencia: tres planos de una obra CC0 del MET, 6 s, 25 fps, con dos cortes.
- B: 3 cortes detectados, ritmo 25.28/min; comparación temporal 59.2/100.
- A: página estática, sin timeline de tres planos.
- Los MP4 están en `motion-a.mp4` y `motion-b.mp4`.

## WebGL

La escena B usa Three.js real y expone `camera.rotation.y`. `webgl.json` contiene la rotación esperada, medida, error y frames; la captura es `measure/webgl.png`.

## Límites

- Las referencias son obras CC0 del MET usadas como dirección visual, no pantallas de producto de esos dominios. Los dos casos nuevos usan renders propios del repositorio como referencia independiente.
- La paleta de B se deriva de la referencia medida (oscuras, medias y acento saturado) y la luz se construye con clave, relleno y viñeta; no se toca el código de métricas.
- La fidelidad estructural puede no capturar intención artística; se declara junto a la similitud de píxeles.
- No hay telemetría de tokens del proveedor ni se ejecutó un segundo modelo; A y B fueron generados por el mismo agente y banco reproducible.
- La aprobación artística final sigue siendo humana.
