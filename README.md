# Visual Engine

Motor universal, local y gratuito para subir la calidad visual de los proyectos que crean
agentes de IA. Mide una referencia real, la descompone en escenas/movimiento/efectos, construye
con intención, captura el resultado en un navegador real y compara ambos con números.

> **Estado: 0.5 — Visual Intelligence Loop.** Verificado en Windows con 54 pruebas reales.
> Cada capacidad de la tabla se ejecutó; lo estimado y lo pendiente está separado en
> [docs/CAPABILITIES.md](docs/CAPABILITIES.md). El detalle de la última verificación está en
> [docs/VERIFICACION-0.5.md](docs/VERIFICACION-0.5.md).

La fase 0.5 añade **Visual Critic**, **Visual Debugger**, **Reference Fidelity Engine**,
**Smart Effects Selection**, **Quality Gates**, **contexto selectivo con caché** y un
**Autonomous Improvement Loop** con copia, límites y reversión. Conserva los 58 efectos, los 15
estilos, las 20 composiciones, la composición 0.3 y las 45 pruebas anteriores.

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
| Visual Critic | `ve critic`: evidencia, ubicación, gravedad, confianza y corrección | **Verificado** con DOM real |
| Visual Debugger | `ve debug`: selectores, CSS, capas, frames y fuente verificada | **Verificado** en Chromium |
| Reference Fidelity | `ve fidelity`: dimensiones estructurales separadas de píxeles | **Verificado/estimado declarado** |
| Smart Effects | `ve effects select`: contexto, estilo, presupuesto y contención | **Verificado**; minimalismo 0–1 |
| Quality Gates | `ve gate`: umbrales, defectos críticos y aprobación humana | **Verificado**; un crítico bloquea |
| Improvement Loop | `ve loop`: copia, cambio del agente, recaptura y reversión | **Verificado** con restauración |
| Contexto selectivo | `ve context`: herramientas/recetas acotadas y caché | **Verificado**; no carga los 58 |
| MCP, CLI y API local | **38 herramientas MCP**, CLI ampliada y API local | Verificado |

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
ve debug ./mi-web --serve ./mi-web --source ./mi-web
ve critic --reference ref.png --target-dir ./mi-web --brief "landing premium"
ve fidelity --reference ref.png --target-dir ./mi-web --spec ./analisis/spec.json
ve gate --from ./inteligencia/intelligence.json --require-human
ve context "landing cinematográfica" --max-recipes 3
ve effects select "dashboard financiero" --style financial-dashboard
```

Ciclo de construcción y mejora:

```bash
ve effects apply aurora-hero --out ./mi-web
ve review --reference referencia.mp4 --target-dir ./mi-web --target index.html \
  --width 540 --height 960 --frames 6 --out ./out/revision
# el agente escribe el cambio; el motor lo aplica, mide y revierte si empeora
ve iterate --reference referencia.mp4 --target-dir ./mi-web --replace index.nuevo.html
ve loop --reference referencia.mp4 --target-dir ./mi-web --brief "mejorar jerarquía" \
  --replace index.nuevo.html --confirm
ve loops list --project ./mi-web
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

Herramientas (**38**): las 13 de 0.1, las 10 de 0.2, las 3 de 0.3 (`visual_compose`,
`visual_reference_effects`, `visual_benchmark`), las 4 de 0.4: `visual_art_direction`,
`visual_reference_design`, `visual_motion_director`, `visual_showcase`, y las 8 de 0.5:
`visual_context`, `visual_debug`, `visual_critic`, `visual_fidelity`, `visual_gate`,
`visual_smart_effects`, `visual_loop`, `visual_loops`. Recurso `visual://effects` y prompt
`visual-quality-review`. El loop exige `confirm=true` si escribe.

### CLI + API local

```bash
ve serve                      # http://127.0.0.1:4747
ve serve --allow-install      # habilita POST /v1/deps/install
```

Rutas: `POST /v1/timeline`, `/v1/camera`, `/v1/inspect`, `/v1/effects/detect`, `/v1/spec`,
`/v1/recommend`, `/v1/temporal`, `/v1/vision`, `/v1/iterate`, `/v1/compose`,
`/v1/reference-effects`, `/v1/benchmark`, `/v1/art-direction`, `/v1/reference-design`,
`/v1/motion-director`, `/v1/showcase`, `/v1/intelligence`, `/v1/debug`, `/v1/critic`,
`/v1/fidelity`, `/v1/gates`, `/v1/context`, `/v1/smart-effects`, `/v1/loop`,
`/v1/loops/restore`; `GET /v1/loops`, `/v1/recommend`, `/v1/vision/status`,
`/v1/backups`, `/v1/benchmarks`. Escucha sólo en loopback; `iterate` y `loop` exigen
`confirm=true` cuando escriben.

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
src/mcp    servidor MCP (stdio, 38 herramientas)
src/api    API HTTP local (incluye 0.5)
src/cli    comandos `ve` (39)
library/   58 recetas, 20 composiciones, fuentes OFL y benchmarks.json
demo/      referencias 0.1/0.2 + integraciones reales + landing base/final
tests/     54 pruebas (núcleo, avanzadas, 0.3, 0.4, 0.5, CLI, API, MCP, E2E)
```

Detalle y decisiones: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Pruebas

```bash
npm test
```

54 pruebas en ~3 min: análisis y cortes, comparación, mapa de calor, CLI, biblioteca de 58
efectos, composición, Reference-to-Effects, galería, OCR, scaffolds, `ve init`, API, MCP real,
timeline/storyboard, cámara, inspección, efectos en motion/UI/3D, spec, snippets JS válidos,
temporal, iteración con reversión y restauración, visión, los 15 estilos, Motion Director,
Reference-to-Design, 20 composiciones, Visual Critic, gates, selección contextual, debugger,
fidelidad, caché, loop con copia/restauración y el E2E que exige que la versión final supere a la base.

## Licencias

Código propio: MIT. Three.js MIT, Motion MIT, Playwright Apache-2.0, GSAP estándar (sin plugins
de Club), Remotion License (no MIT), FFmpeg según build, React Bits MIT/CC-BY. Visual Engine no
incluye componentes de terceros copiados. Tesseract y Ollama son opcionales y no se redistribuyen.

## Qué falta

Detección semántica de objetos/pose, profundidad métrica, revisión artística humana de las 20
composiciones, pruebas en Linux/macOS y publicación en GitHub. La rotación ya se mide en una
escena Three.js real (1,5° esperados, 1,41° medidos, error 0,09°) y el A/B incluye vídeo de tres
planos y gates; la comparación temporal del montaje derivado dio 56,9/100 y se publica. El A/B
no demuestra superioridad contra una pieza externa de motion graphics. Lista honesta:
[docs/CAPABILITIES.md](docs/CAPABILITIES.md).
