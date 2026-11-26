# Investigación del A/B negativo de 1.0.0-rc.1 con Codex

Fecha: 2026-11-25. Fuente: `docs/evidencia/1.0-rc/agents/` (ejecución del 2026-11-26),
`docs/evidencia/1.0-rc/projects/game-cinematic/`, y el propio código de rc.1 en el commit
`6869fa7`.

El resultado publicado fue: A (sin Visual Engine) **77,1** de calidad y **72,8** de fidelidad;
B (con Visual Engine) **62,3** y **48,4**. Esta nota separa lo que la evidencia demuestra de lo
que sólo es una hipótesis plausible.

## 1. Qué se comparó realmente

- Tarea: landing de HALO FOUNDRY (estudio de cerámica), 1280×720, CSS autocontenido.
- Prompt: `docs/evidencia/1.0-rc/agents/measure-agents.mjs` y `.tmp/rc1/agent-ab/PROMPT.md`.
- Medición: `opIntelligence` del propio motor, una pasada por brazo, sin cambios de umbral.
- Referencia de fidelidad: `docs/evidencia/1.0-rc/references/premium-landing.jpg`.

Datos de la ejecución (de los JSONL de Codex):

| | A sin VE | B con VE |
| --- | ---: | ---: |
| Tokens de entrada | 354.947 | 379.969 |
| Tokens de salida | 3.880 | 3.774 |
| Comandos de shell | 7 | 19 |
| Comandos `ve` | 0 | 9 |
| Llamadas MCP | 0 | 0 |
| Duración | 109 s | 111 s |

## 2. Causas demostradas

### D1 · La referencia nunca llegó al agente

El prompt de rc.1 es sólo texto (`PROMPT.md`) y el arnés no adjuntaba ninguna imagen:
`codex exec` se invocó sin `-i` ni ninguna otra vía de aportar la referencia. La referencia se
usó **sólo para puntuar**, después.

Consecuencia: "fidelidad 72,8 → 48,4" mide la distancia entre dos páginas y una obra que ningún
brazo vio. No mide si Visual Engine ayudó a interpretar la referencia: no había referencia que
interpretar. Cualquier atribución de la caída al motor por esta vía es inválida, en las dos
direcciones.

### D2 · La referencia no era una referencia de diseño

`premium-landing.jpg` es una fotografía de museo de *La clase de danza* de Degas:
**3710×4000**, proporción **0,927** (retrato), con una banda negra del propio archivo. Los
objetivos son 1280×720 (0,562 de proporción). La composición y la fidelidad estructural se
calculan con masa por cuadrantes y balance del primer fotograma: comparar un retrato con banda
negra contra un lienzo apaisado no mide parecido de diseño, mide coincidencia de reparto de masa
entre formatos distintos.

Prueba del efecto: la referencia tiene `darkRatio` 0,092 y la página B ~0,5 por su panel oscuro;
A, clara y con la imagen a la derecha, coincide mejor con el reparto de masa. La diferencia de
composición (93,9 vs 40,6) y de profundidad (93,6 vs 48,1) se explica por ese reparto, y ambas
páginas obtienen la **misma** iluminación (36,3 vs 35,4). Es decir: el motor no distinguió "mejor
diseño", distinguió "reparto de píxeles más parecido a un cuadro vertical".

El quinto proyecto de la misma entrega (`game-cinematic`, referencia *Armor* 1600×2132) muestra
el mismo patrón: la referencia es otra fotografía vertical de museo.

### D3 · B no cerró el ciclo de medición

Los 9 comandos `ve` de B fueron: `doctor`, `context`, `effects list` (canalizado a
`ConvertFrom-Json | Get-Member`), `vision status`, `agents`, `art --help`, `capture --help`,
`art` y `capture`. Sólo dos produjeron artefactos útiles; **ninguno midió la referencia**
(`analyze`, `inspect`, `refdesign`, `fidelity`, `critic`, `gate` no se ejecutaron).

El motor estaba instalado y se invocó, pero no se usó como bucle: no hubo crítica, no hubo
corrección medida, no hubo gate. La caída no puede atribuirse a "corregir con Visual Engine"
porque no se corrigió nada.

### D4 · La skill pedía siete comandos de preparación antes de diseñar

La `SKILL.md` de rc.1 abría con un bloque "Antes de empezar" de siete comandos (`agents`,
`install`, `profile`, `doctor`, `vision status`, `context`, `effects list`). B ejecutó cinco de
ellos y dos `--help`. Ese coste está medido: +25.022 tokens de entrada (+7 %) y 12 comandos de
shell extra, sin ninguna decisión de diseño a cambio.

### D5 · El flujo de la skill era "estilo antes que referencia"

La skill proponía `ve art "<brief>" --style <id>` en el paso 2, y B ejecutó exactamente
`ve art "... --style editorial"`. El sistema de arte devuelve una composición declarada
(`focal: titular izquierdo`, `imageRatio: 4:5`, panel asimétrico); B la materializó como un panel
oscuro a la derecha. El resultado es defendible como pieza, pero no nace de la referencia: nace
de un perfil predefinido elegido antes de medir nada. Es el comportamiento que la skill inducía
y el que rc.2 prohíbe.

## 3. Hipótesis no demostradas

| Hipótesis | Estado | Por qué |
| --- | --- | --- |
| B se quedó sin presupuesto de tokens | **No sostenida** | B usó 7 % más de entrada y prácticamente la misma salida; terminó igual y con más comandos. |
| La varianza del modelo explica la caída | **No medible con rc.1** | Una pasada por brazo, sin repeticiones. rc.2 repite el diseño A/B con cinco casos, pero sigue sin estimar varianza por caso. |
| El sesgo "nada de diseños planos" de la skill empujó a oscuro | **Parcial** | La skill lo decía y B eligió un estilo claro (`editorial`); el panel oscuro fue su interpretación. No se puede aislar. |
| MCP denegado impidió usar el motor | **Demostrado el hecho, no el efecto** | Cero llamadas MCP: `codex exec` deniega sin `default_tools_approval_mode="approve"`. B usó la CLI, así que tuvo acceso equivalente a las operaciones. |
| La referencia "casi gris" hizo bajar la coherencia | **Demostrado en la métrica, no en este A/B** | El caso concreto está en `game-cinematic`, no en HALO FOUNDRY. Ver §4. |

## 4. El gate que rechazó una pieza válida

`game-cinematic` B: calidad 77,7, fidelidad 71,6, composición 82,3, tipografía 91,2, rendimiento
60,4 FPS, contraste 0 incumplimientos. El gate rechazó por **un** bloqueo: `high-findings=1`, y el
único hallazgo alto era `coherence-low` con coherencia **19,5**.

La referencia (*Armor*, 1600×2132, armadura de acero sobre fondo gris) tiene **cobertura
cromática 4,1 %**: el 95,9 % de su paleta es neutra. La fórmula de rc.1 hacía
`coseno(hueHistogram_referencia, hueHistogram_página)`: con masa cromática casi nula, el
histograma lo define uno o dos colores y el coseno cae a 0 o a valores arbitrarios. No es un
defecto visual: es una variable circular medida donde no está definida.

La validación de rc.2 está en `docs/evidencia/1.0-rc2/coherence/RESULT.md`, con rotaciones
controladas de la misma referencia, casos negativos y la re-medición del artefacto rechazado.
Resumen: con la métrica nueva el hallazgo desaparece porque la dimensión queda **no disponible**
(no se convierte en un aprobado), y el caso A de la misma pareja **sigue rechazando** por un
defecto medido de iluminación. No se bajó ningún umbral.

## 5. Qué cambia en 1.0.0-rc.2 y qué causa ataca

| Cambio | Causa |
| --- | --- |
| `ve plan` / `visual_plan`: brief medido + plan de 8 pasos como primera llamada | D3, D4 |
| `--from-plan` en `ve art`: la paleta y el modo se subordinan a la referencia medida, con conflicto declarado | D5 |
| Skill reescrita: sin bloque de preparación, con "la referencia manda" y presupuesto de 2 correcciones | D3, D4, D5 |
| Herramientas MCP agrupadas y filtrables (`VE_MCP_GROUPS`, `VE_MCP_TOOLS`) | D4 |
| A/B de rc.2 con `-i`: la referencia se adjunta a **ambos** brazos y es 16:9 de diseño | D1, D2 |
| Coherencia de matiz con cobertura mínima y núcleo circular | §4 |

## 6. Lo que esta investigación no demuestra

- No demuestra que Visual Engine mejore a un agente en todas las tareas; el A/B de rc.2 mide
  cinco casos y una pasada por brazo.
- No demuestra que el resultado de rc.1 fuera culpa exclusiva del motor: la referencia inválida y
  la ausencia de la imagen en el prompt son del **montaje**, no del producto.
- No hay revisión artística humana de las piezas; la puntuación automática es un proxy.
