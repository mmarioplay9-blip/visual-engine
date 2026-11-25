# Capacidades de Visual Engine 0.4

Fecha: 2026-11-25 · Windows 11 · Node 26.13.1 · FFmpeg 9.1 · Playwright 1.65.1 ·
Tesseract 5.4 · Ollama con `llava:7b` · RTX 4060 Ti (16.380 MB VRAM).

Tres estados, sin mezclarlos:

- **Verificado**: se ejecutó y se comprobó el resultado con una prueba o una medición.
- **Estimado**: hay una señal medida, pero la interpretación es un proxy; se devuelve como
  `estimated` con su evidencia.
- **No disponible**: falta una herramienta o un modelo; se devuelve el motivo exacto.

## 0.4 · Art Director, Reference-to-Design y composiciones

| Requisito | Implementación | Estado |
| --- | --- | --- |
| 15 estilos | perfiles con composición, tipografía, materiales, motion, efectos y anti-patrones | **Verificado** 15/15, contraste y tokens |
| Identidad y tokens | DTCG, paleta semántica, escala modular, espaciado, sombras y CSS | **Verificado**; el sistema se renderiza |
| Reference-to-Design | imagen/vídeo → identidad, layout, capas, componentes, motion y código | **Verificado** con cartel CC0; `confirmed` vs `estimated` |
| Tipografía | fuentes OFL locales, escala, tracking, line-height y responsive | **Verificado**; familia original no identificada |
| Motion Director | 6 recetas, 3 cámaras, CSS/GSAP/Motion One, reduced-motion | **Verificado**; curva y rotación medida |
| 20 composiciones | 10 arquetipos, 15 estilos, efectos existentes | **Verificado** 20/20 en Chromium |
| CLI/MCP/API | `art`, `refdesign`, `motiondirector`, `showcase` en las tres capas | **Verificado** por pruebas y smoke tests |

Medición de las composiciones: **61 FPS medianos, mínimo 43, 0 violaciones de contraste en 619
textos, 0 overflow, reduced-motion respetado**. Nocturne es el mínimo por bloom + grano.

### A/B con referencia CC0

Mismo agente, mismas instrucciones, mismo presupuesto y mismo copy; dos páginas estáticas
capturadas a 1280×800. Referencia: *Moulin Rouge: La Goulue*, MET, CC0.

| Dimensión | A genérica | B Art Director |
| --- | ---: | ---: |
| Coherencia | 0,0 | **98,1** |
| Tipografía | 92,7 | **100,0** |
| Accesibilidad | 91,1 | **97,7** |
| Calidad total | 59,8 | **76,4** |

La composición baja de 96,8 a 93,5 y se publica. La referencia es estática: no se usa para
afirmar una mejora de transiciones contra vídeo. Evidencia en `docs/evidencia/0.4/ab/`.

## 0.3 · Inteligencia visual

| Requisito | Implementación | Estado |
| --- | --- | --- |
| Tesseract OCR | CLI del sistema, detección de ruta y versión | **Verificado** 5.4; texto nítido 96,4 % de confianza |
| OCR sobre render real | fotograma → `tesseract tsv` | **Verificado** 2 líneas; «REMOTION - RENDER REAL» 81,1 % |
| VRAM y RAM | `nvidia-smi` + `os.totalmem` | **Verificado** 16.380 MB VRAM, 31,8 GB RAM |
| Selección de modelo | catálogo por VRAM y calidad, tags exactos | **Verificado** elige `llava:7b` en esta máquina |
| Descripción semántica | Ollama `/api/generate` con imagen | **Verificado** con `llava:7b`; describe texto, fondo y luz |
| Integración con especificación | `ve spec --vision` escribe `ocr.json` y `semantic.json` | **Verificado** sobre render Remotion |
| Funcionar sin dependencias | errores declarados; el resto sigue | **Verificado** en pruebas y CLI |

Matices: `qwen2.5vl:3b` devolvió tokens repetidos (`@@@@`) con esta versión de Ollama y
`moondream` devolvió texto vacío. Se conservan instalados, pero no se seleccionan. La descripción
de LLaVA confundió parte del copy; no se usa como verdad, sólo como señal auxiliar.

## 0.3 · Biblioteca de efectos

**58 recetas** en 12 categorías, sin contar variaciones de color:

| Categoría | Ejemplos |
| --- | --- |
| Partículas y atmósferas | `dust-motes`, `ember-sparks`, `starfield-warp`, `bokeh-drift` |
| Iluminación y postprocesado | `anamorphic-bloom`, `volumetric-rays`, `lens-flare`, `caustic-light` |
| Shaders GLSL/WebGL | `plasma-flow`, `fractal-tunnel`, `voronoi-cells`, `iridescent-foil` |
| Materiales | `chrome-text`, `glass-refraction`, `frosted-panel`, `holographic-foil` |
| Distorsión y fluidos | `noise-warp`, `ripple-glass`, `heat-haze`, `vortex-twist` |
| Transiciones | `whip-pan`, `zoom-blur`, `iris-wipe`, `glitch-slices` |
| Tipografía | `split-reveal`, `kinetic-title`, `variable-weight`, `scramble-decode` |
| Interactivos | `magnetic-button`, `cursor-spotlight`, `drag-orbit`, `tilt-card-3d` |
| HUD | `radar-sweep`, `target-reticle`, `telemetry-grid`, `waveform-monitor` |
| Fondos | `mesh-gradient`, `aurora-hero`, `circuit-lines`, `dot-matrix` |
| Cámara | `dolly-zoom`, `whip-pan`, `handheld-shake`, `focus-pull` |
| 3D | `cube-field`, `torus-knot`, `wireframe-globe`, `terrain-grid` |

Cada efecto incluye `recipe.json` con parámetros, dependencias, licencia, compatibilidad,
instrucciones de integración, `effect.js` ejecutable, `config.js`, runtime y `index.html`.
Las 6 recetas de 0.1/0.2 se conservan; 52 son nuevas.

**Verificado**: 58/58 aplican y superan `node --check`; 58/58 medidas en Chromium; mediana 60 FPS,
mínimo 39,2 FPS. Dos fallos reales corregidos durante la fase: `circuit-lines` (índice de
segmento indefinido) y `split-reveal` (titular fuera del lienzo y revelado cíclico incompleto).

## 0.3 · Composición

| Requisito | Implementación | Estado |
| --- | --- | --- |
| Capas | hasta 12 capas con efecto, parámetros y opacidad | **Verificado** |
| Timeline | inicio, duración y curvas `linear/easeIn/easeOut/easeInOut/spring` | **Verificado** en render y tests |
| Máscaras | radial y lineal con centro, radio y pluma | **Verificado** |
| Mezclas | 10 modos CSS, con capas superiores transparentes | **Verificado** |
| Parámetros compartidos | paleta, acentos y velocidad comunes | **Verificado** |
| JSON universal | `VEComposition` con validación y procedencia | **Verificado** |
| Render autónomo | HTML + `assets/effects/` + Three.js vendorizado cuando hace falta | **Verificado** |
| Lenguaje natural | el agente escribe el JSON o usa `visual_compose` por MCP | **Verificado** por contrato, no por chat integrado |

## 0.3 · Reference-to-Effects

`ve refeffects` lee una especificación medida y produce composición, timeline, capas, código y
previsualización. Cada correspondencia lleva `status`, `confidence` y una nota que explica la
hipótesis. **No se afirma una identificación exacta de plugin o shader.**

**Verificado** con un render Remotion propio de 3 s, 1280×720:

- 2 señales asignadas (`parallax` estimado 75 %, `lighting` verificado 100 %), 3 capas.
- OCR + LLaVA integrados; texto de la capa tipográfica declarado como OCR.
- Comparación temporal: 77,7/100 (B), fidelidad 93,9; calidad 80,4 (B).
- Límites visibles: tipografía 37,8, coherencia 4,9, transiciones 40,0. El OCR confundió
  «100 % · frame 45» con «10196: frame 18»; no se corrigió a mano.

## 0.3 · Calidad, galería y rendimiento

| Requisito | Implementación | Estado |
| --- | --- | --- |
| Calidad ampliada | 13 dimensiones, pesos renormalizables | **Verificado** |
| Auditoría DOM | contraste, tipografía, canvas, texto alternativo | **Verificado** |
| Galería local | 58 efectos, parámetros, preview, composición y exportación | **Verificado**; opcional |
| Benchmark | FPS, frame time P95, heap JS, carga por efecto | **Verificado** 58/58 |
| Separación arte/métrica | la puntuación no se presenta como juicio artístico | Documentado |

## Integraciones reales

| Herramienta | Evidencia ejecutada | Licencia |
| --- | --- | --- |
| GSAP | timeline de 1,528 s con 5 hijos; demo funcional | estándar, sin Club |
| Three.js | r170; 14.080 triángulos renderizados | MIT |
| Motion | 3 controles animados montados | MIT |
| Remotion | MP4 real de 158 KB, 1280×720, 3 s | licencia Remotion, no MIT |
| React Bits | componente montado en Chromium | MIT/CC-BY con atribución |
| Playwright | capturas, vídeo, auditoría DOM y tests | Apache-2.0 |
| FFmpeg | fotogramas, decodificación, MP4 y comparativa | según build |

Remotion 4.0.547 advierte que el proyecto tiene `zod` 3.25.76 y espera 4.6.7; el render terminó
con código 0. Se documenta como incompatibilidad de versión, no se oculta.

## Interfaces

| Requisito | Estado |
| --- | --- |
| MCP | **30 herramientas**, recurso de efectos y prompt; cliente stdio real |
| CLI | **32 comandos**; incluye `art`, `refdesign`, `motiondirector`, `showcase` |
| API local | mismas operaciones; incluye `/v1/art-direction`, `/v1/reference-design`, `/v1/motion-director`, `/v1/showcase` |
| Skills | `skills/visual-engine/SKILL.md`, actualizada a 0.4 |
| Instrucciones | `agents/AGENTS.md`, actualizadas a 0.4 |
| Independencia del modelo | Sí; no hay SDK de proveedor; Ollama es opcional y local |
| Windows / Linux / macOS | Diseñado multiplataforma; **probado sólo en Windows** |
| Instalación / actualización | PowerShell/Bash y `ve update`; **sin publicar en GitHub** |

## Límites y pendientes

1. **Objetos/pose**: no hay detector semántico; sólo saliencia. No se etiquetan clases.
2. **Profundidad y parallax**: proxies geométricos, no mapas métricos.
3. **Etiquetas de efectos**: interpretan señales; no identifican el shader o plugin concretos.
4. **Rotación de cámara**: validada en magnitud sobre patrón sintético (2°→1,5°, error 0,5°); no certifica cualquier render WebGL.
5. **Transiciones suaves**: curva y reduced-motion verificados; el A/B de transiciones contra vídeo no se ejecutó (la referencia A/B es estática).
6. **OCR**: falla con tipografía decorativa y puede confundir cifras; se declara.
7. **LLaVA**: útil para descripción general, no para leer copy exacto; `qwen2.5vl:3b` falló.
8. **Referencias reales**: se usaron renders propios autorizados (Remotion, GSAP, Three) y un
   cartel CC0 del MET. No hay validación con material de cliente.
9. **Temporal**: exige dos vídeos; la comparación de capturas se hace en `review`.
10. **Plataformas**: sin pruebas en Linux/macOS.
11. **Publicación**: el repositorio no se ha publicado en GitHub en esta fase.
12. **Remotion**: aviso de `zod`; el render funciona, pero la combinación no está certificada.

## Cómo se evita el autoengaño

- Cada detección devuelve `status`, `confidence` y evidencia numérica.
- Texto, objetos y profundidad llevan `estimated` y el método en el resultado.
- Si falta Tesseract/Ollama, se devuelve `available:false` con el motivo.
- Las correspondencias de Reference-to-Effects se marcan como hipótesis y llevan aviso.
- La calidad global renormaliza cuando una dimensión no tiene datos.
- Los tests exigen resultados concretos y fallan ante regresiones de versión o recuento.
