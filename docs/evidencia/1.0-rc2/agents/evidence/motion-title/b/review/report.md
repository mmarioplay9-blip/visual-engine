# Revisión visual — 98.7/100 (A)

Generado: 2026-11-26T02:17:53.553Z

Fidelidad 98.7/100 (A). ΔE paleta 0.5, Δ luminancia 0.1%, Δ contraste 0.0%, Δ movimiento 0.00.

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

- URL: http://127.0.0.1:54974/index.html
- Título: ORBIT · Secuencia orbital
- Capturas: 6 en `<repo>\docs\evidencia\1.0-rc2\agents\evidence\motion-title\b\review\captures`
- Perfil: 1280x720, luminancia 35.7%, contraste 26.4%, movimiento 0.00

## Diferencias medidas

| Métrica | Referencia | Resultado | Δ | Similitud |
| --- | --- | --- | --- | --- |
| luminancia | 0.3560 | 0.3570 | 0.0010 | 99.7% |
| contraste | 0.2640 | 0.2640 | 0.0000 | 100.0% |
| saturación | 0.1140 | 0.0850 | 0.0290 | 91.7% |
| colorido | 0.4090 | 0.4090 | 0.0000 | 100.0% |
| densidad de bordes | 0.1570 | 0.1530 | 0.0040 | 98.4% |
| movimiento | 0.0000 | 0.0000 | 0.0000 | 100.0% |

Paleta de referencia: #383838, #f8f8e8, #d87028, #5f5d59, #d7d2c9, #a9a8a0

Paleta del resultado: #383838, #f7f7e7, #da7828, #62635d, #b7b6ab, #ded2bc

ΔE medio entre paletas: 0.49 (similitud 99.1%)

## Diferencia por píxel (primer fotograma)

| Medida | Valor |
| --- | --- |
| SSIM | 0.9743 |
| MAE | 0.0099 |
| RMSE | 0.0246 |
| ΔE medio | 1.69 |

## Calidad por dimensiones

Calidad 97.0/100 (A) · fidelidad 98.7 · composición 99.5 · jerarquía 100.0 · animación 100.0 · tipografía 80.7 · profundidad 99.7 · iluminación 99.9 · transiciones 100.0 · coherencia no disponible (imagen casi neutra) · fluidez 100.0 · rendimiento 65.1.

| Dimensión | Puntuación | Disponible | Evidencia |
| --- | --- | --- | --- |
| Fidelidad a la referencia | 98.7 | sí | puntuacion=98.7 |
| Composición | 99.5 | sí | referencia=0.94, resultado=0.938, equilibrio=masa por cuadrantes |
| Jerarquía visual | 100.0 | sí | referencia=0.807, resultado=0.807, base=contraste, detalle y foco |
| Tipografía y legibilidad | 80.7 | sí | nota=proxy estructural: sin auditoría DOM, no se afirma tipografía real |
| Profundidad | 99.7 | sí | referencia=0.396, resultado=0.398, nota=proxy de cuadrantes y detalle; no mapa métrico |
| Iluminación | 99.9 | sí | lumaReferencia=0.356, lumaResultado=0.357, contrasteReferencia=0.264, contrasteResultado=0.264 |
| Animación | 100.0 | sí | movimientoReferencia=0, movimientoResultado=0, cortesReferencia=0, cortesResultado=0, ritmoReferencia=0, ritmoResultado=0 |
| Transiciones y ritmo | 100.0 | sí | cortesReferencia=0, cortesResultado=0, ritmoReferencia=0, ritmoResultado=0 |
| Coherencia estética | — | no | disponible=no, motivo=matiz no interpretable: cobertura cromática 0.068 < 0.08, coberturaReferencia=0.069, coberturaResultado=0.068, neutroReferencia=0.922, neutroResultado=0.92 |
| Accesibilidad de contraste | — | no | nota=sin auditoría DOM; no se inventa una puntuación |
| Fluidez | 100.0 | sí | jerk=0, parpadeo=0, muestras=5 |
| Rendimiento | 65.1 | sí | intervaloMedioMs=421.4, intervaloTargetMs=250, jitterRelativo=0.004, capturas=6 |
| Contención decorativa | — | no | nota=sin recuento de efectos |

## Correcciones priorizadas

1. Sin diferencias medibles por encima del umbral. Revisa a ojo detalles de composición y legibilidad del texto.

## Artefactos

- Capturas: `<repo>\docs\evidencia\1.0-rc2\agents\evidence\motion-title\b\review\captures`
- Fotograma de referencia: `<repo>\docs\evidencia\1.0-rc2\agents\evidence\motion-title\b\review\reference-frame.png`
- Mapa de calor de diferencias: `<repo>\docs\evidencia\1.0-rc2\agents\evidence\motion-title\b\review\diff\heatmap.png`
- Informe JSON: `<repo>\docs\evidencia\1.0-rc2\agents\evidence\motion-title\b\review\review.json`

## Limitaciones de esta revisión

- La relación de aspecto no coincide (referencia 1.85:1, captura 1.78:1). La comparación de color y contraste sigue siendo válida, pero la composición se estira en el mapa de calor.

## Cómo iterar

1. Aplica sólo las correcciones medidas que afecten a la fidelidad (no añadas efectos sueltos).
2. Vuelve a ejecutar `ve review` con la misma referencia y compara la puntuación.
3. Repite hasta que el Δ quede por debajo del umbral o el cambio deje de mejorar la puntuación.
