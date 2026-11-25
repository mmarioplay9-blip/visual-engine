# Evidencia 0.4

- `referencia-dominio-publico.jpg`: Henri de Toulouse-Lautrec, *Moulin Rouge: La Goulue*,
  The Metropolitan Museum of Art, **CC0**, vía Wikimedia Commons.
- `ab/AB.md`: comparación A/B controlada y límites.
- `ab/ab-metrics.json`: métricas crudas de calidad, tipografía y accesibilidad.
- `ab/baseline.html` / `ab/art-direction.html`: las dos variantes con el mismo copy.
- `ab/capture-baseline/capture-01.png` / `ab/capture-art/capture-01.png`: capturas reales.
- `ab/comparativa-ab.png`: A a la izquierda, B a la derecha.
- `ab/make-ab.mjs`: script reproducible; usa `capture` y `evaluateQuality` del motor.
- `../../library/showcase/measurements.json`: 20 composiciones medidas.
- `../../library/showcase/<id>/preview.png`: preview de cada composición.

El A/B es estático. No se usa para afirmar una mejora de transiciones contra vídeo; esa parte se
valida en Motion Director y se declara como límite en `VERIFICACION-0.4.md`.
