# Visual Engine

Motor universal, local y gratuito para subir la calidad visual de los proyectos que crean
agentes de IA. Mide una referencia real, la descompone en escenas/movimiento/efectos, construye
con intención, captura el resultado en un navegador real y compara ambos con números.

> **Estado: 0.4 — Art Director y diseño verificable.** Verificado en Windows con 45 pruebas reales.
> Cada capacidad de la tabla se ejecutó; lo estimado y lo pendiente está separado en
> [docs/CAPABILITIES.md](docs/CAPABILITIES.md). El detalle de la última verificación está en
> [docs/VERIFICACION-0.4.md](docs/VERIFICACION-0.4.md).

La fase 0.4 añade **15 estilos de dirección artística**, tokens DTCG, Reference-to-Design,
Motion Director, **20 composiciones completas** y una comparación A/B con referencia CC0. Conserva
los 58 efectos, la composición 0.3, las 39 pruebas anteriores y el funcionamiento local/gratuito.

## Qué hace de verdad

| Capacidad | Herramienta real | Estado |
| --- | --- | --- |
| Línea temporal: escenas, cortes, fotogramas clave, storyboard | FFmpeg + barrido RGB propio | Verificado |
| Movimiento de cámara: paneo, zoom, velocidad, aceleración, temblor | Correlación normalizada | Verificado (rotación estimada) |
| Composición: tercios, equilibrio, simetría, horizonte, líneas | JS propio | Verificado |
| Formas: círculos y líneas | Hough/proyección | Verificado |
| Texto | Tesseract 5.4 | **Verificado**: `VISUAL ENGINE`, confianza 96,4 % en texto nítido; 81,1 % en el render |
| Objetos | Componentes de luminancia / saliencia | **Estimado** (sin modelo de objetos) |
| Profundidad | Proxy de nitidez + gradiente | **Estimado** |
| Efectos: glow, bloom, partículas, blur, parallax, glitch, luz, reflejos, distorsión, grano | Señales de imagen con evidencia | Señal verificada; etiqueta interpretada |
| Especificación visual JSON+MD para reproducir | `ve spec` | Verificado |
| Biblioteca de efectos | 58 recetas Canvas/WebGL/CSS, 12 categorías | **Verificado**: 58/58 benchmark; 57 sin error en el primer barrido y 58 tras corregir `circuit-lines` |
| Composición por capas | `ve compose`: máscaras, mezclas, tracks, JSON | **Verificado**: 3 capas, captura real |
| Reference-to-Effects | `ve refeffects`: spec → composición y código | **Verificado** con render Remotion real; asignaciones marcadas como hipótesis |
| Galería local opcional | `ve gallery`: 58 efectos, preview, composición | **Verificado** en Chromium; el núcleo sigue funcionando sin UI |
| Visión local opcional | Ollama `llava:7b` + Tesseract | **Verificado** con descripción semántica real; `qwen2.5vl:3b` falló en esta instalación |
| Comparación temporal + calidad multidimensional | Curvas, cortes, deriva, 13 dimensiones | Verificado |
| Iteración con respaldo, medición y reversión | Copia SHA-256 + `git apply` | Verificado |
| Dirección artística | `ve art`: 15 estilos, tokens DTCG, tipografía, materiales y CSS | **Verificado** 15/15 estilos con contraste |
| Reference-to-Design | `ve refdesign`: identidad, layout, componentes, motion y código | **Verificado** con cartel CC0; mide y declara estimaciones |
| Motion Director | `ve motiondirector`: recetas, cámara, reduced-motion | **Verificado**: transición monotónica y rotación 2°→1,5° |
| 20 composiciones | `ve showcase --measure`: 10 arquetipos, 15 estilos | **Verificado** 20/20, 61 FPS medianos, 0 contraste bajo |
| MCP, CLI y API local | 30 herramientas MCP, 32 comandos, API local | Verificado |

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
ve art "terminal financiera sobria" --style financial-dashboard --out ./sistema
ve refdesign referencia.png --out ./sistema --vision
ve showcase --measure --out ./showcase
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

Herramientas (30): las 13 de 0.1, las 10 de 0.2, las 3 de 0.3 (`visual_compose`,
`visual_reference_effects`, `visual_benchmark`) y las 4 de 0.4: `visual_art_direction`,
`visual_reference_design`, `visual_motion_director`, `visual_showcase`. Recurso
`visual://effects` y prompt `visual-quality-review`.

### CLI + API local

```bash
ve serve                      # http://127.0.0.1:4747
ve serve --allow-install      # habilita POST /v1/deps/install
```

Rutas: `POST /v1/timeline`, `/v1/camera`, `/v1/inspect`, `/v1/effects/detect`, `/v1/spec`,
`/v1/recommend`, `/v1/temporal`, `/v1/vision`, `/v1/iterate`, `/v1/compose`,
`/v1/reference-effects`, `/v1/benchmark`, `/v1/art-direction`, `/v1/reference-design`,
`/v1/motion-director`, `/v1/showcase`; `GET /v1/recommend`, `/v1/vision/status`,
`/v1/backups`, `/v1/benchmarks`. Escucha sólo en loopback; `iterate` exige `confirm=true`.

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

## Efectos, composición y galería (0.3)

```bash
ve effects list --json                          # 58 efectos, 12 categorías
ve effects show volumetric-rays                 # parámetros y compatibilidad
ve benchmark --out library/benchmarks.json      # FPS, frame time, heap y carga
ve refeffects referencia.mp4 --spec ./analisis/spec.json --out ./reconstruccion
ve compose ./reconstruccion/composition.json --out ./render
ve gallery --port 4173                          # opcional, no requiere abrirla para usar el motor
```

`ve refeffects` traduce señales medidas a capas, timeline y código; **no afirma** que el efecto
identificado sea exactamente el de la referencia. Cada asignación lleva estado, confianza y nota.
La composición 0.3 acepta capas, mezclas, máscaras y curvas y se renderiza como HTML autónomo.

## Arquitectura

```
src/core   análisis, media, cámara, timeline, inspección, efectos, spec,
           composición, refeffects, galería, benchmark, visión, calidad,
           temporal, iteración
src/mcp    servidor MCP (stdio, 30 herramientas)
src/api    API HTTP local (incluye 0.4)
src/cli    comandos `ve` (32)
library/   58 recetas, 20 composiciones, fuentes OFL y benchmarks.json
demo/      referencias 0.1/0.2 + integraciones reales + landing base/final
tests/     45 pruebas (núcleo, avanzadas, 0.3, 0.4, CLI, API, MCP, E2E)
```

Detalle y decisiones: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Pruebas

```bash
npm test
```

45 pruebas en ~2 min: análisis y cortes, comparación, mapa de calor, CLI, biblioteca de 58
efectos, composición, Reference-to-Effects, galería, OCR, scaffolds, `ve init`, API, MCP real,
timeline/storyboard, cámara, inspección, efectos en motion/UI/3D, spec, snippets JS válidos,
temporal, iteración con reversión y restauración, visión, los 15 estilos, Motion Director,
Reference-to-Design, 20 composiciones y el E2E que exige que la versión final supere a la base.

## Licencias

Código propio: MIT. Three.js MIT, Motion MIT, Playwright Apache-2.0, GSAP estándar (sin plugins
de Club), Remotion License (no MIT), FFmpeg según build, React Bits MIT/CC-BY. Visual Engine no
incluye componentes de terceros copiados. Tesseract y Ollama son opcionales y no se redistribuyen.

## Qué falta

Detección semántica de objetos/pose, transiciones comparadas contra un vídeo de referencia,
profundidad métrica, pruebas en Linux/macOS y publicación en GitHub. La rotación ya se valida
sobre patrón sintético y las transiciones CSS tienen curva y reduced-motion verificados; el A/B
de transiciones con vídeo queda pendiente. Lista honesta:
[docs/CAPABILITIES.md](docs/CAPABILITIES.md).
