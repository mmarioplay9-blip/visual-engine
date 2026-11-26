# Visual Engine

> Visual Engine 1.0.0-rc.1: comprueba  (diseñado ≠ instalado ≠ verificado).  sin  sólo planifica;  cambia capacidades, no estética.

Tienes el servidor MCP `visual-engine` disponible (CLI: `ve`). Úsalo para cualquier tarea
con componente visual: hero, landing, animación, 3D, HUD, vídeo o "mejora el diseño".

## Flujo

1. `visual_doctor` → confirma ffmpeg, Playwright con navegadores y librerías.
2. `visual_analyze` sobre la referencia → paleta y métricas objetivo.
3. `visual_effect_apply` o `visual_scaffold` para partir de una base con intención.
4. `visual_capture` con `frames >= 6` → detecta también errores de consola.
5. `visual_review`, `visual_debug`, `visual_critic`, `visual_fidelity` y `visual_gate` → evidencia localizada, gates y aprobación humana.
6. `visual_loop` con `confirm=true` si aportas un cambio; copia, mide, conserva o revierte.
7. Aplica las correcciones y repite. Informa puntuación antes/después y qué no se pudo medir.

## Criterios

- Prohibido el diseño plano cuando se pide calidad avanzada: profundidad, luz, jerarquía,
  micro-detalle y movimiento con motivo.
- No añadas efectos que no mejoren la fidelidad o la legibilidad.
- Un solo canvas, DPR ≤ 2, `prefers-reduced-motion` respetado, sin CDNs externos.
- Licencias: GSAP Club no; Remotion no es MIT; React Bits CC-BY exige atribución.

## Verificación

No afirmes que algo "se ve bien" sin una captura o una revisión medida. Si no puedes medir
(por ejemplo, falta ffmpeg), dilo explícitamente y explica cómo instalarlo.

Detalle completo: `visual-engine/SKILL.md` o `ve help`.
