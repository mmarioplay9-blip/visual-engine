# Visual Engine · instrucciones para agentes

Este proyecto tiene instalado **Visual Engine 0.5**: un motor local que dirige arte, critica,
depura, mide, compone y verifica calidad visual. No es una guía de estilo: ejecuta herramientas
reales y devuelve evidencia.

## Cuándo usarlo

Úsalo siempre que el usuario pida diseño, animación, 3D, HUD, vídeo, efectos, composición o
mejorar un resultado visual. No lo uses para tareas sin componente visual.

## Ciclo obligatorio

0. **Pedir contexto, no el catálogo**: `ve context "<tarea>" --max-recipes 3`. No cargues los 58
   efectos ni toda la documentación; pide una receta concreta con `ve effects show <id>`.
1. **Comprobar** antes de prometer:
   `ve doctor --json`, `ve vision status --json` y `ve effects list --json`.
   Si falta ffmpeg, Playwright, Tesseract u Ollama, dilo y no simules esa capacidad.
2. **Descomponer la referencia**:
   `ve analyze`, `ve timeline`, `ve motion`, `ve inspect`, `ve detect`.
   Para OCR/visión: `ve spec <ref> --vision --out <dir>` (escribe `ocr.json` y `semantic.json`).
3. **Dirigir el arte y el movimiento**:
   `ve art "brief" --style <id> --out <dir>`, `ve refdesign <ref> --out <dir>`,
   `ve motiondirector --style <id> --out <dir>` y `ve showcase --measure`.
   Usa tokens y escala; no inventes la fuente original ni la arquitectura de componentes.
4. **Especificar y reconstruir**:
   `ve spec <ref> --out <dir>` y `ve refeffects <ref> --spec <dir>/spec.json --out <dir>`.
   Las correspondencias son hipótesis con estado y confianza; no son identificaciones exactas.
5. **Componer o aplicar**:
   `ve compose <composition.json> --out <dir>` para capas/mezclas/máscaras/curvas;
   `ve effects apply <id> --out <dir>` para una receta. La biblioteca tiene 58 efectos.
6. **Capturar, depurar y revisar**:
   `ve capture <url|html> --serve <carpeta> --frames 6 --json`.
   Revisa `consoleErrors` y `errors`. Después `ve debug`, `ve critic`, `ve fidelity` y
   `ve gate`; con dos vídeos, `ve temporal <ref> <resultado>`. Un defecto crítico bloquea
   aunque la media sea alta; `--require-human` exige aprobación artística.
7. **Iterar con red**: prepara el cambio y usa `ve loop` o `ve iterate` con `--replace`/`--patch`.
   El loop copia, mide, compara y revierte si no mejora; respeta iteraciones, minutos y tokens
   estimados. No edites a mano sin copia ni inventes un cambio para el loop.

## Cómo leer los estados

- `verified`: la señal se midió (halo, nitidez, partículas, cortes, luz, OCR).
- `estimated`: hay proxy, no certeza (objetos, profundidad, parallax, glitch, transiciones suaves).
- `available:false`: falta herramienta/modelo. Devuelve el motivo, no lo rellenes.
- En Reference-to-Effects, muestra `status`, `confidence` y `warnings`; no ocultes la hipótesis.

## Reglas de calidad

- **Nada de diseños planos** si piden calidad avanzada: profundidad, jerarquía, foco y detalle.
- **Una idea visual por pantalla**; quita lo que no suba fidelidad, calidad o legibilidad.
- **Respeta la referencia** por encima del gusto: paleta, contraste, composición y ritmo.
- **No añadas efectos** sólo para subir una puntuación; explica las dimensiones bajas.
- **Rendimiento**: DPR ≤ 2, un canvas, pausa con `document.hidden`, `prefers-reduced-motion`.
- **Accesibilidad**: contraste, foco visible, texto alternativo, `role="img"` en composiciones.
- **Sin recursos externos** por defecto (CDNs, fuentes, stock dudoso).

## Licencias

GSAP Club no; Remotion no es MIT; React Bits CC-BY exige atribución; FFmpeg según build;
Three.js/Motion/Playwright son permisivas. No instales nada de pago.

## Honestidad

- No declares un módulo funcionando sin ejecutar su comando y ver la salida.
- Distingue implementado, medido, estimado y pendiente.
- No inventes cifras: usa `review.json`, `benchmark.json`, `spec.json`, `measurements.json`, `ab-metrics.json` o la salida de la herramienta.
- En Reference-to-Design, `confirmed` es medición y `estimated` es hipótesis. No los mezcles.
- La rotación se validó en patrón sintético y en una escena Three.js real; no certifica cualquier WebGL.
- El A/B de vídeo de 0.5 usa un montaje derivado de una obra CC0, no una pieza externa; el 56,9/100 se publica.
- Los gates por defecto del A/B rechazan los cinco casos; no los relajes para convertirlos en aprobados.
- El presupuesto de tokens del loop es estimado (caracteres/4), no telemetría del proveedor.
- Si no hay OCR/modelo, el resultado correcto es "no disponible", no una descripción inventada.
- Una puntuación automática no es un juicio artístico humano; la aprobación final es humana.
- El repositorio no se publica en GitHub en esta fase.

## Herramientas MCP

**38 herramientas**. Las 0.5: `visual_context`, `visual_debug`, `visual_critic`,
`visual_fidelity`, `visual_gate`, `visual_smart_effects`, `visual_loop`, `visual_loops`; además
de `visual_art_direction`, `visual_reference_design`, `visual_motion_director`,
`visual_showcase`, `visual_compose`, `visual_reference_effects`, `visual_benchmark`,
`visual_iterate` (confirm=true), etc.

La CLI (39 comandos) y la API local (`ve serve`, `http://127.0.0.1:4747`) ofrecen lo mismo.
La galería (`ve gallery`) es opcional; el núcleo funciona sin interfaz.
