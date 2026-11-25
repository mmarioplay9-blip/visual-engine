# Visual Engine · instrucciones para agentes

Este proyecto tiene instalado **Visual Engine 0.2**: un motor local que mide y mejora la calidad
visual de lo que produces. No es una guía de estilo: ejecuta herramientas reales y devuelve
evidencia.

## Cuándo usarlo

Úsalo siempre que el usuario pida diseño, animación, 3D, HUD, vídeo, "que se vea profesional"
o mejorar un resultado visual. No lo uses para tareas sin componente visual.

## Ciclo obligatorio

1. **Comprobar** antes de prometer:
   `ve doctor --json` y `ve vision status --json`.
   Si falta ffmpeg, Playwright, Tesseract u Ollama, dilo y no simules esa capacidad.
2. **Descomponer la referencia** (imagen o vídeo):
   - `ve analyze <ref> --samples 12 --json` → color, luz, movimiento, cortes.
   - `ve timeline <ref> --out <dir> --storyboard` → escenas y fotogramas clave.
   - `ve motion <ref> --json` → paneo, zoom, aceleración, transiciones.
   - `ve inspect <ref> --json` → composición, formas, texto (estimado), profundidad (estimada).
   - `ve detect <ref> --json` → efectos con confianza y estado.
3. **Especificar**: `ve spec <ref> --out <dir>` y `ve recommend --spec <dir>/spec.json --out <dir>`.
   Usa la paleta, la composición y los efectos medidos; no inventes otros.
4. **Construir** con una base intencionada (`ve effects apply`) y capturar:
   `ve capture <url|html> --serve <carpeta> --frames 6 --json`.
   Revisa `consoleErrors` y `errors`.
5. **Comparar**: `ve review ... --frames 6` y, si hay dos vídeos, `ve temporal <ref> <resultado>`.
   Aplica sólo las correcciones que suban fidelidad **y** calidad; muestra ambas cifras.
6. **Iterar con red**: prepara el cambio y usa `ve iterate --replace` o `--patch`. El motor
   copia, mide y revierte si empeora. No edites a mano sin copia.

## Cómo leer los estados

- `verified`: la señal se midió (halo, nitidez, partículas en movimiento, viñeta, cortes).
- `estimated`: hay proxy, no certeza (texto sin OCR, objetos por saliencia, profundidad,
  parallax, reflejos, glitch, distorsión).
- `available:false`: falta herramienta/modelo. Devuelve el motivo, no lo rellenes.

## Reglas de calidad

- **Nada de diseños planos** si piden calidad avanzada: profundidad, jerarquía, foco y detalle.
- **Una idea visual por pantalla**; quita lo que no suba la medición.
- **Respeta la referencia** por encima del gusto: paleta, contraste, composición y ritmo.
- **Rendimiento**: DPR ≤ 2, un canvas, pausa con `document.hidden`, `prefers-reduced-motion`.
- **Accesibilidad**: contraste, foco visible, texto alternativo.
- **Sin recursos externos** por defecto (CDNs, fuentes, stock dudoso).

## Licencias

GSAP Club no; Remotion no es MIT; React Bits CC-BY exige atribución; FFmpeg según build;
Three.js/Motion/Playwright son permisivas. No instales nada de pago.

## Honestidad

- No declares un módulo funcionando sin ejecutar su comando y ver la salida.
- Distingue implementado, medido, estimado y pendiente.
- No inventes cifras: usa `review.json`, `spec.json` o la salida de la herramienta.
- Si no hay OCR/modelo, el resultado correcto es "no disponible", no una descripción inventada.

## Herramientas MCP

Las 13 de 0.1 (`visual_doctor`, `visual_analyze`, `visual_extract_frames`, `visual_capture`,
`visual_compare`, `visual_review`, `visual_effects_list`, `visual_effect_get`,
`visual_effect_apply`, `visual_adapters`, `visual_scaffold`, `visual_deps_plan`,
`visual_install_deps`) y las 10 de 0.2: `visual_timeline`, `visual_camera`, `visual_inspect`,
`visual_effects_detect`, `visual_spec`, `visual_recommend`, `visual_temporal`, `visual_vision`,
`visual_iterate` (confirm=true) y `visual_backup`.

La CLI y la API local (`ve serve`, `http://127.0.0.1:4747`) ofrecen lo mismo.
