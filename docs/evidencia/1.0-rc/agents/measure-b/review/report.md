# Revisión visual — 56.9/100 (D)

Generado: 2026-11-26T00:28:20.722Z

Fidelidad 56.9/100 (D). ΔE paleta 16.2, Δ luminancia 19.7%, Δ contraste 21.5%, Δ movimiento 0.00.

## Referencia

- Fuente: <repo>\docs\evidencia\1.0-rc\references\premium-landing.jpg
- Formato: 3710x4000 (0.93:1), video, 0.04 s, 25 fps
- Luminancia media 32.1%, contraste 13.5%, saturación 30.2%
- Colorido 22.0%, densidad de bordes 30.1%, zona oscura 9.2%
- Paleta: #615f44 63% · #14100d 12% · #3f3324 13% · #89846f 10% · #aca88e 1% · #986848 0%
- Movimiento medio 0.00 · cortes 0 · ritmo 0 cortes/min
- Pico de movimiento (p90) 0.00
- Aviso: El detector de escenas de FFmpeg no encontró cortes por encima de 0.2.

## Resultado capturado

- URL: http://127.0.0.1:61183/index.html
- Título: HALO FOUNDRY — Cerámica de autor
- Capturas: 6 en `<repo>\docs\evidencia\1.0-rc\agents\measure-b\review\captures`
- Perfil: 1280x720, luminancia 51.8%, contraste 35.0%, movimiento 0.00

## Diferencias medidas

| Métrica | Referencia | Resultado | Δ | Similitud |
| --- | --- | --- | --- | --- |
| luminancia | 0.3210 | 0.5180 | 0.1970 | 34.3% |
| contraste | 0.1350 | 0.3500 | 0.2150 | 0.0% |
| saturación | 0.3020 | 0.2070 | 0.0950 | 72.9% |
| colorido | 0.2200 | 0.2320 | 0.0120 | 97.6% |
| densidad de bordes | 0.3010 | 0.1310 | 0.1700 | 32.0% |
| movimiento | 0.0000 | 0.0000 | 0.0000 | 100.0% |

Paleta de referencia: #615f44, #14100d, #3f3324, #89846f, #aca88e, #986848

Paleta del resultado: #e8e8d8, #29231e, #543f38, #ba7758, #90523c, #bfb8ab

ΔE medio entre paletas: 16.17 (similitud 70.6%)

## Diferencia por píxel (primer fotograma)

| Medida | Valor |
| --- | --- |
| SSIM | 0.2205 |
| MAE | 0.3628 |
| RMSE | 0.4434 |
| ΔE medio | 40.8 |

## Accesibilidad de contraste (medida en DOM)

Elementos comprobados: 2 · incumplimientos orientativos: 0 · contraste medio 12.75:1 · peor 12.75:1.

- La formadel fuego: 12.75:1 (mínimo 3:1, 83.2px)
- Somos un estudio de cerámica de autor. Trabajamos el barro a mano y dejamos que : 12.75:1 (mínimo 4.5:1, 17px)

Contraste calculado en Chromium contra el primer ancestro con fondo opaco; aproximación orientativa, no certificación WCAG.

## Calidad por dimensiones

Calidad 62.3/100 (C) · fidelidad 56.9 · composición 40.6 · jerarquía 45.3 · animación 100.0 · tipografía 82.5 · profundidad 48.1 · iluminación 35.4 · transiciones 100.0 · coherencia 14.0 · accesibilidad 100.0 · fluidez 100.0 · rendimiento 74.0.

| Dimensión | Puntuación | Disponible | Evidencia |
| --- | --- | --- | --- |
| Fidelidad a la referencia | 56.9 | sí | puntuacion=56.9 |
| Composición | 40.6 | sí | referencia=0.934, resultado=0.637, equilibrio=masa por cuadrantes |
| Jerarquía visual | 45.3 | sí | referencia=0.622, resultado=0.896, base=contraste, detalle y foco |
| Tipografía y legibilidad | 82.5 | sí | elements=2, headings=1, distinctSizes=2, averageFontSize=50.1, hierarchyRatio=4.9, note=Tamaños y pesos leídos del DOM; no evalúa calidad artística de la elección tipográfica., fuente=DOM real (capture) |
| Profundidad | 48.1 | sí | referencia=0.398, resultado=0.658, nota=proxy de cuadrantes y detalle; no mapa métrico |
| Iluminación | 35.4 | sí | lumaReferencia=0.321, lumaResultado=0.518, contrasteReferencia=0.135, contrasteResultado=0.35 |
| Animación | 100.0 | sí | movimientoReferencia=0, movimientoResultado=0, cortesReferencia=0, cortesResultado=0, ritmoReferencia=0, ritmoResultado=0 |
| Transiciones y ritmo | 100.0 | sí | cortesReferencia=0, cortesResultado=0, ritmoReferencia=0, ritmoResultado=0 |
| Coherencia estética | 14.0 | sí | histogramaDeMatiz=coseno entre referencias y resultado, valor=0.14 |
| Accesibilidad de contraste | 100.0 | sí | checked=2, violations=0, averageContrast=12.75, worstContrast=12.75, samples=[object Object],[object Object], note=Contraste calculado en Chromium contra el primer ancestro con fondo opaco; aproximación orientativa, no certificación WCAG., norma=WCAG AA orientativo (4.5:1; 3:1 texto grande) |
| Fluidez | 100.0 | sí | jerk=0, parpadeo=0, muestras=5 |
| Rendimiento | 74.0 | sí | intervaloMedioMs=376, intervaloTargetMs=250, jitterRelativo=0.006, capturas=6 |
| Contención decorativa | — | no | nota=sin recuento de efectos |

## Correcciones priorizadas

1. Paleta: la referencia usa #615f44, #14100d, #3f3324; el resultado #e8e8d8, #29231e, #543f38. Cambia los colores base (fondo, acento, texto) a los hex de referencia; no añadas tonos nuevos.
2. El resultado es 19.7 puntos más claro. Oscurece el fondo/base y baja la exposición de las capas grandes.
3. Poca densidad de detalle (13.1% frente a 30.1%). Introduce micro-detalle: grano, retícula, líneas guía o partículas pequeñas.

## Artefactos

- Capturas: `<repo>\docs\evidencia\1.0-rc\agents\measure-b\review\captures`
- Fotograma de referencia: `<repo>\docs\evidencia\1.0-rc\agents\measure-b\review\reference-frame.png`
- Mapa de calor de diferencias: `<repo>\docs\evidencia\1.0-rc\agents\measure-b\review\diff\heatmap.png`
- Informe JSON: `<repo>\docs\evidencia\1.0-rc\agents\measure-b\review\review.json`

## Limitaciones de esta revisión

- La relación de aspecto no coincide (referencia 0.93:1, captura 1.78:1). La comparación de color y contraste sigue siendo válida, pero la composición se estira en el mapa de calor.

## Cómo iterar

1. Aplica sólo las correcciones medidas que afecten a la fidelidad (no añadas efectos sueltos).
2. Vuelve a ejecutar `ve review` con la misma referencia y compara la puntuación.
3. Repite hasta que el Δ quede por debajo del umbral o el cambio deje de mejorar la puntuación.
