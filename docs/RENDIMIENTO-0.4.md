# Rendimiento de Visual Engine 0.4

Medición: 2026-11-25 · Windows 11 · Chromium headless de Playwright 1.65.1 · 1280×800 ·
`deviceScaleFactor: 1` · 700 ms de `requestAnimationFrame` por composición · 20 páginas
servidas en local, medidas secuencialmente.

No se mide VRAM GPU: Chromium headless no la expone de forma fiable en esta configuración.
`heapMB` es memoria JS usada, no memoria gráfica. Los FPS son una muestra corta, no un benchmark
de producción.

## Resumen

| Métrica | Resultado |
| --- | ---: |
| Composiciones medidas | 20 |
| Sin errores de consola/red/overflow | 20/20 |
| FPS mediana | **61** |
| FPS mínimo | **43** |
| Carga mediana | 589 ms |
| Carga máxima | 717 ms |
| Violaciones de contraste | **0** en 619 textos |
| Overflow horizontal | 0 px en 20/20 |
| Fuentes cargadas | 20/20 |
| Tabs funcionales | 20/20 |
| Reduced motion respetado | Sí |

## Detalle

| Composición | Estilo | FPS | Carga ms | Heap MB | Textos | Peor contraste |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Lumen | minimal-premium | 61 | 624 | 9,5 | 22 | 6,07:1 |
| Nocturne | cinematic | **43** | 717 | 9,5 | 22 | 9,03:1 |
| Orbital | futuristic | 60 | 587 | 9,5 | 49 | 8,01:1 |
| Aegis | sci-fi | 61 | 581 | 9,5 | 39 | 7,32:1 |
| Neon District | cyberpunk | 61 | 587 | 9,5 | 28 | 5,52:1 |
| Aether | glassmorphism | 61 | 592 | 9,5 | 22 | 10,24:1 |
| Quiet Form | neumorphism | 61 | 588 | 9,5 | 41 | 4,65:1 |
| Folio | editorial | 60 | 615 | 9,5 | 24 | 5,94:1 |
| Raw Grid | brutalism | 61 | 572 | 22,0 | 24 | 5,55:1 |
| Vanguard | game-ui | 61 | 585 | 9,5 | 39 | 7,75:1 |
| Relay | professional-app | 60 | 578 | 9,5 | 41 | 5,32:1 |
| Meridian | financial-dashboard | 61 | 588 | 9,5 | 49 | 8,13:1 |
| Deep Field | immersive-3d | 61 | 583 | 10,7 | 17 | 5,87:1 |
| Frame 24 | motion-graphics | 61 | 564 | 9,5 | 24 | 6,82:1 |
| Terra | organic-natural | 61 | 590 | 9,5 | 24 | 4,73:1 |
| Atlas | glassmorphism | 61 | 604 | 9,5 | 41 | 8,87:1 |
| Signal | sci-fi | 61 | 586 | 9,5 | 47 | 7,74:1 |
| Mono | brutalism | 60 | 591 | 9,5 | 16 | 5,55:1 |
| Pulse | motion-graphics | 60 | 581 | 9,5 | 41 | 6,82:1 |
| Forge | futuristic | 60 | 583 | 9,5 | 28 | 8,01:1 |

## Lectura

- La mediana de 61 FPS es consistente con una pantalla de 60 Hz; 61 no significa 61 FPS
  ilimitados, sino que `requestAnimationFrame` no perdió frames en la ventana medida.
- Nocturne es el único caso por debajo de 60: bloom anamórfico + grano animado. Se deja como
  evidencia; no se reduce la calidad para inflar la tabla.
- Raw Grid usa 22 MB de heap por el canvas de glitch y el archivo móvil; sigue dentro de un
  presupuesto razonable.
- La carga de 564–717 ms incluye servidor local, fuentes, dos módulos de efectos y espera de
  `document.fonts.ready`. No es un tiempo de red real.
- El coste no crece con el número de composiciones: comparten assets y fuentes en
  `library/showcase/assets/`.

## Reproducir

```bash
npm run build
ve showcase --measure
# o: node -e "import('./dist/core/showcase.js').then(m=>m.measureShowcase())"
```

Datos crudos: `library/showcase/measurements.json`.
