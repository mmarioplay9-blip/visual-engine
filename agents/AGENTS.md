# Visual Engine · instrucciones para agentes

Este proyecto tiene instalado **Visual Engine 0.3**: un motor local que mide, compone y verifica
calidad visual. No es una guía de estilo: ejecuta herramientas reales y devuelve evidencia.

## Cuándo usarlo

Úsalo siempre que el usuario pida diseño, animación, 3D, HUD, vídeo, efectos, composición o
mejorar un resultado visual. No lo uses para tareas sin componente visual.

## Ciclo obligatorio

1. **Comprobar** antes de prometer:
   `ve doctor --json`, `ve vision status --json` y `ve effects list --json`.
   Si falta ffmpeg, Playwright, Tesseract u Ollama, dilo y no simules esa capacidad.
2. **Descomponer la referencia**:
   `ve analyze`, `ve timeline`, `ve motion`, `ve inspect`, `ve detect`.
   Para OCR/visión: `ve spec <ref> --vision --out <dir>` (escribe `ocr.json` y `semantic.json`).
3. **Especificar y reconstruir**:
   `ve spec <ref> --out <dir>` y `ve refeffects <ref> --spec <dir>/spec.json --out <dir>`.
   Las correspondencias son hipótesis con estado y confianza; no son identificaciones exactas.
4. **Componer o aplicar**:
   `ve compose <composition.json> --out <dir>` para capas/mezclas/máscaras/curvas;
   `ve effects apply <id> --out <dir>` para una receta. La biblioteca tiene 58 efectos.
5. **Capturar y revisar**:
   `ve capture <url|html> --serve <carpeta> --frames 6 --json`.
   Revisa `consoleErrors` y `errors`. Después `ve review ... --frames 6` y, con dos vídeos,
   `ve temporal <ref> <resultado>`.
6. **Iterar con red**: prepara el cambio y usa `ve iterate --replace` o `--patch`. El motor
   copia, mide y revierte si empeora. No edites a mano sin copia.

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
- No inventes cifras: usa `review.json`, `benchmark.json`, `spec.json` o la salida de la herramienta.
- Si no hay OCR/modelo, el resultado correcto es "no disponible", no una descripción inventada.
- Una puntuación automática no es un juicio artístico humano.
- El repositorio no se publica en GitHub en esta fase.

## Herramientas MCP

**26 herramientas**. Las 0.1: `visual_doctor`, `visual_analyze`, `visual_extract_frames`,
`visual_capture`, `visual_compare`, `visual_review`, `visual_effects_list`,
`visual_effect_get`, `visual_effect_apply`, `visual_adapters`, `visual_scaffold`,
`visual_deps_plan`, `visual_install_deps`. Las 0.2: `visual_timeline`, `visual_camera`,
`visual_inspect`, `visual_effects_detect`, `visual_spec`, `visual_recommend`,
`visual_temporal`, `visual_vision`, `visual_iterate` (confirm=true), `visual_backup`.
Las 0.3: `visual_compose`, `visual_reference_effects`, `visual_gallery`, `visual_benchmark`.

La CLI (28 comandos) y la API local (`ve serve`, `http://127.0.0.1:4747`) ofrecen lo mismo.
La galería (`ve gallery`) es opcional; el núcleo funciona sin interfaz.
