# Verificación 0.2 — análisis avanzado y referencias profesionales

Fecha: 2026-11-25 · Windows 11 · Node 26.13.1 · FFmpeg 9.1 · Playwright 1.65.1 · Ollama 0.40.16.

Todo lo de este documento se ejecutó en esta máquina. Los fallos encontrados durante la
verificación se conservan porque explican por qué los números son los que son.

## Entorno y herramientas locales

| Herramienta | Estado real | Uso en 0.2 |
| --- | --- | --- |
| FFmpeg / FFprobe 9.1 | Instalado | Decodificación, escenas, storyboard, vídeo |
| Playwright 1.65.1 + Chromium 1255 | Instalado | Captura y tiempos reales por fotograma |
| Tesseract | **No instalado** | OCR: adaptador implementado, no ejecutado |
| OpenCV (`cv2`) | **No instalado** | No se usa: las primitivas son JS propio |
| MediaPipe | **No instalado** | No se usa: no aporta sin modelos de pose/cara |
| Ollama 0.40.16 | Activo, 10 modelos, **0 de visión** | Integración implementada; descripción no ejecutada |
| Modelos de visión | Ninguno (`llava`, `moondream`, `qwen2.5vl`…) | Pendiente de instalar por el usuario |

No se instaló ninguna dependencia nueva para 0.2. No hay APIs externas ni claves.

## Referencias generadas (reproducibles, sin material de terceros)

`demo/make-refs-0.2.mjs` dibuja seis clips por código. Todos se regeneraron desde cero.

| Clip | Formato | Duración | Fotogramas | Peso | Qué contiene |
| --- | --- | --- | --- | --- | --- |
| `premium-ui.mp4` | 360×640 | 2,00 s | 48 | 146 KB | UI oscura, titular LUMEN, anillo, glow, viñeta, zoom lento |
| `premium-ui-alt.mp4` | 360×640 | 2,00 s | 48 | 173 KB | Misma escena, acento cálido y zoom distinto |
| `motion-graphics.mp4` | 480×270 | 2,00 s | 48 | 164 KB | Tres planos, dos cortes, partículas, bandas, anillo |
| `depth-3d.mp4` | 480×270 | 2,42 s | 58 | 98 KB | Capas con parallax, bokeh, reflejo, titular DEPTH |
| `camera-pan.mp4` | 320×180 | 1,21 s | 29 | 5 KB | Patrón que se desplaza 4 px/fotograma |
| `camera-zoom.mp4` | 320×180 | 1,21 s | 29 | 44 KB | Patrón que crece 1,2 %/fotograma |

## Resultados medidos

### Línea temporal y escenas

```text
cortes: 0.87 s y 1.60 s   (reales: 0.80 s y 1.60 s; resolución del barrido: 1/15 s)
escenas: 3
fotogramas clave: 8 (inicio, cortes, mitad de escena, movimiento, fin)
storyboard: 8 PNG reales
```

El detector de escenas de FFmpeg no veía el segundo corte porque es un cambio de color con
luminancia parecida. Se añadió un barrido RGB propio a 15 fps y 80 px; la combinación detecta
ambos y no marca cortes en los clips de paneo/zoom.

### Movimiento de cámara

| Clip | Resultado | Estado |
| --- | --- | --- |
| Paneo | desplazamiento +3,125 % del ancho por paso; 10/11 pares verificados; temblor 0,78 % | Verificado |
| Zoom | factor 1,031 (acerca); pares con correlación 0,62–0,85 | Verificado |
| Rotación | estimador presente; no se generó una referencia con rotación pura | **No verificado** |
| Transiciones | cortes duros verificados; fundidos/barridos por umbral de luminancia y asimetría | Cortes verificados; resto estimado |

### Composición, formas, texto y profundidad (UI)

| Medida | Valor |
| --- | --- |
| Tercios | 32,9 % |
| Equilibrio horizontal / vertical | 86,5 % / 92,0 % |
| Simetría horizontal | 83,1 % |
| Horizonte | y = 72,1 % |
| Círculo (anillo) | centro (131, 105), r = 30, confianza 94,2 % — verificado |
| Texto | una línea en x 64–127, y 233–247 (192×341); método de componentes, **estimado** |
| Profundidad | 3 capas proxy (nitidez 27,2 / 117,9 / 1 025,5) — **estimada** |

No se detectan objetos con etiqueta semántica: sólo regiones salientes. Tesseract no está, así
que no hay lectura del texto. `depth-3d.mp4` produce 3 capas y una línea de texto estimada.

### Efectos detectados

| Clip | Efectos (confianza, estado) |
| --- | --- |
| `motion-graphics.mp4` | glow 1,00 verified · partículas 0,79 verified · parallax 0,63 estimated · iluminación 0,99 verified · reflejos estimated · distorsión 0,31 estimated |
| `premium-ui.mp4` | glow 1,00 verified · iluminación 1,00 verified · glitch 0,50 estimated (posible aberración de compresión) |
| `depth-3d.mp4` | glow verified · parallax 0,80 estimated · iluminación 0,92 verified · distorsión 0,40 estimated |

La señal (halo, nitidez, motas en movimiento, viñeta, simetría, desplazamiento por franjas) es
medible; la etiqueta del efecto es una interpretación y así se devuelve.

### Especificación y recomendaciones

`ve spec motion-graphics.mp4 --samples 14` generó:

- 3 escenas con tiempos, luma y movimiento.
- 6 efectos con parámetros y tecnología.
- Stack: CSS+GSAP, Canvas 2D, GSAP transforms, degradado radial, transforms+mask, SVG/shader.
- `spec.json` y `spec.md` con plan de verificación y límites.

Los 10 efectos del catálogo producen snippets; **todos los JS pasan `node --check`** (prueba
`recommend`). Los snippets CSS/GLSL no se compilan: se declara su lenguaje.

### Comparación temporal

`premium-ui.mp4` frente a `premium-ui-alt.mp4`:

```text
puntuación temporal 88,3/100 (A)
luminancia 98,9 % · forma de la curva 0,985 · movimiento 0,102 · cortes F1 1,000
deriva −0,333 s
calidad global 98,2/100
fidelidad 97,4 · composición 99,9 · jerarquía 95,7 · animación 99,2 · fluidez 99,6
rendimiento: no disponible (el módulo no recibió tiempos de captura)
```

El movimiento correlaciona poco porque los dos clips zoomean a velocidades distintas; se
mantiene visible en vez de ocultarlo.

### Calidad del ciclo 0.1 con el evaluador nuevo

`ve review` del demo (540×960, 6 capturas, referencia de 3 s):

```text
fidelidad 81,3/100 (B)
calidad global 66,5/100 (C)
composición 52,1 · jerarquía 58,1 · animación 45,4 · fluidez 84,9 · rendimiento 72,8
```

Es el resultado esperado: la fidelidad de color/luz es alta, pero la composición y la animación
de la landing no reproducen la referencia. Antes sólo se publicaba el 81,3; ahora se ve el 66,5.

### Iteración verificada

| Caso | Antes | Después | Resultado |
| --- | --- | --- | --- |
| Reemplazo peor (`replace`) | 80,6 (calidad 84,2) | 36,0 | **Revertido**; archivo idéntico por hash |
| Mismo reemplazo con `--keep` | 80,6 | 36,0 | Conservado por decisión explícita; `restore` devolvió el original |
| Parche `git apply` | 80,6 (calidad 84,2) | 90,5 (calidad 86,7) | Conservado; archivo con el cambio |

Hay copia con SHA-256 antes de tocar nada, revisión antes/después y restauración desde
`ve backup restore <id> --project <dir>`. El parche exige un repositorio git; si `git apply
--check` falla, se revierte y se informa.

### Pruebas

```text
33 pruebas · 33 pass · 0 fail · 73,5 s
```

Cubren timeline/storyboard, cámara (paneo y zoom), inspección (texto/círculo/composición),
efectos en motion y UI, 3D/parallax, spec, snippets JS validados, temporal, iteración con
reversión/keep/restore, visión, CLI, API y MCP con cliente real. La regresión de 0.1 sigue en
verde (incluido el E2E 68,0 → 81,2–82,1 según la captura).

## Errores encontrados y corregidos

1. **Generador de referencias estático.** `writeClip` pasaba el tiempo como si fuera fps y las
   funciones dividían otra vez: `t = i / (i/fps) = 24` constante. El vídeo sólo cambiaba por el
   grano. Se corrigió pasando fps y se regeneraron los seis clips.
2. **Cortes sólo de luminancia.** FFmpeg no veía el corte ámbar→azul. Se añadió barrido RGB a
   15 fps; ahora detecta 0,87 s y 1,60 s.
3. **Zoom con signo invertido.** La escala de alineación `s<1` significa que el contenido creció;
   se invierte a `1/s`. El clip de zoom pasa de 0,97 a 1,031.
4. **Falso desenfoque.** El criterio de bokeh se disparaba con un centro nítido y un borde oscuro
   plano (UI). Se exige además `lapVar < 120`, borde < 22 y relación > 2,5.
5. **Texto invisible para el detector.** El glow unía las letras en un solo componente de borde.
   Se pasó a máscara de luminancia (texto claro sobre fondo oscuro / oscuro sobre claro) y se
   aceptan palabras de una sola pieza ancha. Ahora localiza LUMEN.
6. **Partículas perdidas al reducir.** Los puntos de 1–2 px desaparecían. Se usan motas de
   contraste local y se exige movimiento entre fotogramas; el clip de motion las detecta.
7. **Storyboard fallaba en el último fotograma.** `-ss` en 1,98 s de un clip de 2,00 s no devolvía
   imagen. Se limita el instante a `duración − 1/fps`.
8. **Fotograma final de timeline.** El keyframe de fin usaba `duración − 0,02`; corregido a un
   fotograma completo antes del final.

## No verificado (no se presenta como funcionando)

- OCR real: Tesseract no está instalado; el adaptador no se ejecutó de extremo a extremo.
- Descripción con visión local: Ollama responde pero no hay modelo de visión; no se descargó
  ninguno (sería una descarga grande no autorizada).
- Rotación de cámara pura: el estimador existe, no hay referencia específica.
- Objetos con etiqueta semántica, pose, caras: no hay modelo local integrado.
- Transiciones distintas de corte duro: fundido/barrido se estiman, no se verifican con un clip
  diseñado para ello.
- Profundidad métrica: es un proxy de nitidez, no un mapa de distancias.
- Linux/macOS: sólo Windows en esta máquina.
- GitHub: el repositorio no se publica en esta fase; `ve update` sigue probado contra remoto local.
- Comparación temporal de una secuencia de capturas contra un vídeo: `ve temporal` exige dos
  vídeos; el ciclo `review` sí compara capturas con vídeo, pero con otra alineación.
