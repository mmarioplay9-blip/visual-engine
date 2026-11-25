---
name: visual-engine
description: Motor local y gratuito de calidad visual. Analiza referencias, dirige arte con 15 estilos, critica con evidencia, depura el DOM, mide fidelidad, aplica gates y ejecuta un loop con reversión. Úsala para diseño, motion graphics, 3D, HUD, vídeo o cualquier petición de "que se vea profesional".
---

# Visual Engine 0.5

Convierte una referencia en **dirección artística**, **especificación medida**, **composición
ejecutable** y resultado verificado: referencia → identidad/tokens → escenas/cámara/efectos →
composición → captura → comparación temporal → corrección con reversión. Todo local, sin APIs de
pago.

## Antes de empezar

```bash
ve doctor
ve vision status
ve context "tarea visual concreta" --max-recipes 3
ve effects list --json        # catálogo completo: no lo pegues entero en el contexto
```

`vision status` declara Tesseract, VRAM, modelos instalados y el modelo seleccionado. Si falta
algo, devuelve `available:false` con el motivo. **No inventes OCR, objetos ni descripciones.**
`context` selecciona herramientas, recetas y documentos; para el detalle de una receta usa
`ve effects show <id>` o `loadRecipe`.

## Ciclo de trabajo

### 1. Descomponer la referencia

```bash
ve timeline referencia.mp4 --out ./analisis --storyboard
ve motion referencia.mp4 --json
ve inspect referencia.mp4
ve detect referencia.mp4
ve spec referencia.mp4 --vision --out ./analisis
```

- **timeline**: escenas, cortes, ritmo, fotogramas clave y storyboard.
- **motion**: desplazamiento, zoom, rotación, velocidad, aceleración y temblor.
- **inspect**: composición, formas, regiones de texto, saliencia y profundidad proxy.
- **detect**: efectos con evidencia y estado `verified`/`estimated`.
- **spec --vision**: añade OCR y descripción semántica locales (`ocr.json`, `semantic.json`).

### 2. Dirigir el arte antes de componer

```bash
ve art "terminal financiera sobria" --style financial-dashboard --out ./sistema
ve refdesign referencia.png --out ./sistema --vision
ve motiondirector --style cinematic --out ./motion
ve showcase --measure --out ./showcase
```

- `art`: 15 estilos, paleta semántica, escala modular, tokens DTCG, materiales y CSS.
- `refdesign`: identidad, layout, componentes, motion y código; separa `verified` de `estimated`.
- `motiondirector`: microinteracciones, entradas, transición, cámara y reduced-motion.
- `showcase`: 20 composiciones, 10 arquetipos y medición real en Chromium.

**No inventes la fuente tipográfica** a partir de una imagen: `refdesign` sólo aproxima familia y
escala. La arquitectura de componentes es una propuesta.

### 3. Criticar, depurar y aprobar

```bash
ve debug ./mi-web --serve ./mi-web --source ./mi-web
ve critic --reference referencia.png --target-dir ./mi-web --brief "landing premium"
ve fidelity --reference referencia.png --target-dir ./mi-web --spec ./analisis/spec.json
ve gate --from ./inteligencia/intelligence.json --require-human
```

- `debug`: selectores, cajas, CSS computado, capas, animaciones, canvas y archivo fuente sólo si
  la cadena aparece de verdad. Si no, `source:null`.
- `critic`: cada hallazgo lleva evidencia, ubicación, gravedad, confianza y corrección. Un
  minimalismo no se penaliza por no tener efectos; un efecto pesado en un estilo sobrio sí.
- `fidelity`: dimensiones estructurales por separado; la similitud de píxeles no es calidad.
- `gate`: un defecto crítico bloquea aunque la media sea alta. La aprobación artística humana es
  una decisión aparte; `--require-human` la exige.

### 4. Pasar de la referencia a efectos

```bash
ve refeffects referencia.mp4 --spec ./analisis/spec.json --out ./reconstruccion
```

Produce `composition.json`, HTML, timeline, capas y código. Cada asignación lleva confianza y una
nota que explica la hipótesis. **No afirmes que se identificó el plugin exacto**: es una
correspondencia estimada salvo que el estado sea `verified` y aun así es una aproximación.

### 5. Elegir o componer efectos

```bash
ve effects show volumetric-rays
ve effects apply split-reveal --out ./mi-web --set 'title=VISUAL ENGINE'
ve compose ./reconstruccion/composition.json --out ./render
```

La biblioteca tiene **58 efectos en 12 categorías**. La composición admite hasta 12 capas,
mezclas, máscaras radiales/lineales, transformaciones, opacidad y curvas
`linear/easeIn/easeOut/easeInOut/spring`.

### 6. Medir

```bash
ve benchmark --out library/benchmarks.json
ve gallery --port 4173          # opcional; el núcleo no depende de la UI
ve capture index.html --serve ./render --frames 6 --json
ve review --reference referencia.mp4 --target-dir ./mi-web --frames 6 --out ./out
ve temporal referencia.mp4 resultado.mp4 --out ./analisis
```

- `benchmark`: FPS, frame time, heap JS y carga; no mide VRAM GPU.
- `gallery`: explorar, previsualizar, cambiar parámetros y componer.
- `review`: fidelidad + calidad por dimensiones; revisa `consoleErrors`.
- `temporal`: dos vídeos alineados; no sustituye a `review` de una página estática.

### 7. Corregir con red

```bash
ve iterate --reference referencia.mp4 --target-dir ./mi-web \
  --replace index.nuevo.html --min-delta 0.5
ve loop --reference referencia.png --target-dir ./mi-web --brief "mejorar jerarquía" \
  --replace index.nuevo.html --confirm --max-iterations 2 --max-tokens 12000
ve loops list --project ./mi-web
ve loops restore <id> --project ./mi-web --out <directorio-del-loop>
ve backup restore <id> --project ./mi-web
```

`iterate` y `loop` copian, miden antes/después y revierten si no mejoran. `loop` añade límites de
iteraciones, minutos y tokens estimados, y devuelve `awaiting-agent` si no recibe un cambio. No
llama a un proveedor: el cambio lo aporta el agente. Los parches exigen un repositorio git.

## Cómo leer los estados

- `verified`: la señal se midió (halo, nitidez, partículas en movimiento, cortes, luz).
- `estimated`: hay proxy, no certeza (texto sin OCR, objetos, profundidad, parallax, glitch).
- `available:false`: falta herramienta o modelo; devuelve el motivo, no lo rellenes.
- En Reference-to-Effects, `mapping` y `warnings` son parte del contrato. Muéstralos.

## Reglas de calidad

1. **Nada de diseños planos** si piden calidad avanzada: profundidad, jerarquía, foco y detalle.
2. **Una idea visual por pantalla**; quita lo que no suba fidelidad, calidad o legibilidad.
3. **Respeta la referencia** por encima del gusto: paleta, contraste, composición y ritmo.
4. **No añadas efectos** sólo para subir una puntuación; explica las dimensiones bajas.
5. **Rendimiento**: DPR ≤ 2, un canvas, pausa con `document.hidden`, `prefers-reduced-motion`.
6. **Accesibilidad**: contraste, foco visible, texto alternativo y `role="img"` en composiciones.
7. **Licencias**: GSAP Club no; Remotion no es MIT; React Bits CC-BY exige atribución; FFmpeg
   según build; Three.js/Motion/Playwright son permisivas.
8. **Todo local**: Ollama sólo en localhost; no envíes material a servicios externos.

## MCP

**38 herramientas**. Las de 0.5: `visual_context`, `visual_debug`, `visual_critic`,
`visual_fidelity`, `visual_gate`, `visual_smart_effects`, `visual_loop` y `visual_loops`; más
las de 0.1–0.4 (`visual_art_direction`, `visual_reference_design`, `visual_motion_director`,
`visual_showcase`, `visual_compose`, `visual_reference_effects`, `visual_benchmark`,
`visual_iterate` con `confirm=true`, etc.). Recurso `visual://effects`, prompt
`visual-quality-review`. CLI (39 comandos) y `ve serve` ofrecen las mismas operaciones.

## Límites conocidos

- Sin Tesseract no hay lectura de texto; las regiones son estimadas.
- `llava:7b` describe, no lee copy exacto; `qwen2.5vl:3b` falló en esta instalación.
- Sin modelo de objetos/pose: sólo saliencia; no hay clases ni cajas semánticas.
- Profundidad y parallax son proxies geométricos, no mapas métricos.
- La rotación se validó en patrón sintético y en una escena Three.js real (1,5°→1,41°); no
  certifica cualquier WebGL.
- El A/B de 0.5 incluye vídeo de tres planos; la comparación temporal contra un montaje derivado
  dio 56,9/100 y no demuestra superioridad frente a una pieza externa de motion graphics.
- Las referencias A/B son cuatro obras CC0 del MET (cinco casos); no son material de cliente.
- Los gates por defecto del A/B rechazan los cinco casos; no se relajaron para aprobarlos.
- El presupuesto de tokens del loop es estimado; no hay telemetría del proveedor.
- Probado en Windows; Linux/macOS están soportados por diseño, no probados aquí.
- El repositorio sigue **sin publicar** en GitHub.
