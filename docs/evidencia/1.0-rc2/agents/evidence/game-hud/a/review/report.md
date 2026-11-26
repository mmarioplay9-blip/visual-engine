# Revisión visual — 94.7/100 (A)

Generado: 2026-11-26T02:17:04.592Z

Fidelidad 94.7/100 (A). ΔE paleta 3.5, Δ luminancia 2.1%, Δ contraste -0.7%, Δ movimiento 0.00.

## Referencia

- Fuente: <repo>\docs\evidencia\1.0-rc2\references\game-hud.jpg
- Formato: 1392x752 (1.85:1), video, 0.04 s, 25 fps
- Luminancia media 12.2%, contraste 9.5%, saturación 21.9%
- Colorido 10.1%, densidad de bordes 9.0%, zona oscura 51.8%
- Paleta: #141213 68% · #34343c 30% · #5f4423 1% · #5c7e71 1% · #ace1d4 0% · #789a8b 0%
- Movimiento medio 0.00 · cortes 0 · ritmo 0 cortes/min
- Pico de movimiento (p90) 0.00
- Aviso: El detector de escenas de FFmpeg no encontró cortes por encima de 0.2.

## Resultado capturado

- URL: http://127.0.0.1:65293/index.html
- Título: Objetivo del cañón
- Capturas: 6 en `<repo>\docs\evidencia\1.0-rc2\agents\evidence\game-hud\a\review\captures`
- Perfil: 1280x720, luminancia 14.3%, contraste 8.8%, movimiento 0.00

## Diferencias medidas

| Métrica | Referencia | Resultado | Δ | Similitud |
| --- | --- | --- | --- | --- |
| luminancia | 0.1220 | 0.1430 | 0.0210 | 93.0% |
| contraste | 0.0950 | 0.0880 | 0.0070 | 96.5% |
| saturación | 0.2190 | 0.2330 | 0.0140 | 96.0% |
| colorido | 0.1010 | 0.1230 | 0.0220 | 95.6% |
| densidad de bordes | 0.0900 | 0.1140 | 0.0240 | 90.4% |
| movimiento | 0.0000 | 0.0000 | 0.0000 | 100.0% |

Paleta de referencia: #141213, #34343c, #5f4423, #5c7e71, #ace1d4, #789a8b

Paleta del resultado: #1c1716, #383237, #69705f, #6c4a29, #b8f8e8, #96a79c

ΔE medio entre paletas: 3.53 (similitud 93.6%)

## Diferencia por píxel (primer fotograma)

| Medida | Valor |
| --- | --- |
| SSIM | 0.7019 |
| MAE | 0.0384 |
| RMSE | 0.0523 |
| ΔE medio | 5.58 |

## Calidad por dimensiones

Calidad 85.3/100 (A) · fidelidad 94.7 · composición 82.4 · jerarquía 85.8 · animación 100.0 · tipografía 61.5 · profundidad 98.9 · iluminación 90.4 · transiciones 100.0 · coherencia 12.1 · fluidez 100.0 · rendimiento 52.8.

| Dimensión | Puntuación | Disponible | Evidencia |
| --- | --- | --- | --- |
| Fidelidad a la referencia | 94.7 | sí | puntuacion=94.7 |
| Composición | 82.4 | sí | referencia=0.888, resultado=0.976, equilibrio=masa por cuadrantes |
| Jerarquía visual | 85.8 | sí | referencia=0.544, resultado=0.615, base=contraste, detalle y foco |
| Tipografía y legibilidad | 61.5 | sí | nota=proxy estructural: sin auditoría DOM, no se afirma tipografía real |
| Profundidad | 98.9 | sí | referencia=0.388, resultado=0.382, nota=proxy de cuadrantes y detalle; no mapa métrico |
| Iluminación | 90.4 | sí | lumaReferencia=0.122, lumaResultado=0.143, contrasteReferencia=0.095, contrasteResultado=0.088 |
| Animación | 100.0 | sí | movimientoReferencia=0, movimientoResultado=0, cortesReferencia=0, cortesResultado=0, ritmoReferencia=0, ritmoResultado=0 |
| Transiciones y ritmo | 100.0 | sí | cortesReferencia=0, cortesResultado=0, ritmoReferencia=0, ritmoResultado=0 |
| Coherencia estética | 12.1 | sí | metodo=coseno de histogramas suavizados con núcleo von Mises (κ=4, circular), valor=0.121, coberturaCromatica=0.323, matizMedioReferencia=238.6, matizMedioResultado=1, desplazamientoMatizDeg=122.4, maticesEfectivos=1.05, neutroReferencia=0.676, neutroResultado=0.38 |
| Accesibilidad de contraste | — | no | nota=sin auditoría DOM; no se inventa una puntuación |
| Fluidez | 100.0 | sí | jerk=0, parpadeo=0, muestras=5 |
| Rendimiento | 52.8 | sí | intervaloMedioMs=473.8, intervaloTargetMs=250, jitterRelativo=0.016, capturas=6 |
| Contención decorativa | — | no | nota=sin recuento de efectos |

## Correcciones priorizadas

1. Sin diferencias medibles por encima del umbral. Revisa a ojo detalles de composición y legibilidad del texto.

## Artefactos

- Capturas: `<repo>\docs\evidencia\1.0-rc2\agents\evidence\game-hud\a\review\captures`
- Fotograma de referencia: `<repo>\docs\evidencia\1.0-rc2\agents\evidence\game-hud\a\review\reference-frame.png`
- Mapa de calor de diferencias: `<repo>\docs\evidencia\1.0-rc2\agents\evidence\game-hud\a\review\diff\heatmap.png`
- Informe JSON: `<repo>\docs\evidencia\1.0-rc2\agents\evidence\game-hud\a\review\review.json`

## Limitaciones de esta revisión

- La relación de aspecto no coincide (referencia 1.85:1, captura 1.78:1). La comparación de color y contraste sigue siendo válida, pero la composición se estira en el mapa de calor.

## Cómo iterar

1. Aplica sólo las correcciones medidas que afecten a la fidelidad (no añadas efectos sueltos).
2. Vuelve a ejecutar `ve review` con la misma referencia y compara la puntuación.
3. Repite hasta que el Δ quede por debajo del umbral o el cambio deje de mejorar la puntuación.
