# Verificación de Visual Engine 1.0.0-rc.2

Fecha: 2026-11-25 · Windows 11 · Node 26.13.1 · FFmpeg 9.1 · Playwright 1.65.1 ·
Tesseract 5.4 · Ollama 0.40.17. Punto de partida: commit `6869fa7` (1.0.0-rc.1).

Esta entrega **no añade efectos, estilos ni composiciones**. Se conservan 58 efectos, 15 estilos,
20 composiciones, la API local, la galería y los 9 adaptadores de agente. Todo lo nuevo responde a
un fallo medido en rc.1.

## 1. Criterios de aceptación

| Criterio | Resultado | Evidencia |
| --- | --- | --- |
| Conservar las 63 pruebas anteriores | **Sí**: 63 anteriores + 6 nuevas = **69/69**, exit 0, 223 s | §2 |
| Demostrar mejoras repetibles con agentes reales | **Parcial**: B mejora 2/5, empata 3/5, sin regresión global | §6 |
| Evitar regresiones visuales importantes | **Una regresión de dimensión** publicada: tipografía 91,1 → 72,2 en `professional-app` | §6 |
| Mantener accesibilidad y rendimiento | Contraste 0 incumplimientos en los 5 B; FPS 55,8–61,4 | §6 |
| Resolver o documentar los riesgos de seguridad | **Resuelto**: zod 4.6.7, `npm audit` 0 vulnerabilidades | §8 |
| Mantener funcionamiento local y gratuito | Sin servicios externos ni cuentas en el producto | §8 |
| No publicar en GitHub ni contratar servicios | No se publicó ni se contrató nada | — |

## 2. Suite

```
npm run build        # TypeScript estricto, exit 0
npm test             # 69/69, exit 0, 223,3 s
```

63 pruebas previas + 6 nuevas en `tests/visual07.test.mjs`:

1. Reference First: el brief mide la referencia y no inventa tipografía.
2. Reference First: sin referencia no se inventan color, composición ni tipografía.
3. El estilo no invierte la luz de la referencia (claro/oscuro/neutro, con caso negativo).
4. Coherencia de matiz: circular, con cobertura y con casos negativos.
5. Workflow: 8 pasos, presupuesto de 2 correcciones y criterio de terminado.
6. MCP: descubrimiento selectivo por grupo (19 herramientas) y `visual_plan` como entrada.

## 3. Investigación del A/B de rc.1

Informe completo: [`docs/INVESTIGACION-RC2.md`](INVESTIGACION-RC2.md). Resumen de lo **demostrado**:

1. **La referencia nunca llegó al agente.** El prompt era sólo texto y `codex exec` se lanzó sin
   `-i`. La "fidelidad" se midió contra una imagen que ninguno de los dos brazos vio.
2. **La referencia no era una referencia de diseño**: fotografía vertical de museo 3710×4000
   (proporción 0,927, con banda negra) contra objetivos 1280×720. La composición por cuadrantes
   compara repartos de masa entre formatos distintos.
3. **B no cerró el ciclo**: 9 comandos `ve`, 7 de preparación o ayuda; ni `analyze`, ni `critic`,
   ni `fidelity`, ni `gate`.
4. **Coste medido**: 19 comandos de shell frente a 7, +25.022 tokens de entrada (+7 %), misma
   salida y mismo tiempo.
5. **La skill inducía "estilo antes que referencia"**: recomendaba `ve art --style` en el paso 2,
   y B la ejecutó antes de medir nada.

Hipótesis descartadas o no medibles: falta de presupuesto de tokens (no sostenida), varianza del
modelo (una sola pasada), sesgo estético de la skill (parcial), MCP denegado (hecho demostrado,
efecto no: B usó la CLI).

## 4. Reference First

Nuevo módulo `src/core/plan.ts`:

- `ve plan "<intención>" --reference <archivo> --out <dir>` y su equivalente MCP `visual_plan`.
- Escribe `reference-first.md` y `reference-first.json` con las **siete dimensiones** a preservar,
  la paleta con roles y contraste, la masa por cuadrantes, la luminancia, el contraste, la
  saturación, el detalle, el movimiento, los cortes y la escala tipográfica **estimada por
  alturas**. Si no hay dos niveles de texto, la tipografía queda `unavailable`: no se inventa una
  familia ni un peso.
- Si no hay referencia, lo dice y no rellena datos; el brief pide la referencia antes de fijar
  estética.
- Reglas no negociables explícitas: no imponer oscuridad, partículas, glow ni glassmorphism.

**Guardia de estilo** (`checkStyleAgainstReference` en `src/core/styles.ts`), aplicada con
`ve art --from-plan`:

- Estilo oscuro + referencia con luminancia ≥ 0,45 → conflicto `dark-inversion` (bloqueo).
- Estilo claro + referencia oscura → `light-inversion`.
- Referencia casi neutra + acento saturado → `accent-unsupported` (aviso).
- Proporción extrema → `aspect-extreme` (aviso).
- Sin `mode` explícito, **se adopta el modo de la referencia** y se declara en `warnings`; con
  `mode` explícito, se respeta la decisión del usuario pero el conflicto queda escrito.

Cubierto por los tests 1–3. No se añadió ninguna estética nueva.

## 5. Workflow y superficie de herramientas

- Plan de 8 pasos: analizar → comprender → diseñar → implementar → renderizar → inspeccionar →
  corregir → verificar. Cada paso declara herramientas, criterio de terminado y estado; el
  presupuesto es **2 correcciones medidas**.
- `doneDefinition`: código ejecutándose **+ captura real + crítica/gate + defectos declarados**.
  Una tarea no termina porque compile.
- 45 herramientas MCP agrupadas en `analysis` (14), `direction` (10), `build` (9), `verify` (5),
  `agents` (7). Filtro `VE_MCP_GROUPS` / `VE_MCP_TOOLS`: expone 19 en vez de 45 sin perder
  capacidades (la CLI y `ve serve` las conservan todas).
- `visual_plan` sustituye el bloque de siete comandos de preparación de la skill anterior.
- La biblioteca de 58 efectos ya no se carga entera: sólo `ve effects list` puntual o
  `ve effects show <id>`.

## 6. A/B real con Codex (rc.2)

Diseño: 5 parejas. Mismo modelo, **misma referencia adjunta con `-i`**, mismo prompt y mismo
sandbox. A: directorio limpio. B: `ve install --agents codex` + MCP por `-c`. Referencias
sintéticas 16:9 (generadas para este banco, sin material de cliente) y prohibido incrustar la
imagen; se comprobó que ningún brazo lo hizo.

| Caso | Calidad A → B | Fidelidad A → B | Composición | Tipografía | Gates |
| --- | ---: | ---: | ---: | ---: | --- |
| game-hud | 85,3 → **92,6** | 72,8 → **85,9** | 82,4 → 86,6 | 61,5 → 68,7 | reject → **accept** |
| professional-app | 95,2 → **96,8** | 94,9 → 94,7 | 99,8 → 99,8 | 91,1 → **72,2** | reject → **accept** |
| motion-title | 96,2 → **97,0** | 95,6 → **96,3** | 98,9 → 99,5 | 79,7 → 80,7 | accept → accept |
| scene-3d | 95,7 → **95,8** | 88,0 → 88,0 | 94,1 → 94,1 | 85,1 → 85,1 | accept → accept |
| premium-landing | 97,4 → **97,5** | 91,7 → **91,8** | 98,0 → 98,0 | 91,2 → 91,2 | accept → accept |

Coste y correcciones:

| Caso | Comandos `ve` | Tokens entrada A → B | Cacheados A → B | Duración A → B |
| --- | ---: | ---: | ---: | ---: |
| game-hud | 0 → 27 | 419.402 → 2.865.608 | 359.296 → 2.802.944 | 84 → 249 s |
| professional-app | 0 → 6 | 370.805 → 1.189.664 | 334.720 → 1.146.240 | 163 → 257 s |
| scene-3d | 0 → 8 | 440.358 → 721.550 | 409.728 → 677.504 | 72 → 143 s |
| motion-title | 0 → 6 | 307.545 → 583.288 | 278.784 → 526.080 | 72 → 116 s |
| premium-landing | 0 → 4 | 313.639 → 771.958 | 279.040 → 722.816 | 57 → 113 s |

**Resultados negativos y regresiones, sin maquillar:**

- Solo `game-hud` mejora de forma clara (+7,3 calidad, +13,1 fidelidad): A dejaba una banda negra
  de ~20 % de alto y la tipografía del HUD por debajo del umbral. B midió, capturó a 1280×720,
  corrigió y llenó el lienzo. Capturas:
  `docs/evidencia/1.0-rc2/agents/evidence/game-hud/{a,b}/review/captures/capture-01.png`.
- `professional-app` sube +1,6 de calidad: A tenía **31 incumplimientos de contraste** y un
  hallazgo crítico, y B los corrigió. Aun así **bajó tipografía 18,9 puntos** (texto más fino en
  la tabla). El gate de B acepta porque 72,2 supera el umbral de 62. Se publica como regresión de
  dimensión.
- `game-hud` B también bajó profundidad 98,9 → 87,2 (−11,7). Se publica.
- Los otros tres casos empatan (≤ 1,2 puntos). Un empate **no** demuestra equivalencia.
- El coste real es el **tiempo** (1,6×–3×) y los turnos. Los tokens de entrada crecen hasta 6,8×,
  pero 97–99 % son lecturas de caché; el incremento de entrada no cacheada es pequeño
  (≈ 62,7 k vs 60,1 k en `game-hud`). No hay telemetría de facturación del proveedor.

Métricas agregadas, capturas y artefactos de revisión:
[`docs/evidencia/1.0-rc2/agents`](evidencia/1.0-rc2/agents/README.md). Los registros crudos de
invocación (comandos, salidas y JSONL de Codex) se retiraron antes de publicar por privacidad.

**Pérdida declarada:** al limpiar directorios de ejecución no referenciados se borró
`work/professional-app/{a,b}`. Se conservan el HTML de ambas ramas, las capturas, los artefactos
de revisión y `results.json`; `runs.json` mantiene consumo, tiempos y recuentos sin los registros
crudos de invocación. Los JSONL de Codex no se distribuyen.

## 7. Quality gates: el caso de la referencia casi gris

Investigación: [`docs/evidencia/1.0-rc2/coherence/RESULT.md`](evidencia/1.0-rc2/coherence/RESULT.md).

**Hallazgo:** la referencia *Armor* de `game-cinematic` tiene **cobertura cromática 4,1 %**. La
fórmula de rc.1 hacía coseno directo entre histogramas de 12 sectores. Dos problemas matemáticos:

1. El matiz es circular; el coseno sobre sectores trata 0° y 330° como ortogonales. Con la misma
   referencia, rc.1 da **93,0 a +15°** y **94,6 a +30°** (no monótono), y **0 a +90°**. Un salto
   discontinuo no es una medida de coherencia.
2. Con 95,9 % de píxeles neutros, el histograma lo define uno o dos colores y no está definido:
   puntuar 0 es puntuar ruido.

**Corrección (sin tocar umbrales):**

- Ponderación por croma (los neutros no aportan matiz).
- Suavizado circular con núcleo de von Mises `K(Δ) ∝ exp(κ·cos Δ)`, κ = 4 (≈ 29° de desviación),
  renormalizado. La similitud decrece de forma monótona con la distancia circular.
- Cobertura cromática mínima **0,08** en **ambas** imágenes; por debajo, `available:false` con el
  motivo. Una dimensión no disponible **no se rellena** y se renormaliza el resto.

| Rotación de la misma referencia | rc.1 | rc.2 |
| --- | ---: | ---: |
| 0° | 100 | 100 |
| +15° | 93,0 | 83,7 |
| +30° | **94,6** | 79,3 |
| +60° | 24,8 | 40,9 |
| +90° | 0 | 14,5 |
| +120° | 0 | 3,8 |
| +180° | 0 | 0,3 |
| Gris contra color | 0 | **no disponible** |
| Gris contra gris | 0 | **no disponible** |
| Caso real rechazado (armadura vs HUD) | 19,5 | **no disponible** |

**Re-medición del caso rechazado** (mismo artefacto, misma referencia, mismos umbrales):

| | Calidad rc.1 → rc.2 | Coherencia | Hallazgos altos | Gate |
| --- | ---: | --- | ---: | --- |
| A (`baseline.html`) | 73,3 → 77,1 | 0 → no disponible | 2 → 1 (`lighting-low`) | reject → **reject** |
| B (`index.html`) | 77,7 → 80,6 | 19,5 → no disponible | 1 → 0 | reject → **accept** |

El rechazo de B era un error de evaluación del matiz, no un defecto visual: desaparece el bloqueo
falso. **No se aprobó por relajar nada**: A, medido con el mismo motor arreglado, sigue
rechazando por un defecto real de iluminación. El resto de gates (composición, tipografía,
contraste, runtime, rendimiento) no cambió.

## 8. Seguridad y compatibilidad

- **zod**: `npm audit --omit=dev` → **0 vulnerabilidades**. `zod` 4.6.7; el SDK de MCP 1.32.2
  declara `zod: ^3.25 || ^4.0`, así que el aviso GHSA-mrhx-c7xc-m3w5 queda resuelto. Se migraron
  los esquemas (`z.record(z.string(), …)`) y el handshake MCP real sigue pasando (test 6 y
  `verifyMcpServer`). No se quedó en zod 3 “por compatibilidad”: era innecesario.
- **Estado del aviso oficial**: consultado el 2026-11-25, el GHSA sigue publicado como *high*
  (CVSS 7,5) pero su única fuente, CVE-2023-54404, **fue rechazado** el 2026-10-28 (VulnCheck:
  comportamiento esperado del validador, alcanzable sólo sin límite de tamaño de petición). Hay
  una petición abierta para retirar el aviso. La actualización se hizo igualmente porque era
  compatible y barata; el riesgo en este producto era bajo en cualquier caso (stdio local,
  esquemas estáticos, sin arrays de longitud libre de un cliente remoto).
- **Licencias**: sin cambios en el inventario; MIT, ISC, BSD, Apache-2.0, MPL-2.0 (a nivel de
  archivo), Remotion License y GSAP estándar. Nada copyleft fuerte distribuido.
- **Secretos y rutas**: sin cambios; `ve security` sigue sin bloqueos.
- **Linux**: WSL está instalado como ejecutable pero **no hay ninguna distribución** (no existe la
  clave `Lxss` y `wsl -l -q` no devuelve nada). **Linux no se verificó.**
- **macOS**: **no se declara compatible**; no hay hardware ni ejecución real. El CI queda
  preparado y sin ejecutar, como en rc.1.
- **Windows**: toda la verificación de esta entrega se ejecutó aquí.

## 9. Reproducir

```bash
npm ci && npm run build && npm test        # 69/69
node docs/evidencia/1.0-rc2/coherence/validate.mjs
node docs/evidencia/1.0-rc2/coherence/remeasure-rc1.mjs
node docs/evidencia/1.0-rc2/agents/run-bench.mjs        # 5 parejas, ~25 min, requiere codex
node docs/evidencia/1.0-rc2/agents/measure-agents.mjs
node docs/evidencia/1.0-rc2/agents/summarize.mjs
```

Las ramas A/B viven en `docs/evidencia/1.0-rc2/agents/work/<caso>/<marca>/{a,b}` con su
`index.html`, los JSONL de Codex y los logs de instalación. No se reutilizan directorios: cada
ejecución estrena carpeta.

## 10. Lo que sigue sin demostrarse

- Que VE mejore a un agente de forma **general**: cinco casos, una pasada por brazo, cuatro
  empates.
- Que el proxy estructural mida calidad artística. Mide composición, luz, contraste, tipografía y
  coherencia con fórmulas declaradas; no sustituye la revisión humana, que sigue pendiente.
- Que el flujo funcione en Linux o macOS.
- El efecto de Freebuff como consumidor autónomo: su CLI sólo ofrece `login`/`doctor` y modo
  interactivo; no se ejecutó una sesión supervisada en esta entrega.
