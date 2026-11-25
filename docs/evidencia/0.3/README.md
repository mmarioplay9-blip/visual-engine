# Evidencia de Visual Engine 0.3

Todos los archivos se generaron en esta máquina el 2026-11-25. No son material de terceros sin
licencia: la referencia es un render propio de Remotion y la reconstrucción es una composición
propia grabada en Chromium.

| Archivo | Qué demuestra |
| --- | --- |
| `comparativa-antes-despues.mp4` | Izquierda: referencia Remotion. Derecha: reconstrucción de Visual Engine. 3 s, lado a lado. |
| `referencia-remotion.png` | Fotograma de la referencia real usada para OCR/visión y Reference-to-Effects. |
| `reconstruccion-frame.png` | Fotograma de la composición reconstruida; el titular ya encaja en el lienzo. |
| `referencia-spec.json` | Especificación medida con OCR y descripción LLaVA. |
| `reconstruccion-composition.json` | JSON universal de 3 capas, con procedencia, avisos y confianza. |
| `composicion.png` | Composición de 3 capas con máscara y mezcla, capturada en Chromium. |
| `galeria.png` | Galería local con los 58 efectos. |
| `gsap.png` | Demo funcional de GSAP. |
| `three.png` | Demo funcional de Three.js. |

## Lectura de la comparación

La comparación temporal mide 77,7/100 (B) y 93,9 de fidelidad, pero **no** es una réplica exacta:
tipografía 37,8, coherencia 4,9 y transiciones 40,0. El OCR confundió el pie «100 % · frame 45»
con «10196: frame 18». Se conserva el error para no presentar una corrección inventada.

La reconstrucción usa los efectos `parallax-layers`, `volumetric-rays` y `split-reveal`; las dos
primeras correspondencias son hipótesis declaradas, no identificaciones exactas de la referencia.
