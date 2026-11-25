# Capacidades: implementado, verificado y pendiente

Fecha de la verificación: 2026-11-25 · Windows 11 · Node 26.13.1 · ffmpeg 9.1 · Playwright 1.65.1.

"Creado" no es "verificado". Esta tabla separa lo que se ejecutó de lo que sólo está diseñado.

## Núcleo visual

| Requisito | Implementación | Verificación |
| --- | --- | --- |
| Analizar imágenes y vídeos de referencia | `analyzeFile` con FFprobe/FFmpeg | Referencia 540×960, 3.00 s, 30 fps, 90 fotogramas leídos correctamente |
| Extraer fotogramas | `ve frames` | 4 PNG reales verificados por cabecera PNG |
| Estudiar movimiento | Curva de diferencia en luminancia | Movimiento 0.045 en la referencia; la demo midió 0.016 |
| Estudiar colores | Paleta por histograma 4 bits + fusión | Paleta de referencia: turquesa, ámbar, azules profundos |
| Estudiar composición | Masas por cuadrante + densidad de bordes | Incluido en el perfil; no se usa aún para recomendaciones específicas |
| Estudiar transiciones | Detector de escenas de FFmpeg | 2 cortes detectados en 1.00 s y 2.00 s |
| Identificar efectos visuales | No implementado (requiere visión semántica) | **Pendiente** |
| Reproducir efectos | Biblioteca + adaptadores | 6 efectos aplicados con sintaxis JS válida |
| Generar animaciones | Efectos CSS/Canvas/GSAP/WAAPI | Demo con GSAP + Three.js capturada sin errores JS |
| Generar partículas | `particle-nebula`, demo Three.js | Shader compilado en Chromium durante la captura |
| Generar iluminación | Degradados, aurora, foco y bandas | Medido en luminancia/contraste de la captura |
| Generar shaders | `ShaderMaterial` GLSL en Three.js | Renderizado en la demo; sin errores de consola |
| Generar gráficos 3D | Three.js (anillos y partículas) | Verificado en capturas |
| Biblioteca reutilizable | 6 recetas con parámetros | Listadas, aplicadas y comprobadas |
| Ejecutar el proyecto | Playwright + servidor estático | [`api.test.mjs`](../tests/api.test.mjs) |
| Capturar resultados | PNG por fotograma | 6 capturas por revisión |
| Comparar con la referencia | Perfiles + SSIM/MAE/ΔE + heatmap PNG | Pruebas unitarias y E2E |
| Corregir iterativamente | Informe con correcciones priorizadas | Ciclo real 68.0 → 74.3 → 81.3 |
| Evitar diseños planos | Reglas en skill/instrucciones + métricas | La línea base plana puntuó 68.0; la versión con luz y detalle, 81.3 |

## Interfaces

| Requisito | Estado |
| --- | --- |
| MCP | Implementado y probado con cliente real (`tests/mcp.test.mjs`): 12 herramientas, 1 recurso, 1 prompt |
| CLI | Implementado: 14 comandos, probado |
| API local | Implementado: 13 rutas, probado; instalación bloqueada por defecto |
| Skills | `skills/visual-engine/SKILL.md` + copia por `ve init` |
| Instrucciones de agentes | `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, regla de Cursor |
| Independiente del modelo | Sí: no hay SDK de modelo ni clave; todo es local |
| Windows / Linux / macOS | Diseñado multiplataforma; **probado sólo en Windows** |
| Instalación automática | PowerShell y Bash; ver [VERIFICACION](VERIFICACION.md) |
| Actualización desde GitHub | `ve update` (git pull + install + build); **remoto sin publicar** |

## Herramientas integradas

| Herramienta | Licencia | Estado en esta máquina |
| --- | --- | --- |
| FFmpeg / FFprobe | LGPL/GPL según build | Instalado, usado en todo el flujo |
| Playwright | Apache-2.0 | 1.65.1 + Chromium 1255 |
| Three.js | MIT | 0.170.0, usado en demo |
| GSAP | Estándar gratuito | 3.15.1, usado en demo; sin plugins Club |
| Motion | MIT | 12.43.0 instalado; scaffold generado |
| Remotion | Remotion License (no MIT) | **No instalado**; scaffold y licencia documentados |
| React Bits | MIT / CC-BY | Sin paquete npm; componente propio generado |

## Comparación: qué mide y qué no

Mide: paleta ponderada por superficie, luminancia, contraste, saturación, colorido, densidad de
bordes, movimiento entre fotogramas, cortes, ritmo, y diferencia por píxel (SSIM, MAE, RMSE,
ΔE) con mapa de calor.

**No mide**: tipografía concreta, legibilidad, jerarquía semántica, calidad artística,
correspondencia de objetos, texto correcto ni audio. Tampoco detecta pose, objetos u OCR.

## Límites conocidos

1. **Aspecto**: si la referencia y el resultado no comparten relación de aspecto, el mapa de
   calor se estira; el informe lo advierte y la puntuación de color sigue siendo válida.
2. **Movimiento en gris**: los cambios sólo de matiz puntúan poco. Documentado en el informe.
3. **Resolución de análisis**: 192 px de ancho; suficiente para color y estructura, no para
   leer texto ni evaluar tipografía.
4. **Referencia sintética**: la demo usa un clip generado por código, no material de un cliente.
   Es reproducible y no tiene licencias de terceros.
5. **Corrección manual**: el motor no edita el código del usuario; entrega instrucciones al
   agente. La automatización del parcheo queda pendiente por diseño.
6. **Remotion**: no instalado; el primer render descargaría su propio Chromium.
7. **Plataformas**: no se ha ejecutado en Linux ni macOS.
8. **Publicación**: el repositorio no está en GitHub; los instaladores requieren `-Repo`/`VE_REPO`.
9. **Idioma**: interfaz, informes e instrucciones en español; los identificadores de código en inglés.

## Pendiente por fases

- Fase 2: corrección automática de código con verificación, extracción de paleta por regiones,
  comparación de tipografía, análisis de audio y subtítulos.
- Fase 3: publicación, CI multiplataforma, catálogo firmado de efectos, integración con
  Remotion y React Bits verificada en un proyecto React real.
