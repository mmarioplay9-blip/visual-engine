# Visual Engine

Motor universal, local y gratuito para subir la calidad visual de los proyectos que crean
agentes de IA. Mide una referencia real, la descompone en escenas/movimiento/efectos, construye
con intención, captura el resultado en un navegador real y compara ambos con números.

> **Estado: 0.2 — análisis avanzado.** Verificado en Windows con 33 pruebas reales.
> Cada capacidad de la tabla se ejecutó; lo estimado y lo pendiente está separado en
> [docs/CAPABILITIES.md](docs/CAPABILITIES.md). El detalle de la última verificación está en
> [docs/VERIFICACION-0.2.md](docs/VERIFICACION-0.2.md).

## Qué hace de verdad

| Capacidad | Herramienta real | Estado |
| --- | --- | --- |
| Línea temporal: escenas, cortes, fotogramas clave, storyboard | FFmpeg + barrido RGB propio | Verificado |
| Movimiento de cámara: paneo, zoom, velocidad, aceleración, temblor | Correlación normalizada | Verificado (rotación estimada) |
| Composición: tercios, equilibrio, simetría, horizonte, líneas | JS propio | Verificado |
| Formas: círculos y líneas | Hough/proyección | Verificado |
| Texto y objetos | Componentes de luminancia / saliencia | **Estimado** (sin OCR/modelo) |
| Profundidad | Proxy de nitidez + gradiente | **Estimado** |
| Efectos: glow, bloom, partículas, blur, parallax, glitch, luz, reflejos, distorsión, grano | Señales de imagen con evidencia | Señal verificada; etiqueta interpretada |
| Especificación visual JSON+MD para reproducir | `ve spec` | Verificado |
| Tecnología y código por efecto | CSS/JS/GLSL; JS con `node --check` | Verificado |
| Comparación temporal + calidad multidimensional | Curvas, cortes, deriva, 6 dimensiones | Verificado |
| Iteración con respaldo, medición y reversión | Copia SHA-256 + `git apply` | Verificado |
| Visión local opcional | Ollama / Tesseract | Integración verificada; sin modelo instalado |
| MCP, CLI y API local | 23 herramientas MCP, 24 comandos, 27 rutas | Verificado |

## Requisitos

- **Node.js 20+** (probado con 26.13.1)
- **FFmpeg + FFprobe en PATH** (probado con 9.1)
- **Git** para instalar, actualizar y para `iterate --patch`
- Navegador de Playwright: `npx playwright install chromium` (~130 MB)

Opcional: Ollama con un modelo de visión (`llava`, `moondream`, `qwen2.5vl`) y/o Tesseract.
Sin ellos, el resto funciona igual y el motor declara la ausencia. No hay cuentas ni APIs de pago.

## Instalación

El repositorio aún **no está publicado** en GitHub; los instaladores aceptan la URL del remoto.

```bash
git clone <url-del-repositorio> visual-engine
cd visual-engine
npm install
npm run build
npm link
npx playwright install chromium
ve doctor
```

```powershell
powershell -ExecutionPolicy Bypass -File install\install.ps1 -Repo <url> -Ref main
# Linux/macOS: VE_REPO=<url> ./install/install.sh
ve update
```

## Uso en dos minutos

```bash
ve doctor
ve analyze referencia.mp4 --samples 12            # paleta, luz, movimiento, cortes
ve timeline referencia.mp4 --out ./analisis --storyboard
ve motion referencia.mp4 --json                    # paneo, zoom, aceleración
ve inspect referencia.mp4                          # composición, formas, texto, profundidad
ve detect referencia.mp4                           # efectos con evidencia y estado
ve spec referencia.mp4 --out ./analisis            # spec.json + spec.md
ve recommend --spec ./analisis/spec.json --out ./codigo
ve temporal referencia.mp4 resultado.mp4 --out ./analisis
```

Ciclo de construcción y mejora:

```bash
ve effects apply aurora-hero --out ./mi-web
ve review --reference referencia.mp4 --target-dir ./mi-web --target index.html \
  --width 540 --height 960 --frames 6 --out ./out/revision
# el agente escribe el cambio; el motor lo aplica, mide y revierte si empeora
ve iterate --reference referencia.mp4 --target-dir ./mi-web --replace index.nuevo.html
ve backup list --project ./mi-web
```

`ve review` escribe `report.md` (fidelidad y calidad por dimensiones), `review.json`, capturas,
`diff/heatmap.png` y el fotograma de referencia. `ve iterate` escribe `iteration.json`,
`iteration.md` y la copia de seguridad, y sólo conserva el cambio si la puntuación mejora
(`--min-delta`, por defecto 0,5); `--keep` lo conserva aunque no mejore y `ve backup restore`
vuelve atrás.

## Integración con agentes

### MCP (stdio)

```bash
ve mcp
```

Herramientas (23): las 13 de 0.1 (`visual_doctor`, `visual_analyze`, `visual_extract_frames`,
`visual_capture`, `visual_compare`, `visual_review`, `visual_effects_list`, `visual_effect_get`,
`visual_effect_apply`, `visual_adapters`, `visual_scaffold`, `visual_deps_plan`,
`visual_install_deps`) y 10 nuevas: `visual_timeline`, `visual_camera`, `visual_inspect`,
`visual_effects_detect`, `visual_spec`, `visual_recommend`, `visual_temporal`, `visual_vision`,
`visual_iterate`, `visual_backup`. Recurso `visual://effects` y prompt `visual-quality-review`.

### CLI + API local

```bash
ve serve                      # http://127.0.0.1:4747
ve serve --allow-install      # habilita POST /v1/deps/install
```

Rutas nuevas: `POST /v1/timeline`, `/v1/camera`, `/v1/inspect`, `/v1/effects/detect`,
`/v1/spec`, `/v1/recommend`, `/v1/temporal`, `/v1/vision`, `/v1/iterate`,
`/v1/backups/restore`; `GET /v1/recommend`, `/v1/vision/status`, `/v1/backups`. Escucha sólo en
loopback; `iterate` exige `confirm=true`.

### Skills e instrucciones

`ve init` copia instrucciones y skills al proyecto: `AGENTS.md` (Codex/OpenCode/Freebuff),
`CLAUDE.md`, `GEMINI.md`, `.cursor/rules/visual-engine.mdc`, `.agents/skills/visual-engine/…`,
`.visual-engine/config.json` y configuración MCP para Claude/Cursor/Gemini/OpenCode/Codex.

El texto canónico está en [skills/visual-engine/SKILL.md](skills/visual-engine/SKILL.md).

## Demostración medida

Referencia propia de 540×960, 3 s, 30 fps y dos cortes. La landing pasó por línea base,
primera versión y corrección: **68,0 → 74,3 → 81,3/100** (81,2–82,1 en ejecuciones repetidas).
Con el evaluador 0.2, la versión final obtiene **calidad global 66,5/100 (C)**: fidelidad 81,3,
composición 52,1, jerarquía 58,1,
animación 45,4, fluidez 84,9, rendimiento 72,8. La diferencia entre ambas cifras es intencionada:
antes sólo se medía color/luz; ahora también composición y animación.

Referencias 0.2 (`demo/reference/0.2/`): UI premium, motion graphics con dos cortes, 3D con
parallax/bokeh, paneo y zoom. Resultados medidos:

```text
cortes 0,87 y 1,60 s · 3 escenas · 8 fotogramas clave
paneo +3,1 % del ancho/paso (10/11 pares verificados) · zoom 1,031
texto localizado · anillo r=30 · 3 capas de profundidad estimadas
motion: glow, partículas, parallax, iluminación, reflejos, distorsión
temporal UI vs alt: 88,3/100 (A), calidad 98,2
iteración: 80,6 → 90,5 conservada; 80,6 → 36,0 revertida
```

## Arquitectura

```
src/core   análisis, media, cámara, timeline, inspección, efectos, spec,
           recomendaciones, visión local, calidad, temporal, iteración
src/mcp    servidor MCP (stdio, 23 herramientas)
src/api    API HTTP local (27 rutas)
src/cli    comandos `ve` (24)
library/   6 recetas con plantillas reales
demo/      referencias 0.1 y 0.2 + landing base/final
tests/     33 pruebas (núcleo, avanzadas, CLI, API, MCP, E2E)
```

Detalle y decisiones: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Pruebas

```bash
npm test
```

33 pruebas en ~74 s: análisis y cortes, comparación, mapa de calor, CLI, biblioteca, scaffolds,
`ve init`, API, MCP real, timeline/storyboard, cámara, inspección, efectos en motion/UI/3D,
spec, snippets JS válidos, temporal, iteración con reversión y restauración, visión, y el E2E
que exige que la versión final supere a la línea base.

## Licencias

Código propio: MIT. Three.js MIT, Motion MIT, Playwright Apache-2.0, GSAP estándar (sin plugins
de Club), Remotion License (no MIT), FFmpeg según build, React Bits MIT/CC-BY. Visual Engine no
incluye componentes de terceros copiados. Tesseract y Ollama son opcionales y no se redistribuyen.

## Qué falta

OCR real y visión local (faltan Tesseract y un modelo), detección semántica de objetos/pose,
rotación de cámara verificada, transiciones suaves verificadas, profundidad métrica, pruebas en
Linux/macOS y publicación en GitHub. Lista honesta: [docs/CAPABILITIES.md](docs/CAPABILITIES.md).
