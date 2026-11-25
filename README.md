# Visual Engine

Motor universal, local y gratuito para subir la calidad visual de los proyectos que crean
agentes de IA. Mide una referencia real, construye con intención, captura el resultado en un
navegador real y compara ambos con números.

> **Estado: 0.1 — Fase 1.** Arquitectura funcional verificada en Windows con pruebas reales.
> No es una promesa: cada capacidad de la tabla se ejecutó en esta máquina. Lo pendiente está
> separado y marcado en [docs/CAPABILITIES.md](docs/CAPABILITIES.md).

## Qué hace de verdad

| Capacidad | Herramienta real | Estado |
| --- | --- | --- |
| Analizar imágenes y vídeos de referencia | FFprobe + FFmpeg (RGB crudo) | Verificado |
| Extraer fotogramas para estudiar movimiento | FFmpeg | Verificado |
| Medir paleta, luz, contraste, saturación, detalle | Analizador propio | Verificado |
| Detectar cortes y ritmo | Detector de escenas de FFmpeg | Verificado (2 cortes en la demo) |
| Ejecutar el proyecto y capturar varios estados | Playwright + Chromium | Verificado |
| Comparar referencia y resultado | SSIM, MAE, ΔE, perfiles | Verificado |
| Mapa de calor de diferencias | FFmpeg + cálculo propio | Verificado (PNG real) |
| Biblioteca de efectos reutilizables | 6 recetas autocontenidas | Verificado |
| Adaptadores GSAP/Three/Motion/Remotion/React Bits/Playwright/FFmpeg | Scaffolds reales | Verificado (sintaxis) |
| Detección de dependencias y plan de instalación | Comprobaciones ejecutadas | Verificado |
| MCP, CLI y API local | SDK MCP 1.32, HTTP | Verificado (cliente MCP real) |
| Instaladores Windows/Linux/macOS | PowerShell y Bash | Ver [VERIFICACION](docs/VERIFICACION.md) |

## Requisitos

- **Node.js 20+** (probado con 26.13.1)
- **FFmpeg + FFprobe en PATH** (probado con 9.1)
- **Git** para instalar y actualizar
- Navegador de Playwright: `npx playwright install chromium` (~130 MB)

Opcional: Python no es necesario. No hay cuentas, claves ni APIs de pago.

## Instalación

El repositorio aún **no está publicado** en GitHub; los instaladores aceptan la URL del remoto
como parámetro. Mientras tanto:

```bash
git clone <url-del-repositorio> visual-engine
cd visual-engine
npm install
npm run build
npm link            # deja el comando `ve` disponible
npx playwright install chromium
ve doctor
```

Instaladores automáticos (clonan o actualizan, instalan, compilan y verifican):

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File install\install.ps1 -Repo <url> -Ref main

# Linux / macOS
VE_REPO=<url> ./install/install.sh
```

Actualizar después desde el propio repositorio:

```bash
ve update      # git pull --ff-only + npm install + npm run build
```

## Uso en un minuto

```bash
ve doctor                                   # qué hay instalado, de verdad
ve analyze referencia.mp4 --samples 12      # paleta, luz, movimiento, cortes
ve effects list                             # biblioteca de efectos
ve effects apply aurora-hero --out ./mi-web # base con intención, sin dependencias
ve capture index.html --serve ./mi-web --width 540 --height 960 --frames 6
ve review --reference referencia.mp4 --target-dir ./mi-web --target index.html \
  --width 540 --height 960 --frames 6 --out ./out/revision
```

`ve review` escribe:

- `report.md` — informe legible con tabla de diferencias y correcciones priorizadas
- `review.json` — datos completos (perfiles, métricas, artefactos)
- `captures/` — las capturas reales del proyecto
- `diff/heatmap.png` — mapa de calor de diferencias
- `reference-frame.png` — fotograma de referencia normalizado

Después de corregir, repite la revisión y compara la puntuación. Si no sube, revierte.

## Integración con agentes

### MCP (stdio)

```bash
ve mcp
```

Configuración que genera `ve init --clients ...` (Claude Code `.mcp.json`, Cursor
`.cursor/mcp.json`, Gemini `.gemini/settings.json`, OpenCode `opencode.json`; Codex recibe un
bloque TOML para `~/.codex/config.toml`).

Herramientas expuestas: `visual_doctor`, `visual_analyze`, `visual_extract_frames`,
`visual_capture`, `visual_compare`, `visual_review`, `visual_effects_list`,
`visual_effect_get`, `visual_effect_apply`, `visual_adapters`, `visual_scaffold`,
`visual_deps_plan`, `visual_install_deps`. Recurso `visual://effects` y prompt
`visual-quality-review`.

### CLI + API local

```bash
ve serve                      # http://127.0.0.1:4747
ve serve --allow-install      # habilita POST /v1/deps/install; bloqueado por defecto
```

Endpoints: `/v1/health`, `/v1/capabilities`, `/v1/doctor`, `/v1/analyze`, `/v1/frames`,
`/v1/capture`, `/v1/compare`, `/v1/review`, `/v1/effects`, `/v1/adapters`, `/v1/scaffold`,
`/v1/deps`, `/v1/deps/install`. Escucha sólo en loopback.

### Skills e instrucciones

`ve init` copia instrucciones y skills al proyecto:

- `AGENTS.md` (Codex/OpenCode/Freebuff), `CLAUDE.md`, `GEMINI.md`
- `.cursor/rules/visual-engine.mdc`
- `.codex/skills/…`, `.claude/skills/…`, `.agents/skills/…`
- `.visual-engine/config.json`

El texto canónico está en [skills/visual-engine/SKILL.md](skills/visual-engine/SKILL.md).

## Demostración medida

La demo incluye una referencia generada con matemáticas propias (540×960, 3 s, 30 fps, dos
cortes) y dos versiones de una misma landing: una primera pasada plana y la versión trabajada.

```
Referencia:   paleta #091012 / #094745 / #1caea3, luz 14.6 %, contraste 15.4 %, 40 cortes/min
Línea base:   68.0/100 (C)
Versión final: 81.3/100 (B)   ΔE de paleta 4.8 · Δ luminancia −2.9 % · Δ contraste +1.0 %
```

Reproducir:

```bash
npm run demo:prepare
npm run demo:review
```

Artefactos en `demo/out/` (`baseline`, `final-v2`). La captura de la versión final reveló un
fallo real (titular invisible por `background-clip: text` con transformaciones); se corrigió y
se volvió a medir. Ese es el propósito del motor.

## Arquitectura

```
src/core   análisis, media, comparación, captura, biblioteca, dependencias, revisión
src/mcp    servidor MCP (stdio)
src/api    API HTTP local
src/cli    comandos `ve`
library/   6 recetas con plantillas reales
demo/      referencia sintética + landing base/final
tests/     20 pruebas (núcleo, CLI, API, MCP, E2E)
```

Detalle: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Pruebas

```bash
npm test
```

20 pruebas, ~28 s: metadatos y análisis de la referencia, detección de los dos cortes,
comparación idéntica (100) y opuesta, PNG del mapa de calor, CLI, biblioteca, scaffolds,
`ve init` idempotente, API HTTP (incluido bloqueo de instalación), cliente MCP real, `npm` sin
shell y el ciclo E2E que exige que la versión final supere a la línea base.

## Licencias

Código propio: MIT. Dependencias: Three.js MIT, Motion MIT, Playwright Apache-2.0, GSAP
standard (sin plugins de Club), Remotion License (no es MIT), FFmpeg según build, React Bits
MIT/CC-BY (atribución). Visual Engine no incluye componentes de terceros copiados.

## Qué falta

Publicación en GitHub y actualización remota verificada, pruebas en Linux/macOS, detección de
objetos/pose/OCR, corrección automática del código fuente (hoy entrega instrucciones al agente),
paletas extraídas por regiones, análisis de audio y subtítulos. Lista completa y honesta:
[docs/CAPABILITIES.md](docs/CAPABILITIES.md).
