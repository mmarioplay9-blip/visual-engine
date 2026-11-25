# Rendimiento medido · Visual Engine 0.3

Generado: 2026-11-25T12:22:30.604Z · 960×540 · 700 ms por efecto · Chromium (Playwright, headless).

**Resumen:** 58 efectos probados, **58 correctos**, mediana
**60 FPS**, mínimo **39.2 FPS**. Casos más lentos:
dissolve-grain (39.2 FPS), glass-hud (43.8 FPS), aurora-hero (48.7 FPS). El heap es `usedJSHeapSize`; no es VRAM.

| Efecto | Categoría | Motor | FPS | Frame medio | P95 | Heap JS | Carga |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| anamorphic-bloom | iluminacion | canvas2d | 55 | 18.18 ms | 16.8 ms | 9.5 MB | 36 ms |
| aurora-hero | hero | canvas2d+css | 48.7 | 20.51 ms | 50 ms | 9.5 MB | 42 ms |
| bokeh-drift | particulas | canvas2d | 57.5 | 17.39 ms | 16.8 ms | 9.5 MB | 31 ms |
| caustic-light | iluminacion | canvas2d | 60 | 16.67 ms | 16.8 ms | 9.5 MB | 38 ms |
| chrome-text | materiales | canvas2d | 57.5 | 17.39 ms | 16.7 ms | 9.5 MB | 38 ms |
| circuit-lines | fondos | canvas2d | 60 | 16.67 ms | 16.8 ms | 9.5 MB | 27 ms |
| cube-field | 3d | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 30 ms |
| cursor-spotlight | interactivos | canvas2d | 60 | 16.67 ms | 16.8 ms | 9.5 MB | 28 ms |
| displacement-grid | distorsion | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 35 ms |
| dissolve-grain | transiciones | canvas2d | 39.2 | 25.52 ms | 33.4 ms | 9.5 MB | 120 ms |
| dolly-zoom | camara | canvas2d | 60 | 16.67 ms | 16.8 ms | 9.5 MB | 26 ms |
| dot-matrix | fondos | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 28 ms |
| drag-orbit | interactivos | canvas2d | 60 | 16.67 ms | 16.8 ms | 9.5 MB | 30 ms |
| dust-motes | particulas | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 30 ms |
| ember-sparks | particulas | canvas2d | 55 | 18.18 ms | 16.8 ms | 9.5 MB | 28 ms |
| focus-pull | camara | canvas2d | 60 | 16.67 ms | 16.8 ms | 9.5 MB | 28 ms |
| fractal-tunnel | shaders | webgl+glsl | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 37 ms |
| frosted-panel | materiales | canvas2d | 60 | 16.67 ms | 16.8 ms | 9.5 MB | 34 ms |
| glass-hud | interfaz | svg+css | 43.8 | 22.86 ms | 50 ms | 9.5 MB | 37 ms |
| glass-refraction | materiales | canvas2d | 57.5 | 17.39 ms | 16.7 ms | 9.5 MB | 32 ms |
| glitch-slices | transiciones | canvas2d | 60 | 16.67 ms | 16.8 ms | 9.5 MB | 31 ms |
| handheld-shake | camara | canvas2d | 60 | 16.66 ms | 16.7 ms | 9.5 MB | 27 ms |
| heat-haze | shaders | webgl+glsl | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 35 ms |
| holographic-foil | materiales | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 31 ms |
| ink-diffusion | distorsion | canvas2d | 60 | 16.67 ms | 16.8 ms | 9.5 MB | 38 ms |
| iridescent-foil | shaders | webgl+glsl | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 34 ms |
| iris-wipe | transiciones | canvas2d | 60 | 16.67 ms | 16.8 ms | 9.5 MB | 28 ms |
| kinetic-title | tipografia | css+web-animations | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 34 ms |
| lens-flare | iluminacion | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 28 ms |
| magnetic-button | interactivos | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 26 ms |
| mesh-gradient | fondos | canvas2d | 60 | 16.67 ms | 16.8 ms | 9.5 MB | 26 ms |
| neon-rim | iluminacion | canvas2d | 56.2 | 17.78 ms | 16.7 ms | 9.5 MB | 30 ms |
| noise-warp | transicion | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 33 ms |
| parallax-layers | camara | canvas2d | 60 | 16.67 ms | 16.8 ms | 9.5 MB | 27 ms |
| particle-nebula | 3d | three+webgl+glsl | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 83 ms |
| plasma-flow | shaders | webgl+glsl | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 37 ms |
| radar-sweep | hud | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 33 ms |
| rain-veil | particulas | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 26 ms |
| ripple-glass | distorsion | canvas2d | 60 | 16.67 ms | 16.8 ms | 9.5 MB | 26 ms |
| scramble-decode | tipografia | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 27 ms |
| split-reveal | tipografia | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 31 ms |
| starfield-warp | particulas | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 25 ms |
| sweep-banner | hero | css+svg | 58.7 | 17.02 ms | 16.7 ms | 9.5 MB | 33 ms |
| target-reticle | hud | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 30 ms |
| telemetry-grid | hud | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 28 ms |
| terrain-grid | 3d | canvas2d | 60 | 16.67 ms | 16.8 ms | 9.5 MB | 26 ms |
| tilt-card-3d | interactivos | canvas2d | 58.8 | 17.01 ms | 16.8 ms | 9.5 MB | 27 ms |
| torus-knot | 3d | canvas2d | 60 | 16.67 ms | 16.8 ms | 9.5 MB | 27 ms |
| typewriter-cursor | tipografia | canvas2d | 60 | 16.67 ms | 16.8 ms | 9.5 MB | 27 ms |
| variable-weight | tipografia | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 77 ms |
| volumetric-rays | iluminacion | canvas2d | 58.8 | 17.01 ms | 16.8 ms | 9.5 MB | 27 ms |
| voronoi-cells | shaders | webgl+glsl | 60 | 16.67 ms | 16.8 ms | 9.5 MB | 35 ms |
| vortex-twist | distorsion | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 27 ms |
| wave-contours | fondos | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 40 ms |
| waveform-monitor | hud | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 26 ms |
| whip-pan | transiciones | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 29 ms |
| wireframe-globe | 3d | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 26 ms |
| zoom-blur | transiciones | canvas2d | 60 | 16.67 ms | 16.7 ms | 9.5 MB | 25 ms |

## Límites

- FPS medido con requestAnimationFrame en Chromium headless; no es una garantía en otros equipos.
- La memoria es usedJSHeapSize, no memoria GPU; los shaders WebGL no exponen su VRAM desde la página.
- La carga incluye la espera de red local y el primer frame; no incluye el arranque del navegador.

La evaluación artística es humana y no se deriva de estas cifras. Una puntuación de calidad alta
no implica que el efecto sea apropiado para una referencia concreta.
