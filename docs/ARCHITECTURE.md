# Arquitectura de Visual Engine

## Principio

Una sola tubería, cuatro contratos y ningún atajo simulado:

```
referencia ──► perfil visual (números)
                     │
proyecto ──► captura real (PNG) ──► perfil visual ──► comparación ──► correcciones
                                                                      │
                                                             el agente corrige
                                                                      │
                                                             nueva medición
```

El motor **no diseña** por sí solo ni aplica cambios al código del usuario. Mide, compara y
entrega instrucciones concretas con artefactos verificables. La decisión creativa sigue siendo
del agente; la verificación deja de ser una opinión.

## Módulos

| Módulo | Responsabilidad | Dependencias |
| --- | --- | --- |
| `core/run.ts` | Ejecutar binarios con `spawn`, sin shell, con timeout y stdout binario | Node |
| `core/media.ts` | FFprobe/FFmpeg: metadatos, muestreo RGB, fotogramas, codificación, barrido y cortes | ffmpeg |
| `core/pixels.ts` | Gris, blur, Sobel, laplaciano, correlación, warp y componentes conexas en JS puro | Node |
| `core/motion.ts` | Traslación, zoom, rotación, aceleración, temblor y transiciones | pixels, media |
| `core/timeline.ts` | Escenas, cortes, fotogramas clave y storyboard | media, analysis |
| `core/inspect.ts` | Composición, círculos/líneas, texto, saliencia y profundidad proxy | pixels |
| `core/effects.ts` | Detección de efectos con evidencia y estado verified/estimated | pixels, util |
| `core/spec.ts` | Especificación visual JSON+Markdown | análisis completo |
| `core/recommend.ts` | Tecnología y snippets por efecto, JS validado | Node |
| `core/vision.ts` | Ollama y Tesseract opcionales, sin APIs externas | run |
| `core/quality.ts` | 13 dimensiones de calidad y pesos renormalizables | compare |
| `core/composition.ts` | JSON universal, validación, capas, tracks, máscaras, mezclas y HTML autónomo | library |
| `core/refeffects.ts` | Señales medidas → efectos de biblioteca, con hipótesis y confianza | spec, composition |
| `core/gallery.ts` | Galería local opcional: efectos, preview y composición | library, composition |
| `core/benchmark.ts` | Banco FPS/frame time/heap/carga por efecto | capture |
| `core/temporal.ts` | Alineación temporal, curvas, cortes y deriva | analysis, quality |
| `core/iterate.ts` | Copia SHA-256, parche, verificación y reversión | review, run |
| `core/advanced.ts` | Operaciones compartidas por CLI, MCP y API para 0.2 y 0.3 | todos |
| `core/analysis.ts` | Métricas por fotograma y perfil visual agregado | media, util |
| `core/compare.ts` | Perfiles: puntuación/paleta/correcciones. Imágenes: SSIM/MAE/ΔE/heatmap | analysis, media |
| `core/capture.ts` | Chromium real, varios fotogramas, errores JS y de red | Playwright |
| `core/library.ts` | Recetas en disco (`recipe.json` + `templates/`), parámetros validados | Node |
| `core/deps.ts` | Registro de herramientas, detección real, plan e instalación npm | run |
| `core/adapters.ts` | Scaffolds de las 7 herramientas + `node --check` | run |
| `core/static.ts` | Servidor estático mínimo para capturar proyectos locales | Node http |
| `core/review.ts` | Orquestador E2E, informe y calidad integrada | todos |
| `core/ops.ts` | Operaciones de 0.1 compartidas por MCP, API y CLI | todos |
| `core/init.ts` | Instrucciones, skills y configuración MCP en el proyecto | Node |
| `mcp/server.ts` | Protocolo MCP por stdio | SDK MCP + zod |
| `api/server.ts` | HTTP local con CORS loopback y escritura bloqueada | Node http |
| `cli/index.ts` | Interfaz `ve` | ops |

## Decisiones

### FFmpeg como capa de imagen, no una librería de imágenes

Todo entra y sale como RGB crudo por tubería (`-f rawvideo -pix_fmt rgb24`). Ventajas:
decodifica cualquier formato, no añade dependencias nativas, funciona igual en las tres
plataformas y permite generar PNG/MP4 reales con el mismo binario que ya se exige. El coste es
una invocación por fotograma y una resolución de muestreo reducida (192 px de ancho por defecto),
suficiente para color, luz y estructura, pero no para leer texto.

### Perfil visual como contrato

```ts
VisualProfile {
  source, kind, width, height, aspect, duration, fps,
  aggregate: { luma, contrast, saturation, colorfulness, edgeDensity, darkRatio },
  palette: [{ hex, rgb, share }],
  motion, motionCurve, cuts, pace, hueHistogram,
  frames: FrameMetrics[],
  warnings: string[]
}
```

Se guarda en JSON. Cualquier consumidor (MCP, API, CLI, CI) puede comparar perfiles sin volver a
decodificar medios. `warnings` impide que una medición parcial se presente como completa.

### Puntuación explicable

Pesos fijos: paleta 0.30, luminancia 0.14, contraste 0.14, saturación 0.10, colorido 0.07,
bordes 0.12, movimiento 0.13 (sólo si ambos son animados). Cada métrica se normaliza con una
tolerancia (`tolerate`); la paleta usa ΔE medio ponderado por superficie y emparejamiento al
color más cercano. No hay caja negra: el informe muestra referencia, resultado, delta y
similitud por métrica, y las recomendaciones se derivan de umbrales explícitos.

### Medición de movimiento en gris

El movimiento se calcula como diferencia absoluta media entre fotogramas consecutivos en
luminancia. Es barato, estable y comparable entre fuentes, pero **subestima** cambios puramente
cromáticos (un cambio de matiz con la misma luz apenas puntúa). Está documentado como límite y
el informe lo refleja: la corrección de movimiento habla de recorrido y de capas con
desplazamiento, no de "más animación".

### Movimiento de cámara: medir antes de interpretar

La traslación se obtiene maximizando la correlación normalizada de Pearson entre fotogramas
consecutivos sobre una ventana de ±10 px (`bestShift`). El zoom y la rotación se buscan como
hipótesis: se deforma el segundo fotograma con `warpGray` y se exige una mejora de correlación de
0.004. La convención es «desplazamiento del contenido» (dx>0 a la derecha); la escala de alineación
s<1 implica que el contenido creció, así que el zoom publicado es `1/s`. Cada par declara
`verified` si la correlación es ≥0.55 y `estimated` si no. La rotación está en el modelo, pero no
se validó con una referencia propia: no se presenta como verificada.

### Evidencia antes que etiqueta

Cada efecto devuelve `{id, confidence, status, frameRatio, evidence, hint}`. La señal se mide
(halo, nitidez, motas con movimiento, viñeta, simetría…) y la etiqueta es una interpretación.
Glow/bloom, partículas, blur, iluminación y grano se marcan `verified`; parallax, glitch, reflejos
y distorsión, `estimated`. Los objetos no se clasifican: sólo hay regiones salientes; el texto se
localiza por componentes de luminancia y el OCR sólo aparece si Tesseract existe.

### Calidad multidimensional

`quality.ts` combina fidelidad 0.35, composición 0.20, jerarquía 0.15, animación 0.15, fluidez
0.10 y rendimiento 0.05. Las dimensiones sin datos se excluyen y el resto se renormaliza: el
rendimiento sólo puntúa si hay tiempos reales de captura. La composición compara el equilibrio de
masa por cuadrantes; la jerarquía, contraste/detalle/foco; la animación, movimiento, ritmo y
número de cortes; la fluidez, el jerk de la curva y el parpadeo de luminancia.

### Iteración con red de seguridad

`iterate.ts` copia el objetivo con SHA-256, revisa antes, aplica (`--replace` o `git apply
--check` + `git apply`) y revisa después. Si la puntuación no sube al menos `--min-delta`, restaura
la copia y deja el estado `reverted`; `--keep` permite conservar un cambio no medido. Las rutas se
validan dentro del proyecto y el historial queda en `.visual-engine/iterations/<id>/`.

### Cortes con dos señales

El detector de escenas de FFmpeg mide luminancia y se pierde cortes sólo de color. Por eso se
combina con `scanFrames` (15 fps, 80 px, RGB crudo) y un pico local por encima de
`max(0.045, mediana×1.8, media+1.5σ)`, fusionando ambos con 0.12 s de tolerancia. En la referencia
de motion detecta 0.87 s y 1.60 s (reales 0.80/1.60; resolución 1/15 s) y no marca cortes en
paneo/zoom. La demo de 0.1 sigue dando sus dos cortes y 40 cortes/min.

### Captura reproducible

Chromium headless con `viewport` exacto, `deviceScaleFactor`, `colorScheme: dark`,
`force-color-profile=srgb`, `hide-scrollbars`. Se espera `window.__veReady === true` (señal
opcional) y un margen configurable. Se registran errores de consola, `pageerror` y peticiones
fallidas: un diseño con JS roto no es un resultado válido.

### Biblioteca como carpetas, no como cadenas JSON

Cada efecto es `library/effects/<id>/recipe.json` + `templates/`. Las plantillas son archivos
reales con marcadores `{{param}}`; se validan los parámetros, se inyectan y se escriben en la
carpeta del usuario. Añadir un efecto no requiere tocar TypeScript:

```
library/effects/mi-efecto/
  recipe.json          # id, name, category, params, requires, performance, license
  templates/index.html
  templates/style.css
  templates/effect.js
```

`recipe.json` debe declarar `performance` medido o "sin medición"; no se inventan cifras.

### Dependencias: detectar antes de prometer

`deps.ts` comprueba binarios ejecutándolos (`-version`) y paquetes npm leyendo
`node_modules/<pkg>/package.json` del proyecto y de la propia instalación. Distingue
`sistema` / `proyecto` / `ausente`, conserva licencia y límite gratuito, y traduce capacidades
(`web-animation`, `webgl-3d`, `video-processing`, `browser-capture`, `programmatic-render`,
`react-components`, `motion-library`) a un plan con comando de instalación.

La instalación real exige `confirm=true` (API/MCP) o `--yes` (CLI) y usa el gestor detectado
(pnpm/yarn/bun/npm). La API la bloquea salvo `ve serve --allow-install`.

### Adaptadores con verificación sintáctica

Cada adaptador genera archivos utilizables (no pseudocódigo) y comprueba los `.js`/`.mjs` con
`node --check`. Los `.jsx`/`.tsx` (React Bits, Remotion) no se compilan aquí: se declara
explícitamente en el resultado para no afirmar una verificación que no se hizo.

## Seguridad

- Sin red saliente en el flujo normal: todo es local. La única descarga es la instalación de
  paquetes/navegadores que autoriza el usuario.
- `spawn` con argumentos en array; nunca se construye una shell con rutas del usuario.
- El servidor estático y la API escuchan en `127.0.0.1` y el servidor estático impide salir de
  la raíz servida.
- La API limita el cuerpo a 2 MB, valida JSON y bloquea la instalación salvo opt-in.
- El MCP no escribe en el proyecto salvo en herramientas explícitas (`visual_effect_apply`,
  `visual_scaffold`, `visual_install_deps`, `visual_iterate` con `confirm=true`).
- Ollama y Tesseract se consultan sólo en localhost/PATH; si faltan, devuelven el motivo.
- `iterate` exige `confirm=true` en MCP/API, valida que el objetivo esté dentro del proyecto y
  nunca aplica un parche sin copia previa.
- `ve init` no sobrescribe archivos existentes sin `--force`.

## Rendimiento

- Muestreo a 192 px de ancho: ~8 fotogramas por vídeo, análisis en milisegundos.
- Escritura de capturas PNG nativa de Playwright; sin bucles de píxeles en el motor salvo el
  mapa de calor (240 px de ancho).
- `compareImages`: SSIM por bloques 8×8, O(n) sobre la imagen reducida.
- La demo usa un canvas, DPR ≤ 2, partículas en un solo draw call y pausa con `document.hidden`
  en los efectos que la implementan.
- Cámara: 12–16 muestras a 128 px; timeline, 20 a 128 px; inspección, 3 a 192 px.
- `scanFrames` decodifica a 15 fps/80 px para detectar cortes de color en una sola pasada.
- `spec` reutiliza el análisis y no vuelve a decodificar para cada sección.

## Extender

- **Nueva herramienta MCP**: añadir a `src/mcp/server.ts` y a `advanced.ts`; probar con
  `tests/advanced.test.mjs` (cliente real por stdio).
- **Nuevo efecto**: crear carpeta con `recipe.json` y `templates/`; `ve effects list` lo
  detecta; `tests/cli.test.mjs` comprueba el número esperado (actualizar el test si cambia).
- **Nueva capacidad**: añadir a `CAPABILITIES` en `deps.ts` y al registro `TOOLBOX` si implica
  herramienta.
- **Nuevo cliente**: `ve init --clients` añade configuración JSON; los clientes con formato
  propio (Codex/TOML) reciben un fragmento y una nota en lugar de una escritura a ciegas.
