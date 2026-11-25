# Visual Intelligence 0.5 — A/B reproducible

Mismo agente, mismo brief, mismo copy y un máximo de 9.000 caracteres por implementación. B usa tokens, Art Director, critic, fidelidad y gates; A es una plantilla genérica oscura. El banco no ejecuta un proveedor de IA: las cifras de tokens son estimaciones por caracteres y el A/B es una sola pasada. **No se manipulan las métricas.**

| Dominio | Calidad A → B | Fidelidad A → B | Accesibilidad A → B | Composición A → B | Tipografía A → B | Gates A → B |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| professional-app | 66.4 → **79.6** | 64.6 → **75.4** | 100.0 → **100.0** | 87.8 → 98.1 | 94.8 → 99.2 | reject → reject |
| premium-landing | 73.7 → **78.9** | 71.2 → **72.2** | 100.0 → **100.0** | 91.5 → 97.1 | 100.0 → 100.0 | reject → reject |
| game-ui | 71.5 → **73.4** | 63.3 → **62.1** | 100.0 → **100.0** | 84.0 → 76.2 | 100.0 → 100.0 | reject → reject |
| scene-3d | 75.1 → **76.8** | 64.6 → **66.1** | 100.0 → **100.0** | 91.9 → 82.7 | 100.0 → 100.0 | reject → reject |
| motion-graphics | 74.1 → **80.2** | 69.4 → **83.8** | 100.0 → **100.0** | 84.2 → 85.4 | 100.0 → 91.2 | reject → reject |

## Rendimiento y tokens

| Dominio | FPS A → B | Carga A → B (ms) | Tokens est. A → B | Iteraciones |
| --- | ---: | ---: | ---: | ---: |
| professional-app | 61 → 61.3 | 813 → 814 | 951 → 1391 | 0 → 0 |
| premium-landing | 61 → 60.8 | 819 → 822 | 785 → 1193 | 0 → 0 |
| game-ui | 60.9 → 61.4 | 809 → 827 | 831 → 975 | 0 → 0 |
| scene-3d | 61 → 58.6 | 813 → 894 | 748 → 1364 | 0 → 0 |
| motion-graphics | 61.5 → 60.5 | 809 → 819 | 747 → 809 | 0 → 0 |

## Transiciones de vídeo

- Referencia: tres planos de una obra CC0 del MET, 6 s, 25 fps, con dos cortes.
- B: 6 cortes detectados, ritmo 51.43/min; comparación temporal 56.9/100.
- A: página estática, sin timeline de tres planos.
- Los MP4 están en `motion-a.mp4` y `motion-b.mp4`.

## WebGL

La escena B usa Three.js real y expone `camera.rotation.y`. `webgl.json` contiene la rotación esperada, medida, error y frames; la captura es `measure/webgl.png`.

## Límites

- Las referencias son obras CC0 del MET usadas como dirección visual, no pantallas de producto de esos dominios.
- La fidelidad estructural puede no capturar intención artística; se declara junto a la similitud de píxeles.
- No hay telemetría de tokens del proveedor ni se ejecutó un segundo modelo; A y B fueron generados por el mismo agente y banco reproducible.
- La aprobación artística final sigue siendo humana.
