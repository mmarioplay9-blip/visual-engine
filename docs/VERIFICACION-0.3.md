# Verificación de Visual Engine 0.3

Fecha: 2026-11-25 · Windows 11 · Node 26.13.1 · Chromium de Playwright 1.65.1 ·
FFmpeg 9.1 · Tesseract 5.4 · Ollama local · NVIDIA RTX 4060 Ti (16.380 MB VRAM, 31,8 GB RAM).

Este informe separa **lo ejecutado** de **lo estimado**. Las métricas automáticas no son un
juicio artístico humano. El repositorio **no se ha publicado en GitHub** y no se usaron APIs de
pago ni servicios externos obligatorios.

## Resumen

| Área | Resultado |
| --- | --- |
| Pruebas | **39/39 PASS** (suite completa, 89,0 s) |
| Biblioteca | **58 efectos** en 12 categorías; 58/58 aplican y pasan `node --check` |
| Rendimiento | 58/58 medidas; mediana **60 FPS**, mínimo **39,2 FPS**, heap 9,5 MB |
| OCR | Tesseract 5.4; texto nítido **96,4 %**; render real 81,1 % |
| Visión local | `llava:7b` seleccionado y verificado; 16 GB VRAM detectados |
| Composición | JSON validado y render de 3 capas con máscara, mezcla y tracks |
| Galería | 58 efectos, preview real y composición desde la UI |
| Reference-to-Effects | Render Remotion real → 3 capas; temporal **77,7/100 (B)**, fidelidad **93,9** |
| Integraciones | GSAP, Three.js, Motion, Remotion, React Bits, Playwright y FFmpeg ejecutados |

## 1. Inteligencia visual

### Tesseract

- Instalado en `C:\Program Files\Tesseract-OCR\tesseract.exe`; versión 5.4.
- Sobre una captura nítida de «VISUAL ENGINE»: lectura correcta con **96,4 %** de confianza.
- Sobre el fotograma del render Remotion: 2 líneas; «REMOTION - RENDER REAL» con **81,1 %**.
- Error real observado: «100 % · frame 45» se leyó como «10196: frame 18». El motor conserva el
  texto OCR y advierte que puede contener errores; no lo corrige por su cuenta.
- Artefactos: `docs/evidencia/0.3/referencia-spec.json` y `referencia-remotion.png`.

### Ollama, VRAM y selección

- Hardware detectado: RTX 4060 Ti, **16.380 MB** de VRAM; **31,8 GB** de RAM.
- Modelos instalados: `llava:7b` (4,7 GB), `qwen2.5vl:3b` (3,2 GB) y `moondream`.
- `llava:7b` produjo una descripción semántica real de la captura, mencionando el texto, el fondo
  oscuro y la iluminación. Es la opción seleccionada en esta máquina.
- `qwen2.5vl:3b` devolvió tokens repetidos (`@@@@`) con la versión actual de Ollama.
- `moondream` devolvió una respuesta vacía.
- Se corrigió el comparador de tags para no confundir `3b` con `7b`, y se rebajó la prioridad de
  Qwen por la evidencia observada. La selección declara modelo, pesos y VRAM disponible.

`ve spec --vision` escribe `ocr.json` y `semantic.json` y los integra en la especificación. Si
Tesseract u Ollama faltan, devuelve `available:false` con el motivo y el resto sigue funcionando.

## 2. Biblioteca de 58 efectos

- 6 recetas existentes conservadas + 52 nuevas = **58**.
- 12 categorías: partículas, iluminación, shaders, materiales, distorsión, transiciones,
  tipografía, interactivos, HUD, fondos, cámara y 3D.
- Cada receta tiene `recipe.json`, `config.js`, `effect.js`, runtime, `index.html`, README,
  parámetros, compatibilidad, licencia e instrucciones de integración.
- Verificación: todas se aplican, no contienen placeholders y superan `node --check`.
- Fallo corregido: `circuit-lines` accedía a `pts[seg]` con un índice no finito. Se acotó el
  segmento y se añadieron guardas; ahora mide 60 FPS sin errores.
- Fallo corregido: `split-reveal` podía sacar el titular del lienzo y sólo revelaba una ventana
  cíclica de letras. Ahora ajusta el tamaño al ancho y mantiene el texto visible tras la entrada.

**Benchmark** (`library/benchmarks.json`, Chromium headless, 960×540, 700 ms):

- 58/58 `ok`, mediana 60 FPS, mínimo 39,2 FPS, heap JS 9,5 MB.
- Carga entre 22 y 134 ms; el peor caso es `dissolve-grain`.
- Son cifras de esta máquina y este navegador, no una garantía universal. No se mide VRAM GPU.
- Tabla completa: [RENDIMIENTO-0.3.md](RENDIMIENTO-0.3.md).

## 3. Composición y galería

- Formato JSON 0.3 con capas, parámetros compartidos, mezclas, máscaras, transformaciones y
  curvas de animación; validación con errores explícitos.
- Render autónomo: HTML + `composition.json` + copias de los efectos en `assets/effects/`.
- Verificado con 3 capas, mezcla, máscara radial y tracks; captura de 409 KB.
- La galería sirve los 58 efectos, previews reales y composición desde la API. Es opcional: CLI,
  MCP y API funcionan sin abrirla.
- Evidencia: [composicion.png](evidencia/0.3/composicion.png),
  [galeria.png](evidencia/0.3/galeria.png).

## 4. Reference-to-Effects con una referencia real propia

Referencia: `demo/out/remotion.mp4`, render propio con Remotion, 1280×720, 3 s, 30 fps. No es
material de terceros sin licencia.

- Especificación: 1 escena, 2 efectos detectados (`parallax` estimado 75 %, `lighting`
  verificado 100 %), OCR + LLaVA.
- Composición: 3 capas (`parallax-layers`, `volumetric-rays`, `split-reveal`), tracks de opacidad,
  máscara radial y avisos de hipótesis.
- La capa de texto usa el OCR; se declara que puede contener errores. No se afirma que la
  referencia use exactamente los efectos elegidos.
- Comparación temporal con el vídeo grabado en Chromium:
  - **77,7/100 (B)**, 12 puntos, fidelidad **93,9**.
  - Calidad **80,4 (B)**: composición 95,4, jerarquía 93,3, animación 91,6, profundidad 94,1,
    iluminación 90,5, fluidez 33,0, tipografía 37,8, transiciones 40,0, coherencia 4,9.
  - El rendimiento no se incluyó porque la grabación no aportó tiempos de captura.
- Lectura honesta: la reconstrucción recupera escala, encuadre y legibilidad, pero no replica la
  identidad tipográfica ni la coherencia de paleta de la referencia. Es una aproximación declarada.
- Evidencia: [comparativa-antes-despues.mp4](evidencia/0.3/comparativa-antes-despues.mp4)
  (izquierda referencia, derecha reconstrucción), fotogramas y JSON en `docs/evidencia/0.3/`.

## 5. Integraciones reales

| Herramienta | Ejecución observada |
| --- | --- |
| GSAP | Timeline de 1,528 s, 5 hijos, animación en Chromium |
| Three.js | r170, escena con 14.080 triángulos |
| Motion | 3 controles animados montados |
| React Bits | Componente montado sin errores de página |
| Remotion | MP4 de 158 KB, 1280×720, 3 s; aviso de `zod` 3.25.76 vs 4.6.7 |
| Playwright | Capturas, vídeo de composición, OCR de apoyo y suite E2E |
| FFmpeg | Extracción, codificación MP4 y comparativa lado a lado |

Los paquetes están instalados en el proyecto y las demos están en `demo/integrations/`. No se
incluyen plugins de pago de GSAP ni componentes de terceros copiados sin licencia.

## 6. Calidad y accesibilidad

- Calidad ampliada a **13 dimensiones**, con renormalización cuando falta una medición.
- Auditoría DOM de contraste, jerarquía tipográfica, canvas y texto alternativo.
- La composición conserva `role="img"` y etiqueta; los canvas son `aria-hidden`.
- `prefers-reduced-motion` se respeta en el runtime y en la composición.
- No se añadieron efectos sólo para subir una puntuación; el informe muestra las dimensiones
  bajas en lugar de ocultarlas.

## 7. Pruebas y regresiones

Suite completa: **39/39 PASS** en 89,0 s. Incluye las pruebas 0.1/0.2 y seis nuevas de 0.3:

1. 58 efectos, 12 categorías, aplicación y sintaxis.
2. Composición válida, rechazo de efectos desconocidos y assets reales.
3. Reference-to-Effects con timeline, máscara y avisos de estimación.
4. Galería con 58 efectos, preview y composición.
5. OCR real con Tesseract y declaración de hardware.
6. Benchmark con 58 efectos y `circuit-lines` correcto.

Se actualizaron los recuentos antiguos (6 → 58 efectos, 6 → 13 dimensiones) y el recurso MCP.
No se eliminaron pruebas ni se relajaron aserciones para ocultar fallos.

## 8. Errores, límites y pendientes

1. `qwen2.5vl:3b` no es fiable en esta instalación; se usa `llava:7b`.
2. OCR confunde cifras y tipografías decorativas; no se corrige como si fuera verdad.
3. La reconstrucción tiene tipografía y coherencia bajas; la comparación lo refleja.
4. Objetos, pose, profundidad y parallax siguen siendo proxies o no disponibles.
5. La rotación de cámara no está validada; las transiciones suaves se estiman.
6. Remotion advierte incompatibilidad de `zod`; el render funciona, pero no está certificado.
7. Sin pruebas en Linux/macOS.
8. Sin publicación en GitHub ni material de cliente; las referencias son renders propios.

## 9. Reproducir

```bash
npm install
npm run build
npm test
ve vision status
ve spec demo/out/remotion.mp4 --vision --out ./analisis
ve refeffects demo/out/remotion.mp4 --spec ./analisis/spec.json --out ./reconstruccion
ve compose ./reconstruccion/composition.json --out ./render
ve gallery --port 4173
ve benchmark --out library/benchmarks.json
```

La grabación de la composición se hizo con Playwright (`recordVideo`) y se convirtió con FFmpeg;
es una captura real del navegador, no un vídeo renderizado por el efecto.
