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
| `core/media.ts` | FFprobe/FFmpeg: metadatos, muestreo RGB, fotogramas, codificación, cortes | ffmpeg |
| `core/analysis.ts` | Métricas por fotograma y perfil visual agregado | media, util |
| `core/compare.ts` | Perfiles: puntuación/paleta/correcciones. Imágenes: SSIM/MAE/ΔE/heatmap | analysis, media |
| `core/capture.ts` | Chromium real, varios fotogramas, errores JS y de red | Playwright |
| `core/library.ts` | Recetas en disco (`recipe.json` + `templates/`), parámetros validados | Node |
| `core/deps.ts` | Registro de herramientas, detección real, plan e instalación npm | run |
| `core/adapters.ts` | Scaffolds de las 7 herramientas + `node --check` | run |
| `core/static.ts` | Servidor estático mínimo para capturar proyectos locales | Node http |
| `core/review.ts` | Orquestador E2E y generación de informes | todos |
| `core/ops.ts` | Operaciones compartidas por MCP, API y CLI | todos |
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

### Cortes reales, no inferidos

El detector de escenas de FFmpeg (`select='gt(scene,0.1)',showinfo`) aporta tiempos reales de
corte. El muestreo sirve de respaldo si falla. En la demo detecta los dos cortes (1.00 s y
2.00 s) y calcula 40 cortes/min.

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
  `visual_scaffold`, `visual_install_deps`).
- `ve init` no sobrescribe archivos existentes sin `--force`.

## Rendimiento

- Muestreo a 192 px de ancho: ~8 fotogramas por vídeo, análisis en milisegundos.
- Escritura de capturas PNG nativa de Playwright; sin bucles de píxeles en el motor salvo el
  mapa de calor (240 px de ancho).
- `compareImages`: SSIM por bloques 8×8, O(n) sobre la imagen reducida.
- La demo usa un canvas, DPR ≤ 2, partículas en un solo draw call y pausa con `document.hidden`
  en los efectos que la implementan.

## Extender

- **Nueva herramienta MCP**: añadir a `src/mcp/server.ts` y a `ops.ts`; probar con
  `tests/mcp.test.mjs` (cliente real por stdio).
- **Nuevo efecto**: crear carpeta con `recipe.json` y `templates/`; `ve effects list` lo
  detecta; `tests/cli.test.mjs` comprueba el número esperado (actualizar el test si cambia).
- **Nueva capacidad**: añadir a `CAPABILITIES` en `deps.ts` y al registro `TOOLBOX` si implica
  herramienta.
- **Nuevo cliente**: `ve init --clients` añade configuración JSON; los clientes con formato
  propio (Codex/TOML) reciben un fragmento y una nota en lugar de una escritura a ciegas.
