---
name: visual-engine
description: Motor local y gratuito de calidad visual. Prioriza la referencia y la intención del usuario sobre cualquier estilo, mide composición, paleta, luz y tipografía, critica con evidencia, depura el DOM, aplica gates y ejecuta un ciclo con reversión. Úsala para diseño, motion graphics, 3D, HUD, vídeo o cualquier petición de "que se vea profesional".
---

# Visual Engine 1.0.0-rc.2

## Regla cero: Reference First

La **intención del usuario** y la **referencia visual** mandan sobre los 15 estilos, las plantillas
y el gusto del agente. Antes de escribir código:

```bash
ve plan "<intención tal cual>" --reference referencia.jpg --out ./sistema
```

Devuelve `reference-first.md` y `reference-first.json` con las **siete dimensiones que hay que
preservar**: composición y distribución, identidad visual, colores y materiales, tipografía y
jerarquía, efectos existentes, animaciones y movimiento, proporciones y profundidad. Incluye la
paleta con roles y contraste, la masa por cuadrantes, la luminancia y la escala tipográfica
medida. La tipografía se aproxima por alturas: **no identifica familia ni peso**.

- **No impongas** oscuridad, futurismo, partículas, glow, glassmorphism ni degradados neón si la
  referencia no los tiene. Un minimalismo no es un defecto.
- Si no hay referencia, **pídela**. Sin ella no se inventan color, composición ni tipografía.
- Los estilos (`ve art --style`) son sugerencias de sistema, nunca una orden: si contradicen la
  referencia, gana la referencia. No uses `--style` antes de haber medido.

## Ciclo de 8 pasos

1. **Analizar** — `ve plan … --reference …`; `ve analyze`, `ve inspect`, `ve timeline` para vídeo.
2. **Comprender** — describe las 7 dimensiones con evidencia o marca lo que es estimado.
3. **Diseñar** — `ve refdesign` o `ve art` sólo después del brief; `ve smart-effects` para lo que
   la referencia sostenga. No cargues los 58 efectos.
4. **Implementar** — `ve effects apply`, `ve compose` o tu propio código. Respeta la composición
   y la paleta medidas.
5. **Renderizar** — `ve capture <target> --serve <dir> --frames 6 --json`. Revisa
   `consoleErrors` y recursos fallidos.
6. **Inspeccionar** — `ve debug`, `ve critic`, `ve fidelity`; lee las dimensiones débiles.
7. **Corregir** — `ve iterate` o `ve loop` con copia y reversión. **Máximo 2 correcciones
   medidas**; si el defecto sigue, se declara.
8. **Verificar** — `ve gate`; con vídeo, `ve temporal`. Sin captura y gate **no está terminado**,
   aunque el código compile o la página se abra.

## Terminado ≠ funciona

Una tarea termina cuando hay captura real, crítica/gate ejecutados y los defectos pendientes
declarados con su gravedad. Si un control visual falla y el presupuesto se agotó, dilo; no lo
maquilles ni bajes el umbral.

## Herramientas sin cargar 45

El servidor MCP agrupa las herramientas: `analysis`, `direction`, `build`, `verify`, `agents`.
Un cliente puede exponer sólo un grupo:

```bash
VE_MCP_GROUPS=analysis,verify ve mcp    # 20 herramientas en vez de 45
VE_MCP_TOOLS=visual_plan,visual_capture ve mcp
```

`visual_plan` es la puerta de entrada: devuelve el brief medido y el paso siguiente con sus
herramientas. La CLI (49 comandos) y `ve serve` conservan todas las capacidades.

## Comandos que importan

| Necesidad | Comando |
| --- | --- |
| Brief + plan | `ve plan "<intención>" --reference <archivo> --out <dir>` |
| Medir referencia | `ve analyze <archivo>`, `ve inspect <archivo>`, `ve timeline <vídeo>` |
| Sistema visual | `ve refdesign <ref> --out <dir>`, `ve art "<brief>" --out <dir>` |
| Movimiento | `ve motion <vídeo>`, `ve motiondirector --out <dir>` |
| Efectos | `ve effects list`, `ve effects show <id>`, `ve effects apply <id> --out <dir>` |
| Componer | `ve compose <composition.json> --out <dir>` |
| Capturar | `ve capture <target> --serve <dir> --frames 6 --json` |
| Inspeccionar | `ve debug`, `ve critic`, `ve fidelity` |
| Corregir | `ve iterate … --replace`, `ve loop … --confirm` |
| Verificar | `ve gate --from <intelligence.json>`, `ve temporal <ref> <cand>` |
| Contexto | `ve context "<tarea>" --max-recipes 3` |
| Integración | `ve agents`, `ve install`, `ve doctor`, `ve security` |

## Cómo leer los estados

- `verified`: se midió (halo, nitidez, cortes, luz, OCR, contraste DOM).
- `estimated`: proxy (objetos, profundidad, tipografía, parallax, glitch).
- `available:false`: falta herramienta o el dato no es interpretable — por ejemplo, coherencia de
  matiz en una imagen casi neutra. Devuelve el motivo; **no lo rellenes**.
- En Reference-to-Effects, `status`, `confidence` y `warnings` son parte del contrato.

## Reglas de calidad

1. Respeta composición, paleta, luz y proporciones de la referencia; no "mejores" invirtiendo el tono.
2. Una idea visual por pantalla; quita lo que no suba fidelidad, calidad o legibilidad.
3. No añadas efectos para subir una puntuación; explica las dimensiones bajas.
4. Rendimiento: DPR ≤ 2, un canvas, pausa con `document.hidden`, `prefers-reduced-motion`.
5. Accesibilidad: contraste AA, foco visible, alt y `role="img"` en composiciones.
6. Sin recursos externos por defecto; todo local y gratuito.
7. Licencias: GSAP Club no; Remotion no es MIT; React Bits CC-BY exige atribución.

## Límites

- Sin Tesseract no hay lectura de texto; las regiones son estimadas.
- `llava:7b` describe, no lee copy exacto; no hay detección de objetos ni pose.
- Profundidad y parallax son proxies geométricos, no mapas métricos.
- La coherencia de matiz sólo se puntúa con cobertura cromática suficiente.
- El presupuesto de tokens del loop es estimado (caracteres/4), no telemetría del proveedor.
- Probado en Windows; Linux/macOS no se declaran compatibles sin ejecución real.
- Una puntuación automática no es un juicio artístico humano.
