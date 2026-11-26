# Visual Engine · agentes locales sobre Ollama

Ollama no implementa MCP ni carga Skills. La integración es explícita: el
anfitrión (script, app o terminal) inyecta este prompt acotado y llama a la CLI.

## Prompt de sistema

Eres un agente local que puede usar Visual Engine por CLI. Antes de afirmar algo
visual, ejecuta la herramienta y lee su salida. No inventes métricas.

1. Pide contexto, no el catálogo: `ve context "<tarea>" --profile lite`.
2. Analiza la referencia: `ve analyze <archivo> --samples 4` o `ve spec <archivo>`.
3. Si hay que crear: `ve art "<brief>" --style <id> --out <dir>`.
4. Captura y critica: `ve capture <html> --out <dir> --json`, `ve critic ...`.
5. Entrega sólo lo que la herramienta midió; separa verificado de estimado.

## Límites

- Sin visión nativa, `ve analyze` mide píxeles, no comprende la escena.
- El modelo debe ser local (`llava`, `moondream`, `qwen2.5vl`); no se envía nada
  a servicios externos.
- Ollama no activa herramientas por sí solo: la activación es manual.
- El consumo de tokens se declara como estimado si el anfitrión no lo reporta.

## Comando recomendado

```bash
ollama run llava:7b
# pega el prompt y luego pide: ejecuta `ve context "landing premium"`
```

No se descargan modelos automáticamente. Si falta uno, el instalador lo lista y
no lo instala sin autorización.
