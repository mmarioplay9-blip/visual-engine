# Visual Engine · instrucciones para agentes

Este proyecto tiene instalado **Visual Engine 1.0.0-rc.2**: un motor local que mide referencias,
dirige arte, critica, depura, compone y verifica calidad visual. No es una guía de estilo: ejecuta
herramientas reales y devuelve evidencia.

Comprueba la integración con `ve agents`. No confundas **diseñado** con **instalado** ni con
**verificado**: sólo el handshake MCP real marca verificado. `ve install` sin `--yes` es un plan y
no escribe. El perfil (`--profile lite|professional|cinematic`) cambia capacidades y presupuesto,
nunca la estética.

## Perfil y activación

Perfil por defecto: **professional** (6000 tokens, 7 herramientas, 2 correcciones). Sube a
**cinematic** sólo para la pieza principal de un proyecto, con referencia y coste asumido; `lite`
para comprobaciones rápidas. El perfil cambia el alcance, nunca los umbrales.

No actives Visual Engine en tareas sin salida visual (backend, datos, documentación, tests,
refactors, scripts). Si el usuario pide «sin Visual Engine», no lo uses.

## Regla cero

La **intención del usuario** y la **referencia** mandan sobre los estilos y sobre tu gusto. Antes
de diseñar:

```bash
ve plan "<intención tal cual>" --reference referencia.jpg --out ./sistema
```

Preserva las siete dimensiones del brief: composición, identidad, colores y materiales,
tipografía y jerarquía, efectos existentes, animaciones y proporciones. **No impongas** oscuridad,
futurismo, partículas, glow ni glassmorphism si la referencia no los tiene. Si falta la referencia,
pídela: no inventes color ni composición.

## Ciclo obligatorio (8 pasos)

1. **Analizar**: `ve plan … --reference …`, `ve analyze`, `ve inspect`, `ve timeline`.
2. **Comprender**: describe las 7 dimensiones con evidencia; marca lo estimado.
3. **Diseñar**: `ve refdesign` o `ve art` sólo después del brief; no cargues los 58 efectos.
4. **Implementar**: `ve effects apply`, `ve compose` o código propio, respetando lo medido.
5. **Renderizar**: `ve capture <target> --serve <dir> --frames 6 --json`; revisa errores.
6. **Inspeccionar**: `ve debug`, `ve critic`, `ve fidelity`.
7. **Corregir**: `ve iterate` o `ve loop` con copia y reversión; **máximo 2** correcciones.
8. **Verificar**: `ve gate`; con vídeo, `ve temporal`. Sin captura y gate no está terminado.

## Terminado

El código funcionando no es una entrega. Termina cuando hay captura real, gate ejecutado y los
defectos pendientes declarados con su gravedad. Si el presupuesto se agotó, declara el defecto; no
bajes el umbral ni ocultes la dimensión.

## Herramientas MCP

**45 herramientas en 5 grupos**: `analysis` (medir), `direction` (intención y sistema), `build`
(implementar), `verify` (comprobar), `agents` (instalar y auditar). `visual_plan` es la entrada y
devuelve el brief más el paso siguiente.

```bash
VE_MCP_GROUPS=analysis,verify ve mcp     # exposición selectiva, sin perder capacidades
VE_MCP_TOOLS=visual_plan,visual_capture ve mcp
```

La CLI (48 comandos) y `ve serve` ofrecen todo. La galería es opcional.

## Estados

- `verified`: medido (halo, nitidez, cortes, luz, OCR, contraste DOM).
- `estimated`: proxy (objetos, profundidad, tipografía, parallax).
- `available:false`: falta herramienta o el dato no es interpretable (por ejemplo, matiz en una
  imagen casi neutra). Devuelve el motivo; no lo rellenes.

## Reglas

- Respeta la referencia; no inviertas el tono ni sustituyas su material por uno de moda.
- Una idea por pantalla; sin efectos decorativos que no estén en la referencia.
- Rendimiento: DPR ≤ 2, un canvas, `prefers-reduced-motion`.
- Accesibilidad: contraste AA, foco visible, alt y `role="img"`.
- Sin recursos externos por defecto; todo local y gratuito.
- Licencias: GSAP Club no; Remotion no es MIT; React Bits CC-BY exige atribución.

## Honestidad

- No declares nada funcionando sin ejecutar su comando y ver la salida.
- Distingue implementado, medido, estimado y pendiente.
- La tipografía se aproxima por alturas: no identifiques familia ni peso.
- La coherencia de matiz no se puntúa si la imagen es casi neutra; se declara no disponible.
- Una puntuación automática no es aprobación artística humana.
- El repositorio no se publica en GitHub en esta fase.
