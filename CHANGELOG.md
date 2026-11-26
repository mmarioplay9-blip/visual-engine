# Changelog

## 1.0.0-rc.2 · 2026-11-25

Release candidate sobre 1.0.0-rc.1. No se añadieron efectos, estilos ni composiciones.

### Añadido

- **Reference First**: `ve plan` / `visual_plan` mide la referencia antes de diseñar y devuelve un
  brief con las siete dimensiones a preservar, la paleta con roles y contraste, la composición,
  la luz y la tipografía estimada, más un plan de 8 pasos con criterio de terminado y presupuesto
  de 2 correcciones.
- **Guardia de estilo** `ve art --from-plan`: si el estilo contradice la luminancia medida de la
  referencia, se adopta el modo de la referencia y el conflicto se declara; nunca en silencio.
- **A/B nuevo con Codex**: cinco parejas con la referencia 16:9 adjunta con `-i` a los dos brazos,
  referencias sintéticas declaradas y prohibición de incrustar la imagen.
- **Validación de la coherencia de matiz** con rotaciones controladas, casos negativos y
  re-medición del caso rechazado en rc.1.
- 6 pruebas nuevas (`tests/visual07.test.mjs`): Reference First, guardia de estilo, coherencia
  circular, plan de 8 pasos y descubrimiento selectivo de MCP.
- `docs/INVESTIGACION-RC2.md` y `docs/VERIFICACION-1.0-rc2.md`.

### Corregido

- **Coherencia de matiz**: el coseno directo sobre 12 sectores se hundía a 0 con 30° de diferencia
  (no monótono: 93,0 a +15° y 94,6 a +30°) y puntuaba ruido con referencias casi grises. Ahora se
  pondera por croma, se suaviza con un núcleo circular de von Mises (κ=4) y se exige cobertura
  cromática ≥ 0,08; si no, la dimensión queda `available:false` con el motivo. Ningún umbral se
  redujo.
- **El gate que rechazaba una pieza válida**: `game-cinematic` B pasa de `reject` a `accept`
  porque el hallazgo de coherencia era un artefacto; A, con el mismo motor, **sigue rechazando**
  por iluminación.
- **zod 4.6.7**: el SDK de MCP 1.32 admite zod 4, así que se migraron los esquemas y se eliminó la
  alerta alta (`npm audit`: 0 vulnerabilidades).
- La skill pedía siete comandos de preparación antes de diseñar y recomendaba elegir estilo antes
  de medir; se sustituye por `ve plan` y por “la referencia manda”.

### Cambiado

- 45 herramientas MCP agrupadas (`analysis`, `direction`, `build`, `verify`, `agents`) con
  descubrimiento selectivo por `VE_MCP_GROUPS` / `VE_MCP_TOOLS` (19 en vez de 45 sin perder
  capacidades) y `visual_plan` como puerta de entrada.
- CLI: 48 comandos (`plan`, con alias `brief`).

### Conservado

58 efectos, 15 estilos, 20 composiciones, la API local, la galería, los 9 adaptadores y las 63
pruebas anteriores. Suite: **69/69** en 223 s, código de salida 0.

### Límites de esta RC

- El A/B nuevo no demuestra superioridad general: B mejora 2/5, empata 3/5 y baja tipografía 18,9
  puntos en `professional-app`.
- Linux no verificado (WSL sin distribución); macOS no se declara compatible.
- Freebuff y Claude Code siguen sin verificación autónoma en esta máquina.
- Revisión artística humana pendiente.

## 1.0.0-rc.1 · 2026-11-26

Release candidate sobre 0.6. No se reconstruyó el proyecto ni se eliminó ninguna capacidad.

### Añadido

- **Evidencia 1.0-rc**: cinco proyectos nuevos (landing premium, aplicación de escritorio,
  interfaz cinematográfica de juego, escena 3D interactiva y motion graphics) medidos A/B con
  referencias CC0 independientes. Cuatro pasan los gates; el quinto se publica como rechazo.
- **Fidelidad temporal 76,6/100** (0.6: 59,2), con cortes a 1,84 y 3,84 s frente a 2,00 y
  4,00 s de la referencia y F1 de cortes 0,8.
- **A/B real con Codex** en dos directorios limpios, con la misma tarea, modelo y sandbox. Se
  registran las invocaciones de herramientas y el resultado, incluido que B puntuó por debajo
  de A en el proxy estructural.
- **Prueba de procesos huérfanos**: un timeout deja el hijo muerto y la lista de hijos vivos
  vacía; el código de salida es 124.
- Guía de agentes sin activación automática y nota de aprobación MCP de `codex exec`.
- Auditoría de dependencias y licencias, y revisión de secretos y rutas personales en archivos
  públicos.

### Corregido

- **Detección de agentes 6,6 s → 1,0 s**: `maex` es un lanzador interactivo; ejecutarlo abría una
  sesión y agotaba el timeout. Ahora se localiza en PATH y no se ejecuta, igual que Cursor y
  Freebuff. Se añadió caché de PATH para no repetir sondas.
- **Un timeout se informaba como código 1**: un `SIGKILL` deja `code` en `null`. Ahora se
  distingue 124 de un fallo real del binario.
- **EPIPE en stdin**: si el hijo muere antes de leer la entrada, el error no se capturaba y podía
  tumbar el proceso.
- Rutas absolutas personales en el metadato de referencias de 0.6; ahora son relativas.
- `AGENTS.md` declaraba 39 comandos CLI; son 47.

### Cambiado

- Versión `1.0.0-rc.1` en paquete, servidor MCP, manifiesto de instalación y salidas de
  activación, contexto, seguridad y consumo (esquema `1.0`).
- README reescrito con evidencias visuales, agentes verificados y límites explícitos.
- Documentación de agentes e instalación renombrada a `docs/AGENTES.md` y `docs/INSTALACION.md`.

### Conservado

58 efectos, 15 estilos, 20 composiciones, 44 herramientas MCP, 47 comandos CLI y las 62 pruebas
anteriores. Suite: **63/63** en 221 s, código de salida 0.

### Límites de esta RC

- Sólo Windows ejecutado; Linux/macOS preparados y no verificados.
- Una alerta alta de `npm audit` en `zod` 3 (el SDK de MCP no admite zod 4); documentada, no
  ocultada.
- Aprobación artística humana pendiente; el proxy de composición penalizó una página válida.
- Sin publicar en GitHub ni `git push`.

## 0.6.0 · 2026-11-25

### Añadido

- **Universal Installer**: detección real de nueve agentes, plan sin escritura,
  instalación con respaldos y manifiesto, actualización, reparación,
  desinstalación y verificación MCP por stdio.
- **Compatibilidad**: Codex, Claude Code, Cursor, Gemini CLI, Freebuff, OpenCode,
  MAEX (diseñado), Ollama y clientes MCP genéricos, con formatos reales.
- **Perfiles** `lite`, `professional` y `cinematic`: capacidades y presupuestos,
  sin imponer estética.
- **Activación inteligente** con señales, confianza, opt-out y mecanismo real por
  agente.
- **Contabilidad de tokens** que separa `reported`, `estimated` y `unavailable`.
- **Auditoría de seguridad** local y API restringida a loopback por defecto.
- Herramientas MCP `visual_agents`, `visual_install`, `visual_profile`,
  `visual_activation`, `visual_security` y `visual_usage` (44 en total).
- CLI `agents`, `install`, `uninstall`, `repair`, `profile`, `activation`,
  `security` y `usage`.
- Rutas API de agentes, perfiles, instalación, activación, seguridad y consumo.
- Evidencia A/B de **siete** casos, incluidos dos con referencias locales
  independientes del MET. Los siete pasan los gates sin relajarlos.

### Corregido

- El debugger leía `linear` para toda animación CSS; ahora lee la curva real.
- El A/B medía FPS después de la inteligencia; ahora el gate recibe FPS reales.
- Paleta derivada de la referencia con contraste WCAG; HUD y 3D usan tokens en
  lugar de colores fijos.
- Detección de lanzadores `.cmd` en Windows (Cursor, OpenCode, Freebuff).
- El auditor de seguridad se detectaba a sí mismo.
- La detección con timeout dejaba abiertas las tuberías de un proceso nieto; la
  suite terminaba sus 62 pruebas pero el proceso no salía. Ahora se cierran.

### Conservado

58 efectos, 15 estilos, 20 composiciones, 45 pruebas anteriores y las interfaces
CLI/MCP/API. Suite: 62/62.

## 0.5.0

Visual Critic, Debugger, Fidelity Engine, Smart Effects, Gates, contexto
selectivo y loop con reversión.

## 0.4.0

Art Director, Reference-to-Design, Motion Director y 20 composiciones.

## 0.3.0

58 efectos, composición, Reference-to-Effects, OCR/visión local y galería.

## 0.2.0 y 0.1.0

Base de análisis, captura, comparación e iteración con reversión.
