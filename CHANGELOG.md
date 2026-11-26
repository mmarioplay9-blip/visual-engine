# Changelog

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
