# Capacidades de Visual Engine 0.2

Fecha: 2026-11-25 · Windows 11 · Node 26.13.1 · FFmpeg 9.1 · Playwright 1.65.1.

Tres estados, sin mezclarlos:

- **Verificado**: se ejecutó y se comprobó el resultado con una prueba o una medición.
- **Estimado**: hay una señal medida, pero la interpretación es un proxy; se devuelve como
  `estimated` con su evidencia.
- **No disponible**: falta una herramienta o un modelo; se devuelve el motivo exacto.

## Análisis de referencia

| Requisito | Implementación | Estado |
| --- | --- | --- |
| Fotogramas clave y escenas | `timeline.ts` + detector FFmpeg + barrido RGB | **Verificado**: 3 escenas, cortes 0,87/1,60 s, 8 claves y 8 PNG |
| Línea temporal con métricas | muestras por tiempo, luma, contraste, movimiento, ritmo | **Verificado** |
| Objetos | regiones salientes por contraste/saturación | **Estimado**: no hay etiqueta semántica ni cajas de clase |
| Texto | regiones por componentes de luminancia | **Estimado**: localiza LUMEN; sin OCR no lee |
| OCR | Tesseract por CLI | **No disponible** en esta máquina; adaptador implementado |
| Formas | Hough de círculos por gradiente + líneas por proyección | **Verificado**: anillo r=30, confianza 94 % |
| Composición | tercios, equilibrio, simetría, espacio negativo, horizonte, ángulo dominante | **Verificado** (medidas geométricas) |
| Profundidad | proxy de nitidez local + gradiente vertical | **Estimado**: 3 capas, no distancias |
| Movimiento de cámara | correlación de traslación + hipótesis de escala/rotación | Paneo y zoom **verificados**; rotación **no verificada** |
| Aceleración, temblor, velocidad | derivadas de la serie de desplazamiento | **Verificado** |
| Transiciones | cortes con FFmpeg+RGB; fundido/barrido por umbral | Cortes **verificados**; resto **estimado** |
| Glow / bloom | halo alrededor de zonas claras | Señal **verificada**, etiqueta interpretada |
| Partículas | motas de contraste local + movimiento entre fotogramas | **Verificado**: 70 partículas sintéticas detectadas |
| Blur / bokeh | varianza del laplaciano global y centro/borde | **Verificado** en el clip; sin falso positivo en UI |
| Parallax | desplazamiento por franjas | **Estimado** |
| Glitch | desplazamiento R/B + saltos de fila | **Estimado** |
| Iluminación | viñeta centro/esquinas | **Verificado** |
| Reflejos | simetría vertical bajo un eje | **Estimado** (simetría medida) |
| Distorsión | residuo de desplazamiento por franjas | **Estimado** |
| Grano | ruido temporal en zonas planas | **Verificado** (nivel de ruido) |
| Ollama local | `/api/tags` y `/api/generate` en localhost | Servicio **verificado**; descripción **no ejecutada** (0 modelos de visión) |
| OpenCV / MediaPipe | no se usan | **No instalados**; sustituidos por JS propio |

## Especificación y reproducción

| Requisito | Implementación | Estado |
| --- | --- | --- |
| Especificación estructurada | `spec.ts`: escenas, paleta con roles, composición, tipografía estimada, capas, cámara, efectos, stack, verificación | **Verificado** (JSON+MD) |
| Tecnología por efecto | `recommend.ts` con 10 efectos | **Verificado** |
| Código de implementación | snippets CSS/JS/GLSL con parámetros medidos | JS **validado con `node --check`**; CSS/GLSL no compilados |
| Reproducir efectos | biblioteca de 6 recetas + snippets | **Verificado** (aplicación y captura) |

## Comparación y corrección

| Requisito | Implementación | Estado |
| --- | --- | --- |
| Comparación temporal | `temporal.ts`: tiempo normalizado, curvas, cortes, deriva | **Verificado** (88,3/100 A en UI vs alt) |
| Evaluación no sólo de color | `quality.ts`: fidelidad 0,35, composición 0,20, jerarquía 0,15, animación 0,15, fluidez 0,10, rendimiento 0,05 | **Verificado**; el demo baja de 81,3 a 66,5 global |
| Rendimiento | tiempos reales de captura → intervalo, jitter | **Verificado** cuando hay capturas; si no, se excluye |
| Fluidez | jerk de la curva + parpadeo de luminancia | **Verificado** |
| Corrección iterativa | `iterate.ts`: copia SHA-256, revisión antes/después, reversión | **Verificado** (80,6→36,0 revertido; 80,6→90,5 conservado) |
| Parche del agente | `git apply --check` + `git apply` | **Verificado** manualmente en repo temporal |
| Revertir | `ve backup restore` | **Verificado**; archivo idéntico por hash |
| Backup | `.visual-engine/iterations/<id>/backup` + manifiesto | **Verificado** |

## Interfaces

| Requisito | Estado |
| --- | --- |
| MCP | **23 herramientas**, 1 recurso, 1 prompt; probado con cliente stdio real |
| CLI | **24 comandos** con subcomandos; probado |
| API local | **27 rutas** (GET/POST), loopback; instalación bloqueada por defecto |
| Skills | `skills/visual-engine/SKILL.md`; `ve init` la copia al proyecto |
| Instrucciones | `agents/AGENTS.md`; `ve init` genera AGENTS/CLAUDE/GEMINI/Cursor |
| Independencia del modelo | Sí: no hay SDK de modelo; Ollama es opcional y local |
| Windows / Linux / macOS | Diseñado multiplataforma; **probado sólo en Windows** |
| Instalación / actualización | PowerShell/Bash y `ve update`; remoto público **sin publicar** |

## Límites y pendientes

1. **Sin OCR** hasta instalar Tesseract; el texto se localiza, no se lee.
2. **Sin modelo de objetos/pose**: sólo saliencia; no hay clases ni cajas semánticas.
3. **Sin visión local** hasta instalar un modelo en Ollama; no se descarga solo.
4. **Profundidad y parallax** son proxies geométricos, no mapas métricos.
5. **Etiquetas de efectos** interpretan señales; no identifican el shader ni el plugin concretos.
6. **Rotación** de cámara sin referencia de validación.
7. **Referencias sintéticas**: cubren UI, motion graphics y 3D esquemático, no material real de
   cliente con licencia.
8. **Temporal** exige dos vídeos; una secuencia de capturas se evalúa en `review`, con otra
   alineación.
9. **Corrección**: el agente aporta el cambio; el motor lo aplica, mide y revierte, pero no
   inventa la solución.
10. **Plataformas**: sin pruebas en Linux/macOS.
11. **Publicación**: el repositorio no está en GitHub en esta fase.

## Cómo se evita el autoengaño

- Cada detección devuelve `status`, `confidence` y `evidence` numérica.
- Los textos, objetos y profundidad llevan `estimated` y el método en el resultado.
- Si falta Tesseract/Ollama, se devuelve `available:false` con el motivo; no se rellena.
- La calidad global renormaliza cuando una dimensión no tiene datos (p. ej. rendimiento).
- Los tests exigen resultados concretos: cortes, zoom>1,0, texto localizado, partículas con
  movimiento, snippets válidos, reversión por hash.
