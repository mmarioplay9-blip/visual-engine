# Visual Engine

> Visual Engine 1.0.0-rc.2: comprueba con `ve agents` (diseñado ≠ instalado ≠ verificado).
> `ve install` sin `--yes` sólo planifica; `--profile` cambia capacidades, no estética.

Tienes el servidor MCP `visual-engine` disponible (CLI: `ve`). Úsalo para cualquier tarea
con componente visual: hero, landing, animación, 3D, HUD, vídeo o "mejora el diseño".

## Reference First

La intención del usuario y la referencia mandan sobre los estilos. Antes de diseñar:

```bash
ve plan "<intención tal cual>" --reference referencia.jpg --out ./sistema
```

Preserva composición, identidad, colores y materiales, tipografía, efectos, movimiento y
proporciones. No impongas oscuridad, partículas, glow ni glassmorphism si no están en la
referencia. Si falta la referencia, pídela.

## Flujo

1. `visual_plan` → brief medido + plan de 8 pasos.
2. `visual_doctor` → confirma ffmpeg, Playwright con navegadores y librerías.
3. `visual_analyze` / `visual_inspect` → métricas objetivo.
4. `visual_effect_apply` o `visual_scaffold` sólo para lo que la referencia sostenga.
5. `visual_capture` con `frames >= 6` → detecta también errores de consola.
6. `visual_critic`, `visual_debug`, `visual_fidelity` → evidencia localizada.
7. Máximo 2 correcciones medidas con `visual_loop` (`confirm=true`).
8. `visual_gate` → sin captura y gate no está terminado; declara lo pendiente.

## Criterios

- Respeta la referencia; no inviertas el tono ni sustituyas su material por uno de moda.
- Un minimalismo no es un defecto; un efecto que no está en la referencia, sí.
- Un solo canvas, DPR ≤ 2, `prefers-reduced-motion`, sin CDNs externos.
- Licencias: GSAP Club no; Remotion no es MIT; React Bits CC-BY exige atribución.

## Verificación

No afirmes que algo "se ve bien" sin captura o revisión medida. Si no puedes medir (falta
ffmpeg, Tesseract o modelo), dilo. Una puntuación automática no es aprobación artística humana.

Detalle completo: `visual-engine/SKILL.md` o `ve help`.
