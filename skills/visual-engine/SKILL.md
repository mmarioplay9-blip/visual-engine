---
name: visual-engine
description: Motor local y gratuito de calidad visual. Descompone referencias en escenas, movimiento de cámara, composición, formas, efectos y especificación reproducible; captura el proyecto en Chromium, compara por tiempo y por dimensiones, y permite iterar con reversión. Úsala para diseño, animación, 3D, HUD, vídeo o cualquier petición de "que se vea profesional".
---

# Visual Engine 0.2

Convierte una referencia profesional en una **especificación medida** y verifica el resultado:
**referencia → escenas/cámara/efectos → spec → construcción → captura → comparación temporal →
corrección con reversión**. Todo local, sin APIs de pago.

## Antes de empezar

```bash
ve doctor
ve vision status
ve adapters
```

`doctor` comprueba ffmpeg, Playwright y librerías. `vision status` dice si hay Tesseract y si
Ollama tiene un modelo de visión. **Si faltan, no inventes OCR ni descripciones**: el motor
devolverá `available:false` y el motivo.

## Ciclo de trabajo

### 1. Descomponer la referencia

```bash
ve timeline referencia.mp4 --out ./analisis --storyboard
ve motion referencia.mp4 --json
ve inspect referencia.mp4
ve detect referencia.mp4
```

- **timeline**: escenas reales, cortes, ritmo, fotogramas clave y storyboard.
- **motion**: desplazamiento, zoom, rotación, velocidad, aceleración, temblor y transiciones.
  Mira `status`: `verified` es correlación alta; `estimated` es un par dudoso.
- **inspect**: composición (tercios, equilibrio, simetría, horizonte), círculos/líneas, regiones
  de texto, saliencia y profundidad proxy. El texto y la profundidad son **estimados**.
- **detect**: efectos con confianza y evidencia. La señal es medida; la etiqueta es una
  interpretación. Glow, partículas, blur, luz y grano suelen ser verificables; parallax,
  glitch, reflejos y distorsión son estimaciones.

### 2. Generar la especificación y el código

```bash
ve spec referencia.mp4 --out ./analisis
ve recommend --spec ./analisis/spec.json --out ./codigo
```

`spec.md` contiene escenas, paleta con roles, composición, jerarquía tipográfica estimada, capas,
cámara, efectos con parámetros, stack, pasos de implementación y plan de verificación. Los
snippets JS se validan con `node --check`; CSS/GLSL no se compilan.

### 3. Construir sin genéricos

- Fondo con profundidad y un foco de luz; no un color plano.
- Jerarquía real: titular, apoyo y etiquetas; alturas basadas en la referencia.
- Un solo motivo de movimiento; parallax sólo si la referencia lo tiene.
- Micro-detalle (grano, retícula, partículas finas) medido, no decorativo.
- Respeta la paleta y el contraste medidos; la creatividad va en la ejecución.

### 4. Capturar y comparar

```bash
ve capture index.html --serve ./mi-web --width 540 --height 960 --frames 6 --json
ve review --reference referencia.mp4 --target-dir ./mi-web --target index.html \
  --width 540 --height 960 --frames 6 --out ./out/revision
ve temporal referencia.mp4 resultado.mp4
```

`review` da fidelidad (color/luz/estructura) **y** calidad por dimensiones: composición,
jerarquía, animación, fluidez y rendimiento (si hay tiempos de captura). No aceptes una sola
cifra: mira qué dimensión falla.

### 5. Corregir con red de seguridad

```bash
# El agente prepara el cambio (archivo nuevo o parche git)
ve iterate --reference referencia.mp4 --target-dir ./mi-web \
  --replace index.nuevo.html --min-delta 0.5
ve backup list --project ./mi-web
ve backup restore <id> --project ./mi-web
```

`iterate` copia el archivo con SHA-256, revisa antes, aplica, revisa después y **revierte solo**
si no mejora. `--keep` conserva el cambio para inspección. El parche usa `git apply --check` y
exige un repositorio git.

## MCP

23 herramientas. Las nuevas: `visual_timeline`, `visual_camera`, `visual_inspect`,
`visual_effects_detect`, `visual_spec`, `visual_recommend`, `visual_temporal`, `visual_vision`,
`visual_iterate` (requiere `confirm=true`) y `visual_backup`. Recurso `visual://effects`, prompt
`visual-quality-review`. La CLI y `ve serve` ofrecen lo mismo.

## Reglas duras

1. **Distingue** `verified`, `estimated` y `available:false` en tu informe.
2. **No afirmes** que hay objetos, OCR o profundidad métrica si el motor sólo da regiones,
   texto localizado o un proxy.
3. **No añadas efectos** que no suban fidelidad, calidad o legibilidad.
4. **Rendimiento**: DPR ≤ 2, un canvas, pausa con `document.hidden`, `prefers-reduced-motion`.
5. **Accesibilidad**: contraste, foco visible, texto alternativo.
6. **Licencias**: GSAP Club no; Remotion no es MIT; React Bits CC-BY exige atribución; FFmpeg
   según build. Nada de pago.
7. **Todo local**: Ollama sólo en localhost; sin enviar material a servicios externos.
8. **Si una dimensión no aplica**, dilo; no la rellenes con una suposición.

## Límites conocidos

- Sin Tesseract no hay lectura de texto; las regiones son estimadas.
- Sin modelo de visión no hay etiquetas de objetos; sólo saliencia.
- La profundidad y el parallax son proxies geométricos.
- La rotación de cámara no está validada con una referencia propia.
- Las transiciones suaves (fundido/barrido) se estiman; los cortes duros se verifican.
- La comparación temporal exige dos vídeos; una secuencia de capturas se compara en `review`.
- Probado en Windows; Linux/macOS están soportados por diseño, no probados aquí.
