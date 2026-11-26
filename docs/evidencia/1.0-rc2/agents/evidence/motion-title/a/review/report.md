# Revisión visual — 97.9/100 (A)

Generado: 2026-11-26T02:17:37.563Z

Fidelidad 97.9/100 (A). ΔE paleta 1.4, Δ luminancia -1.2%, Δ contraste -0.6%, Δ movimiento 0.00.

## Referencia

- Fuente: <repo>\docs\evidencia\1.0-rc2\references\motion-title.jpg
- Formato: 1392x752 (1.85:1), video, 0.04 s, 25 fps
- Luminancia media 35.6%, contraste 26.4%, saturación 11.4%
- Colorido 40.9%, densidad de bordes 15.7%, zona oscura 0.0%
- Paleta: #383838 75% · #f8f8e8 14% · #d87028 7% · #5f5d59 2% · #d7d2c9 1% · #a9a8a0 1%
- Movimiento medio 0.00 · cortes 0 · ritmo 0 cortes/min
- Pico de movimiento (p90) 0.00
- Aviso: El detector de escenas de FFmpeg no encontró cortes por encima de 0.2.

## Resultado capturado

- URL: http://127.0.0.1:61212/index.html
- Título: ORBIT — Secuencia orbital
- Capturas: 6 en `<repo>\docs\evidencia\1.0-rc2\agents\evidence\motion-title\a\review\captures`
- Perfil: 1280x720, luminancia 34.4%, contraste 25.8%, movimiento 0.00

## Diferencias medidas

| Métrica | Referencia | Resultado | Δ | Similitud |
| --- | --- | --- | --- | --- |
| luminancia | 0.3560 | 0.3440 | 0.0120 | 96.0% |
| contraste | 0.2640 | 0.2580 | 0.0060 | 97.0% |
| saturación | 0.1140 | 0.1120 | 0.0020 | 99.4% |
| colorido | 0.4090 | 0.4000 | 0.0090 | 98.2% |
| densidad de bordes | 0.1570 | 0.1600 | 0.0030 | 98.8% |
| movimiento | 0.0000 | 0.0000 | 0.0000 | 100.0% |

Paleta de referencia: #383838, #f8f8e8, #d87028, #5f5d59, #d7d2c9, #a9a8a0

Paleta del resultado: #373838, #f2ebe0, #d46f28, #5f605e, #bbbaaf, #95938e

ΔE medio entre paletas: 1.37 (similitud 97.5%)

## Diferencia por píxel (primer fotograma)

| Medida | Valor |
| --- | --- |
| SSIM | 0.9689 |
| MAE | 0.0163 |
| RMSE | 0.0255 |
| ΔE medio | 2.09 |

## Calidad por dimensiones

Calidad 96.2/100 (A) · fidelidad 97.9 · composición 98.9 · jerarquía 98.0 · animación 100.0 · tipografía 79.7 · profundidad 99.1 · iluminación 97.4 · transiciones 100.0 · coherencia no disponible (imagen casi neutra) · fluidez 100.0 · rendimiento 67.7.

| Dimensión | Puntuación | Disponible | Evidencia |
| --- | --- | --- | --- |
| Fidelidad a la referencia | 97.9 | sí | puntuacion=97.9 |
| Composición | 98.9 | sí | referencia=0.94, resultado=0.935, equilibrio=masa por cuadrantes |
| Jerarquía visual | 98.0 | sí | referencia=0.807, resultado=0.797, base=contraste, detalle y foco |
| Tipografía y legibilidad | 79.7 | sí | nota=proxy estructural: sin auditoría DOM, no se afirma tipografía real |
| Profundidad | 99.1 | sí | referencia=0.396, resultado=0.401, nota=proxy de cuadrantes y detalle; no mapa métrico |
| Iluminación | 97.4 | sí | lumaReferencia=0.356, lumaResultado=0.344, contrasteReferencia=0.264, contrasteResultado=0.258 |
| Animación | 100.0 | sí | movimientoReferencia=0, movimientoResultado=0, cortesReferencia=0, cortesResultado=0, ritmoReferencia=0, ritmoResultado=0 |
| Transiciones y ritmo | 100.0 | sí | cortesReferencia=0, cortesResultado=0, ritmoReferencia=0, ritmoResultado=0 |
| Coherencia estética | — | no | disponible=no, motivo=matiz no interpretable: cobertura cromática 0.066 < 0.08, coberturaReferencia=0.069, coberturaResultado=0.066, neutroReferencia=0.922, neutroResultado=0.922 |
| Accesibilidad de contraste | — | no | nota=sin auditoría DOM; no se inventa una puntuación |
| Fluidez | 100.0 | sí | jerk=0, parpadeo=0, muestras=5 |
| Rendimiento | 67.7 | sí | intervaloMedioMs=408.2, intervaloTargetMs=250, jitterRelativo=0.004, capturas=6 |
| Contención decorativa | — | no | nota=sin recuento de efectos |

## Correcciones priorizadas

1. Sin diferencias medibles por encima del umbral. Revisa a ojo detalles de composición y legibilidad del texto.

## Artefactos

- Capturas: `<repo>\docs\evidencia\1.0-rc2\agents\evidence\motion-title\a\review\captures`
- Fotograma de referencia: `<repo>\docs\evidencia\1.0-rc2\agents\evidence\motion-title\a\review\reference-frame.png`
- Mapa de calor de diferencias: `<repo>\docs\evidencia\1.0-rc2\agents\evidence\motion-title\a\review\diff\heatmap.png`
- Informe JSON: `<repo>\docs\evidencia\1.0-rc2\agents\evidence\motion-title\a\review\review.json`

## Limitaciones de esta revisión

- La relación de aspecto no coincide (referencia 1.85:1, captura 1.78:1). La comparación de color y contraste sigue siendo válida, pero la composición se estira en el mapa de calor.

## Cómo iterar

1. Aplica sólo las correcciones medidas que afecten a la fidelidad (no añadas efectos sueltos).
2. Vuelve a ejecutar `ve review` con la misma referencia y compara la puntuación.
3. Repite hasta que el Δ quede por debajo del umbral o el cambio deje de mejorar la puntuación.
