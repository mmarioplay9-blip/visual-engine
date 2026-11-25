# Verificación de Visual Engine 0.4 · Art Director

Fecha: 2026-11-25 · Windows 11 · Node 26.13.1 · Chromium de Playwright 1.65.1 ·
FFmpeg 9.1 · RTX 4060 Ti (16.380 MB VRAM).

Esta fase conserva los 58 efectos, la composición 0.3, las 39 pruebas anteriores y el
funcionamiento local/gratuito. Añade dirección artística, Reference-to-Design, Motion Director,
20 composiciones y una comparación A/B controlada.

## 1. Qué se ha implementado

| Módulo | Implementación | Evidencia |
| --- | --- | --- |
| `styles.ts` | 15 perfiles de dirección artística, paletas semánticas, escala modular, tokens DTCG, materiales, selección de efectos, auditoría estructural y CSS | `ve art`, 15/15 estilos en pruebas |
| `motion-director.ts` | 6 recetas de movimiento, 3 movimientos de cámara, CSS/GSAP/Motion One, reduced-motion y validación | `ve motiondirector`; laboratorio HTML y JSON |
| `refdesign.ts` | `VisualSpec` → identidad, paleta con roles, tipografía aproximada, layout, capas, materiales, componentes, motion, efectos y código | `ve refdesign`; separa `verified` de `estimated` |
| `showcase.ts` | 20 composiciones en 10 arquetipos, 15 estilos, assets compartidos, previews y medición | `ve showcase --measure` |
| CLI / MCP / API | `art`, `refdesign`, `motiondirector`, `showcase`; 4 herramientas MCP y 4 rutas API | Pruebas de CLI y suite |

Los 15 estilos no son variaciones de color. Cada perfil declara reglas de composición, tipografía,
materiales, movimiento, efectos y anti-patrones. Los tokens se escriben en formato DTCG.

## 2. Pruebas

```text
node --test tests/visual04.test.mjs
6/6 pruebas 0.4 · 13,5 s
```

Cubren: 15 estilos y contraste, tokens/CSS renderizados, Motion Director, separación
confirmado/estimado, 20 composiciones, 58 efectos preservados y las mediciones reales.

La suite completa (0.1–0.4) se ejecutó con `npm test`: **45/45 pruebas en 101,9 s**, sin fallos
ni omitidas. Las 39 pruebas anteriores siguen incluidas.

## 3. Las 20 composiciones

Todas usan efectos existentes de la biblioteca y se sirven en local. Cada carpeta contiene
`index.html`, `design-system.css`, `page.css`, `tokens.json`, `params.json`, `DESIGN.md`,
`MOTION.md`, `README.md`, `measurement.json` y `preview.png`.

| Composición | ID | Estilo | Arquetipo |
| --- | --- | --- | --- |
| Lumen | `lumen` | minimal-premium | landing |
| Nocturne | `nocturne` | cinematic | landing |
| Orbital | `orbital` | futuristic | dashboard |
| Aegis | `aegis` | sci-fi | HUD |
| Neon District | `neon-district` | cyberpunk | menú de juego |
| Aether | `aether` | glassmorphism | landing |
| Quiet Form | `quiet-form` | neumorphism | app |
| Folio | `folio` | editorial | editorial |
| Raw Grid | `raw-grid` | brutalism | móvil |
| Vanguard | `vanguard` | game-ui | HUD |
| Relay | `relay` | professional-app | app |
| Meridian | `meridian` | financial-dashboard | dashboard |
| Deep Field | `deep-field` | immersive-3d | escena 3D |
| Frame 24 | `frame-24` | motion-graphics | motion |
| Terra | `terra` | organic-natural | móvil |
| Atlas | `atlas` | glassmorphism | app |
| Signal | `signal` | sci-fi | dashboard |
| Mono | `mono` | brutalism | cartel |
| Pulse | `pulse` | motion-graphics | app |
| Forge | `forge` | futuristic | menú de juego |

Medición real: **20/20 sin errores**, 61 FPS medianos, mínimo 43 FPS, 0 violaciones de contraste
en 619 textos comprobados, 0 overflow horizontal, fuentes cargadas y tabs funcionales.
Detalle por composición: [RENDIMIENTO-0.4.md](RENDIMIENTO-0.4.md) y
`library/showcase/measurements.json`.

### Errores encontrados y corregidos

1. La marca `VE` usaba el acento como texto a 9 px: 3,11:1 en Raw Grid y Mono. Se cambió a
   `--ve-text`; ambas pasaron a 0 violaciones.
2. La pestaña activa del móvil usaba acento sobre blanco a 8 px: 3,55:1. Se sustituyó por texto
   con subrayado de acento.
3. La auditoría DOM inicial no asignaba alfa a `rgb()` sin cuarta componente y producía falsos
   positivos en páginas claras. Se corrigió el parser y se volvió a medir; no se bajó el umbral.
4. Nocturne queda en 43 FPS por la suma de bloom anamórfico y grano animado. No se oculta ni se
   cambia la métrica: es el mínimo real de la muestra.

## 4. Motion Director

- Transición: curva smoothstep con 31 muestras, monotónica, segunda diferencia máxima
  **0,006222** (< 0,01). Estado `verified`.
- Rotación: patrón sintético rotado 2°; el estimador devuelve magnitud 1,5°; error **0,5°**
  (≤ 1°). Estado `verified` para la magnitud. El signo se invierte por la convención de alineación
  y no se presenta como una medición independiente.
- `prefers-reduced-motion`: respetado en las 20 composiciones (animación `none`).
- Se entregan recetas CSS, GSAP y Motion One; no todas las páginas cargan las tres librerías.

**Límite:** la rotación se valida sobre una imagen sintética, no sobre cualquier render WebGL.
La fluidez final depende del dispositivo.

## 5. Reference-to-Design

`ve refdesign` produce identidad, paleta con roles, tipografía aproximada, layout, capas,
materiales, componentes, motion, efectos y código. El contrato separa:

- **Confirmado:** dimensiones, colores y proporciones del histograma, composición medida y texto
  OCR cuando existe.
- **Estimado:** familia tipográfica, escala aplicada, arquitectura de componentes, materiales y
  estilo. Nunca se afirma identificar la fuente real.

La referencia A/B es un cartel de **Henri de Toulouse-Lautrec, `Moulin Rouge: La Goulue`,
MET, CC0**, descargado de Wikimedia Commons:
`docs/evidencia/0.4/referencia-dominio-publico.jpg` (2,6 MB, 2314×3722).

### A/B controlado

Mismo agente, mismas instrucciones y mismo presupuesto: dos páginas estáticas, idéntico copy,
sin efectos de biblioteca, capturadas en Chromium a 1280×800. A es una reconstrucción genérica;
B usa `buildReferenceDesign` y tokens del Art Director.

| Dimensión | A genérica | B Art Director | Δ |
| --- | ---: | ---: | ---: |
| Calidad total | 59,8 | **76,4** | +16,6 |
| Coherencia | 0,0 | **98,1** | +98,1 |
| Tipografía | 92,7 | **100,0** | +7,3 |
| Accesibilidad | 91,1 | **97,7** | +6,6 |
| Composición | 96,8 | 93,5 | −3,3 |
| Fidelidad | 31,6 | 56,5 | +24,9 |

La coherencia y la tipografía mejoran sobre la misma referencia y el mismo copy. La composición
baja 3,3 puntos y se publica; no se retoca. El sistema prioriza jerarquía y legibilidad, no copiar
píxeles.

**Transiciones:** la referencia A/B es una imagen, por lo que la dimensión temporal no es
comparable con el 40,0 de 0.3. No se inventa un “40,0 → X”. La transición se valida aparte con
Motion Director y con la prueba de reduced-motion; queda como límite explícito que la mejora de
transiciones no se midió contra un vídeo de referencia en esta fase.

Evidencia: `docs/evidencia/0.4/ab/AB.md`, `ab-metrics.json`, `comparativa-ab.png`,
`baseline.html`, `art-direction.html` y capturas.

## 6. Licencias y referencias

- Cartel A/B: MET Open Access, **CC0**, Wikimedia Commons.
- Fuentes locales: Inter, Space Grotesk, Source Serif 4 y JetBrains Mono, SIL OFL 1.1; licencias
  en `library/fonts/OFL-*.txt`.
- Renders 0.3 propios: Remotion, GSAP y Three.js, ya documentados.
- No se usó material de cliente ni APIs de pago.

## 7. Límites declarados

1. La referencia A/B es estática: no valida transiciones contra vídeo.
2. La rotación se valida con patrón sintético, no con cámara 3D real.
3. La tipografía se aproxima por proporción; no se identifica la fuente original.
4. La arquitectura de componentes es una propuesta, no una lectura del píxel.
5. La evaluación artística humana es independiente de la auditoría estructural.
6. Probado sólo en Windows; Linux/macOS no se ejecutaron aquí.
7. Sin detector semántico de objetos/pose; se mantiene la limitación 0.2.
8. Nocturne baja a 43 FPS; el resto se mantiene en 60–61 FPS.
9. No se midió VRAM GPU en las composiciones; sólo heap JS y FPS.
10. El repositorio **no se ha publicado** en GitHub.
