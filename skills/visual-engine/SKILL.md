---
name: visual-engine
description: Motor local y gratuito de calidad visual. Analiza referencias, compone efectos reales en capas, genera código y previsualizaciones, captura en Chromium y compara con métricas. Úsala para diseño, motion graphics, 3D, HUD, vídeo o cualquier petición de "que se vea profesional".
---

# Visual Engine 0.3

Convierte una referencia en **especificación medida**, **composición de efectos ejecutable** y
resultado verificado: referencia → escenas/cámara/efectos → spec → composición → captura →
comparación temporal → corrección con reversión. Todo local, sin APIs de pago.

## Antes de empezar

```bash
ve doctor
ve vision status
ve adapters
ve effects list --json
```

`vision status` declara Tesseract, VRAM, modelos instalados y el modelo seleccionado. Si falta
algo, devuelve `available:false` con el motivo. **No inventes OCR, objetos ni descripciones.**

## Ciclo de trabajo

### 1. Descomponer la referencia

```bash
ve timeline referencia.mp4 --out ./analisis --storyboard
ve motion referencia.mp4 --json
ve inspect referencia.mp4
ve detect referencia.mp4
ve spec referencia.mp4 --vision --out ./analisis
```

- **timeline**: escenas, cortes, ritmo, fotogramas clave y storyboard.
- **motion**: desplazamiento, zoom, rotación, velocidad, aceleración y temblor.
- **inspect**: composición, formas, regiones de texto, saliencia y profundidad proxy.
- **detect**: efectos con evidencia y estado `verified`/`estimated`.
- **spec --vision**: añade OCR y descripción semántica locales (`ocr.json`, `semantic.json`).

### 2. Pasar de la referencia a efectos

```bash
ve refeffects referencia.mp4 --spec ./analisis/spec.json --out ./reconstruccion
```

Produce `composition.json`, HTML, timeline, capas y código. Cada asignación lleva confianza y una
nota que explica la hipótesis. **No afirmes que se identificó el plugin exacto**: es una
correspondencia estimada salvo que el estado sea `verified` y aun así es una aproximación.

### 3. Elegir o componer efectos

```bash
ve effects show volumetric-rays
ve effects apply split-reveal --out ./mi-web --set 'title=VISUAL ENGINE'
ve compose ./reconstruccion/composition.json --out ./render
```

La biblioteca tiene **58 efectos en 12 categorías**. La composición admite hasta 12 capas,
mezclas, máscaras radiales/lineales, transformaciones, opacidad y curvas
`linear/easeIn/easeOut/easeInOut/spring`.

### 4. Medir

```bash
ve benchmark --out library/benchmarks.json
ve gallery --port 4173          # opcional; el núcleo no depende de la UI
ve capture index.html --serve ./render --frames 6 --json
ve review --reference referencia.mp4 --target-dir ./mi-web --frames 6 --out ./out
ve temporal referencia.mp4 resultado.mp4 --out ./analisis
```

- `benchmark`: FPS, frame time, heap JS y carga; no mide VRAM GPU.
- `gallery`: explorar, previsualizar, cambiar parámetros y componer.
- `review`: fidelidad + calidad por dimensiones; revisa `consoleErrors`.
- `temporal`: dos vídeos alineados; no sustituye a `review` de una página estática.

### 5. Corregir con red

```bash
ve iterate --reference referencia.mp4 --target-dir ./mi-web \
  --replace index.nuevo.html --min-delta 0.5
ve backup list --project ./mi-web
ve backup restore <id> --project ./mi-web
```

`iterate` copia con SHA-256, mide antes/después y revierte si no mejora. `--keep` conserva el
cambio para inspección. Los parches exigen un repositorio git.

## Cómo leer los estados

- `verified`: la señal se midió (halo, nitidez, partículas en movimiento, cortes, luz).
- `estimated`: hay proxy, no certeza (texto sin OCR, objetos, profundidad, parallax, glitch).
- `available:false`: falta herramienta o modelo; devuelve el motivo, no lo rellenes.
- En Reference-to-Effects, `mapping` y `warnings` son parte del contrato. Muéstralos.

## Reglas de calidad

1. **Nada de diseños planos** si piden calidad avanzada: profundidad, jerarquía, foco y detalle.
2. **Una idea visual por pantalla**; quita lo que no suba fidelidad, calidad o legibilidad.
3. **Respeta la referencia** por encima del gusto: paleta, contraste, composición y ritmo.
4. **No añadas efectos** sólo para subir una puntuación; explica las dimensiones bajas.
5. **Rendimiento**: DPR ≤ 2, un canvas, pausa con `document.hidden`, `prefers-reduced-motion`.
6. **Accesibilidad**: contraste, foco visible, texto alternativo y `role="img"` en composiciones.
7. **Licencias**: GSAP Club no; Remotion no es MIT; React Bits CC-BY exige atribución; FFmpeg
   según build; Three.js/Motion/Playwright son permisivas.
8. **Todo local**: Ollama sólo en localhost; no envíes material a servicios externos.

## MCP

**26 herramientas**. Las de 0.3: `visual_compose`, `visual_reference_effects`,
`visual_gallery`, `visual_benchmark`; además de las 0.1/0.2 (`visual_timeline`, `visual_camera`,
`visual_inspect`, `visual_effects_detect`, `visual_spec`, `visual_recommend`, `visual_temporal`,
`visual_vision`, `visual_iterate` con `confirm=true`, `visual_backup`, etc.). Recurso
`visual://effects`, prompt `visual-quality-review`. CLI y `ve serve` ofrecen las mismas
operaciones.

## Límites conocidos

- Sin Tesseract no hay lectura de texto; las regiones son estimadas.
- `llava:7b` describe, no lee copy exacto; `qwen2.5vl:3b` falló en esta instalación.
- Sin modelo de objetos/pose: sólo saliencia; no hay clases ni cajas semánticas.
- Profundidad y parallax son proxies geométricos, no mapas métricos.
- La rotación de cámara no está validada; las transiciones suaves se estiman.
- Las referencias de la verificación 0.3 son renders propios autorizados, no material de cliente.
- Probado en Windows; Linux/macOS están soportados por diseño, no probados aquí.
- El repositorio sigue **sin publicar** en GitHub.
