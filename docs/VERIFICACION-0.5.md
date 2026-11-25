# Verificación de Visual Engine 0.5 — Visual Intelligence Loop

Fecha: 2026-11-25 · Windows 11 · Node 26.13.1 · FFmpeg 9.1 · Playwright 1.65.1

Esta fase conserva los **58 efectos**, **15 estilos**, **20 composiciones**, la composición 0.3 y
las **45 pruebas** anteriores. Añade **9 pruebas** de la capa 0.5. No se publicó en GitHub ni se
usó una API de pago.

## Qué se implementó

| Requisito | Implementación | Estado |
| --- | --- | --- |
| Visual Critic | `src/core/critic.ts`: 15 categorías de defecto, evidencia, ubicación, gravedad, confianza y corrección | **Verificado** con DOM y perfiles reales |
| Autonomous Improvement Loop | `src/core/loop.ts`: análisis, copia, captura, crítica, cambio del agente, recaptura, comparación y reversión | **Verificado** con fixture real y restauración |
| Límites del loop | iteraciones, minutos y presupuesto estimado de tokens | **Verificado**; el presupuesto es caracteres/4 |
| Visual Debugger | `src/core/debugger.ts`: selectores, cajas, regiones, CSS computado, capas, animaciones, canvas y fuente | **Verificado** en Chromium |
| Correspondencia fuente | búsqueda de clase/id/atributo en archivos del proyecto | **Verified** sólo si la cadena aparece; si no, no se inventa |
| Reference Fidelity Engine | `src/core/fidelity.ts`: layout, tipografía, paleta, luz, profundidad, materiales, efectos, movimiento, ritmo, transiciones y coherencia | **Verificado/estimado por dimensión** |
| Similitud de píxeles | se devuelve aparte de la fidelidad estructural | **Verificado**; nunca se usa como calidad artística |
| Smart Effects Selection | `src/core/smart-effects.ts`: brief, estilo, proyecto, señales, presupuesto y anti-patrones | **Verificado**; minimalismo puede elegir 0–1 |
| Quality Gates | `src/core/gates.ts`: umbrales configurables, defectos críticos y aprobación humana | **Verificado**; defecto crítico bloquea |
| Contexto selectivo | `src/core/context.ts`: herramientas/recetas/docs acotados, informe compacto y caché por contenido | **Verificado**; 5 herramientas y 0–3 recetas en las pruebas |
| Recuperación de recetas | `loadRecipe(id)` bajo demanda | **Verificado** |
| CLI/MCP/API/Skills | 38 herramientas MCP, comandos nuevos, rutas nuevas y documentos actualizados | **Verificado** por build y smoke tests |

## Arquitectura de la fase

La fase no sustituye `review` ni `iterate`: los usa como sensores. El flujo es:

```text
brief + referencia
      ↓
review (captura + perfiles + calidad) ── inspectDom (DOM/CSS/fuente)
      ↓                                      ↓
              Visual Critic + Fidelity + Gates
                              ↓
                  agent-task.md (ubicaciones y correcciones)
                              ↓
                el agente aporta replace/patch
                              ↓
              copia → aplicar → recapturar → comparar
                         ↓              ↓
                     conservar       revertir
```

El loop **no llama a un proveedor**. Si no recibe un cambio, devuelve `awaiting-agent` con la
tarea compacta. Esto mantiene compatibilidad con Codex, Claude Code, Cursor, Gemini CLI,
Freebuff, OpenCode y agentes locales: el transporte puede ser MCP, CLI o API.

## Pruebas

La suite 0.5 ejecutada de forma aislada:

```text
9 tests · 9 pass · 0 fail · 39,3 s
```

Los 9 tests cubren: crítica con evidencia, contención minimalista, gates con defecto crítico y
aprobación humana, selección de efectos, fidelidad estructural, caché/contexto, debugger real,
loop con copia/restauración y preservación de 58/15/20.

La suite completa 0.1–0.5 se ejecutó con `npm test` tras la integración de código:
**54/54 pruebas PASS en 143,6 s**, 0 fallos, 0 canceladas, 0 omitidas. La documentación posterior no
cambió código. Incluye los 9 tests 0.5 y las 45 pruebas anteriores. Smoke test adicional:
**38 herramientas MCP**, `visual_context` responde sin cargar la biblioteca completa; API `0.5.0`,
`/v1/context` y `/v1/loops` responden en loopback.

## A/B reproducible

Banco: `docs/evidencia/0.5/make-ab.mjs`. Mismo agente, mismo brief, mismo copy y un máximo de
9.000 caracteres por implementación. A es una plantilla genérica oscura; B usa Art Director,
tokens, jerarquía, imagen de referencia, motion y gates. **No se ajustaron las métricas después
de medir.**

Referencias: obras **CC0 / dominio público del MET Open Access** (cuatro obras únicas; Degas se
reutiliza en landing y motion). Son referencias de dirección visual, no pantallas de producto de
esos dominios.

| Caso | Calidad A → B | Fidelidad A → B | Composición A → B | Tipografía A → B | FPS A → B | Gates |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| App profesional | 66,4 → **79,6** | 64,6 → **75,4** | 87,8 → **98,1** | 94,8 → **99,2** | 61,0 → 61,3 | reject → reject |
| Landing premium | 73,7 → **78,9** | 71,2 → **72,2** | 91,5 → **97,1** | 100 → 100 | 61,0 → 60,8 | reject → reject |
| Interfaz de juego | 71,5 → **73,4** | 63,3 → 62,1 | 84,0 → 76,2 | 100 → 100 | 60,9 → 61,4 | reject → reject |
| Escena 3D | 75,1 → **76,8** | 64,6 → **66,1** | 91,9 → 82,7 | 100 → 100 | 61,0 → 58,6 | reject → reject |
| Motion graphics | 74,1 → **80,2** | 69,4 → **83,8** | 84,2 → 85,4 | 100 → 91,2 | 61,5 → 60,5 | reject → reject |

**Lectura honesta:** la calidad global mejora en 5/5; la fidelidad mejora en 4/5 y baja 1,2 puntos
en juego. La composición baja en juego y 3D; la tipografía baja en motion. El mínimo de FPS de B
es 58,6 y la carga máxima 894 ms. Los gates por defecto rechazan los cinco porque exigen
fidelidad ≥70 y cero hallazgos altos: la coherencia de paleta frente a una obra de arte y la
iluminación siguen siendo señales altas, y motion tiene además un hallazgo de rigidez. **No se
relajó el gate para convertir el A/B en un aprobado.**

Tokens: A 747–951, B 809–1.391 estimados por longitud del HTML (caracteres/4). **No hay telemetría
del proveedor** ni se ejecutó un segundo modelo; las iteraciones del loop en este banco son 0.

## WebGL real

`docs/evidencia/0.5/webgl.json`:

- escena Three.js real, `camera.rotation.y` leída del objeto de cámara;
- rotación esperada **1,5°**, máxima medida **1,41°**, error **0,09°**;
- **213 frames** renderizados durante la medición;
- reduced-motion probado por el código de la escena;
- captura: `docs/evidencia/0.5/measure/webgl.png`.

No se extrapola a cualquier WebGL: es una escena concreta, con el renderer de Chromium headless
de esta máquina.

## Transiciones de vídeo

- `motion-a.mp4`: página estática, 6,44 s, 1280×720, 25 fps, H.264.
- `motion-b.mp4`: reel de 7 s, 1280×720, 25 fps, 175 frames.
- `references/motion-reference.mp4`: tres planos derivados de una obra CC0, 6 s, 150 frames.
- `analyzeTimeline` detectó 6 picos de corte agrupables en 3 transiciones (el detector no fusionó
  los dobles picos); ritmo 51,43/min.
- `temporalCompare` referencia vs B: **56,9/100**. Es una limitación real: la referencia es un
  montaje estático derivado, no una grabación de motion graphics externa.

## Errores corregidos durante la fase

1. **Alfa en `rgb()` del debugger**: el parser no asignaba alfa 1 a `rgb(...)` y descartaba todo
   texto; el contraste salía en 0. Corregido y cubierto por test.
2. **Restauración con `--out` personalizado**: el loop guardaba la copia fuera de
   `.visual-engine/loops` y `restoreLoop` no la encontraba. Ahora acepta `outDir` en CLI/API/MCP.
3. **Composición B bajo el pliegue**: en la primera pasada, juego/3D/motion ponían la escena
   principal bajo 720 px y perdían composición. Se rediseñaron como un viewport completo y se
   repitió la medición. No se cambió la métrica.
4. **Ruta del informe A/B**: el informe intentaba leer tokens desde un objeto anidado incorrecto;
   se corrigió antes de considerarlo evidencia.

## Límites

- La crítica es estructural y declaradamente **no es un juicio artístico humano**.
- La aprobación artística final está pendiente; los gates pueden exigirla explícitamente.
- El presupuesto de tokens del loop es una estimación, no telemetría del proveedor.
- La fidelidad de layout/tipografía/materiales/movimiento usa proxies declarados; no es una
  reconstrucción métrica de la escena.
- La fuente tipográfica original no se identifica.
- La correspondencia fuente del debugger es exacta sólo cuando la cadena aparece; si no, queda
  `null` y no se presenta como verificada.
- El debugger inspecciona hasta 220 elementos prioritarios; no es un inventario exhaustivo.
- Las referencias A/B son obras CC0 del MET, no material de cliente ni pantallas de producto.
- El vídeo de motion se mide contra un montaje derivado, no contra una pieza externa.
- Sólo Windows; Linux/macOS no se probaron.
- **Sin publicación en GitHub.**
