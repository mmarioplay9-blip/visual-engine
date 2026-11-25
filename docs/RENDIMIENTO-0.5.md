# Rendimiento y coste de contexto — 0.5

Medición local, Windows 11, Chromium headless de Playwright, 1280×720. Los FPS son
`requestAnimationFrame` durante 1,2 s; la carga es `load` + 800 ms de estabilización. No son una
medición de GPU ni de un dispositivo móvil.

## A/B

| Caso | FPS A | FPS B | Carga A (ms) | Carga B (ms) | Tokens est. A | Tokens est. B |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| App profesional | 61,0 | 61,3 | 813 | 814 | 951 | 1.391 |
| Landing premium | 61,0 | 60,8 | 819 | 822 | 785 | 1.193 |
| Interfaz de juego | 60,9 | 61,4 | 809 | 827 | 831 | 975 |
| Escena 3D | 61,0 | 58,6 | 813 | 894 | 748 | 1.364 |
| Motion graphics | 61,5 | 60,5 | 809 | 819 | 747 | 809 |

- B mínimo: **58,6 FPS** (3D, Three.js real).
- B máxima carga: **894 ms**.
- No hay caída por debajo de 55 FPS en esta muestra.
- La estimación de tokens es `caracteres/4`; no es el recuento del proveedor. En B incluye más
  HTML porque incorpora escena, imagen y capas de composición.
- Iteraciones del loop en el banco A/B: **0**. El banco mide una pasada reproducible, no un
  agente aplicando parches.

## 20 composiciones 0.4 conservadas

La medición anterior sigue siendo válida para las 20 composiciones existentes: **20/20 OK**,
**61 FPS medianos**, mínimo **43 FPS** (Nocturne), 619 textos sin violaciones de contraste,
0 overflow y reduced-motion respetado. La fase 0.5 no las modifica.

## WebGL real

- Escena Three.js: 1280×720, 213 frames durante la ventana de medición.
- Rotación esperada 1,5°, medida 1,41°, error 0,09°.
- El renderer usa `--use-gl=swiftshader` en el banco de medición; no se extrapola a GPU dedicada.

## Vídeo

- B: 1280×720, 25 fps, 7,0 s, 175 frames, H.264.
- A: 1280×720, 25 fps, 6,44 s, 161 frames, H.264.
- Referencia: 1280×720, 25 fps, 6,0 s, 150 frames.
- La codificación se hizo con FFmpeg; no se midió bitrate subjetivo ni calidad perceptual VMAF.

## Lectura

El coste de la calidad no aparece como caída de FPS en estos casos; aparece como más HTML,
imágenes y capas (tokens estimados mayores) y como una escena WebGL con 58,6 FPS. La medición no
demuestra que Visual Engine sea más rápido: demuestra que en este banco mantiene el rendimiento
mientras sube calidad, con una excepción de fidelidad en juego que se publica.
