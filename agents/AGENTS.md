# Visual Engine · instrucciones para agentes

Este proyecto tiene instalado **Visual Engine**: un motor local que mide y mejora la calidad
visual de lo que produces. No es una guía de estilo: ejecuta herramientas reales.

## Cuándo usarlo

Úsalo siempre que el usuario pida diseño, animación, 3D, HUD, vídeo, "que se vea profesional"
o mejorar un resultado visual. No lo uses para tareas sin componente visual.

## Ciclo obligatorio

1. **Comprobar** antes de prometer:
   `ve doctor --json`
   Si falta `ffmpeg` o los navegadores de Playwright, dilo y no simules la captura.
2. **Medir la referencia** (imagen o vídeo):
   `ve analyze <referencia> --samples 10 --json`
   Anota paleta, luminancia, contraste, saturación, colorido, densidad de bordes,
   movimiento y cortes. Son los objetivos numéricos.
3. **Partir de una base con intención**, no de un div vacío:
   `ve effects list` y `ve effects apply <id> --out <proyecto> [--set clave=valor]`
   Adapta los parámetros a la paleta medida.
4. **Generar y capturar**:
   `ve capture <url|html> --serve <carpeta> --width 540 --height 960 --frames 6 --json`
   Revisa `consoleErrors` y `errors`: un diseño bonito con errores JS no está terminado.
5. **Revisar contra la referencia**:
   `ve review --reference <ref> --target-dir <carpeta> --target index.html --frames 6`
   Aplica sólo las correcciones priorizadas y repite. Muestra la puntuación antes y después.

## Reglas de calidad

- **Nada de diseños planos** si el usuario pide calidad avanzada: fondo con profundidad,
  jerarquía tipográfica real, un foco de luz y micro-detalle (grano, retícula, partículas finas).
- **Una idea visual por pantalla.** No acumules efectos: si un efecto no sube la fidelidad
  ni la legibilidad, se quita.
- **Respeta la referencia** por encima de tu gusto: paleta, contraste y ritmo se copian;
  la creatividad va en la ejecución, no en cambiar los objetivos.
- **Rendimiento**: DPR máximo 2, un solo canvas, pausar animaciones con `document.hidden`,
  respetar `prefers-reduced-motion`.
- **Accesibilidad mínima**: contraste de texto suficiente, foco visible, texto alternativo.
- **Nada de recursos externos** por defecto: sin CDNs, sin fuentes de Google, sin imágenes
  de stock con licencia dudosa.

## Licencias (no las ignores)

- GSAP: núcleo y plugins públicos gratis; los de Club GSAP son de pago.
- Remotion: gratis para individuos y equipos pequeños, **no es MIT**.
- React Bits: componentes MIT o CC-BY (atribución obligatoria en CC-BY). No hay paquete npm oficial.
- Three.js, Motion, Playwright: MIT/Apache. FFmpeg: LGPL/GPL según el binario.

## Honestidad

- No declares un módulo "funcionando" sin haber ejecutado su comando y visto la salida.
- Distingue siempre **implementado**, **medido** y **pendiente**.
- Si una comparación no aplica (por ejemplo, referencia en vídeo y resultado en imagen),
  dilo en vez de inventar una puntuación.
- Nunca inventes cifras: usa las que devuelve `review.json`.

## Herramientas MCP

`visual_doctor`, `visual_analyze`, `visual_extract_frames`, `visual_capture`,
`visual_compare`, `visual_review`, `visual_effects_list`, `visual_effect_get`,
`visual_effect_apply`, `visual_adapters`, `visual_scaffold`, `visual_deps_plan`,
`visual_install_deps`.

La CLI y la API local (`ve serve`, `http://127.0.0.1:4747`) ofrecen lo mismo si el cliente
no habla MCP.
