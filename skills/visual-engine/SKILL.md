---
name: visual-engine
description: Motor local y gratuito de calidad visual. Analiza imágenes y vídeos de referencia, genera efectos profesionales, captura el proyecto en Chromium, compara el resultado con la referencia y devuelve diferencias medidas con correcciones priorizadas. Úsala para diseño, animación, 3D, HUD, vídeo o cualquier petición de "que se vea profesional".
---

# Visual Engine

Convierte una petición visual en un ciclo medido: **referencia → medición → construcción →
captura → comparación → corrección**. Todo en local, sin APIs de pago y sin depender del modelo.

## Antes de empezar

```bash
ve doctor          # herramientas reales: ffmpeg, Playwright + navegadores, GSAP, Three.js, Motion, Remotion
ve adapters        # licencias y límites gratuitos de cada herramienta
```

Si falta ffmpeg o los navegadores de Playwright, pide instalarlos y **no simules** capturas.
Node ≥ 20, ffmpeg en PATH y `npx playwright install chromium` cubren todo el flujo.

## Ciclo de trabajo

### 1. Medir la referencia

```bash
ve analyze referencia.mp4 --samples 12 --json
```

Devuelve: paleta dominante con porcentajes, luminancia, contraste, saturación, colorido,
densidad de bordes, curva de movimiento, cortes reales (detector de escenas de FFmpeg) y ritmo.
Esos números son el objetivo. No los sustituyas por impresiones.

Para estudiar movimiento o transiciones:

```bash
ve frames referencia.mp4 --count 24 --width 720 --out ./frames
```

### 2. Elegir base

```bash
ve effects list
ve effects show aurora-hero
ve effects apply aurora-hero --out ./mi-web --set accent=#12e0c8 --set title="..."
```

Efectos incluidos (autocontenidos, sin dependencias salvo `particle-nebula`):

| id | categoría | para qué |
| --- | --- | --- |
| `aurora-hero` | hero | fondo aurora con grano y entrada tipográfica |
| `kinetic-title` | tipografía | titular editorial con revelado y ticker |
| `glass-hud` | interfaz | telemetría con anillos SVG y radar |
| `particle-nebula` | 3D | partículas Three.js con shader (requiere `three`) |
| `noise-warp` | transición | corte por franjas con ruido |
| `sweep-banner` | hero | banner de cristal con barrido de luz |

Adaptadores para integrar librerías reales:

```bash
ve adapters scaffold three --out ./mi-web/visual/three
ve adapters scaffold gsap  --out ./mi-web/visual/gsap
```

### 3. Construir sin genéricos

- Fondo con profundidad (degradado + foco), no un color plano.
- Jerarquía tipográfica clara: un titular grande, apoyo legible, etiquetas pequeñas en versalitas.
- Un único foco de luz y micro-detalle (grano, retícula, líneas guía, partículas finas).
- Movimiento con motivo: entrada escalonada, barrido de luz, parallax leve. Nada que distraiga.
- Reutiliza los colores medidos; no inventes una paleta nueva.

### 4. Capturar

```bash
ve capture index.html --serve ./mi-web --width 540 --height 960 --frames 6 --json
```

`frames >= 6` mide animación. Revisa `consoleErrors` y `errors`: si hay errores, arréglalos
antes de valorar el diseño. Usa `ve capture --full` para páginas largas.

### 5. Comparar e iterar

```bash
ve review --reference referencia.mp4 --target-dir ./mi-web --target index.html \
  --width 540 --height 960 --frames 6 --out ./out/revision
```

Salida: puntuación 0-100, tabla de diferencias por métrica, ΔE de paleta, SSIM/MAE del primer
fotograma, mapa de calor PNG y **correcciones priorizadas**. Aplica una o dos, vuelve a medir y
compara la puntuación. Si no sube, revierte: el objetivo es fidelidad, no acumular efectos.

Umbral razonable: **≥ 80** para una referencia clara; por debajo de 60 el resultado no se parece.

## MCP

Herramientas: `visual_doctor`, `visual_analyze`, `visual_extract_frames`, `visual_capture`,
`visual_compare`, `visual_review`, `visual_effects_list`, `visual_effect_get`,
`visual_effect_apply`, `visual_adapters`, `visual_scaffold`, `visual_deps_plan`,
`visual_install_deps`. Recurso: `visual://effects`. Prompt: `visual-quality-review`.

API equivalente: `ve serve` → `POST /v1/review`, `/v1/analyze`, `/v1/capture`, `/v1/compare`.

## Reglas duras

1. **No afirmes sin medir.** "Se ve bien" no es un resultado; una puntuación y una captura sí.
2. **Nada de diseños planos** cuando se pide calidad avanzada.
3. **Sin efectos porque sí.** Si un efecto no mejora fidelidad o legibilidad, fuera.
4. **Rendimiento:** un canvas, DPR ≤ 2, pausa con `document.hidden`, `prefers-reduced-motion`.
5. **Accesibilidad:** contraste suficiente, foco visible, texto alternativo.
6. **Licencias:** GSAP Club no; Remotion no es MIT; React Bits CC-BY exige atribución;
   FFmpeg según build. No instales nada de pago.
7. **Todo local:** sin CDNs, sin telemetría, sin enviar material del usuario a servicios externos.
8. **Distingue** implementado / medido / pendiente en tu informe final.

## Límites conocidos

- La comparación mide color, luz, contraste, detalle y movimiento; **no** entiende semántica,
  tipografía concreta ni composición fina. El mapa de calor ayuda, pero la última mirada es humana.
- Referencia y resultado deben compartir relación de aspecto para que la comparación sea justa.
- No hay detección de objetos, pose ni OCR.
- Probado en Windows; Linux/macOS están soportados por diseño pero sin pruebas en esta máquina.
