# Autonomía real 0.6

Dos agentes reales, mismo brief, misma referencia, misma carpeta aislada y el
mismo límite de tiempo. No hay demostración programada: cada agente decidió los
comandos, leyó las salidas y editó su HTML.

## Entorno

- Referencia: `ab/premium-landing/reference.jpg` (Degas, CC0, MET), copiada a
  cada carpeta.
- Prompt: `PROMPT.md`, idéntico en ambas.
- CLI: `node <repo>/dist/cli/index.js`.
- Aislamiento: cada agente trabaja en su propia carpeta, sin red ni instalación
  de dependencias.

## Resultados

| Agente | Ejecución | Evidencia propia | Evaluación externa de VE |
| --- | --- | --- | --- |
| OpenCode 1.19.3 · `deepseek-v4.1-flash-free` | exit 0; 10 pasos | crítica 58→100; calidad 81,3→90,2; contraste 6→0; gates accept | fidelidad 84,9; crítica 100; 0 críticos/altos; gates accept |
| Codex 0.172.0 · `codex exec` | exit 0; 38.859 tokens reportados | creó `hero.html`; `capture`/`critic` fallaron por `ffprobe` ausente en su sandbox; no dio notas | fidelidad 89,1; crítica 100; 0 críticos/altos; gates accept |

La evaluación externa la ejecutó Visual Engine desde esta sesión sobre los
archivos entregados; **no** es una puntuación que el agente se haya dado a sí
mismo. Codex no vio esas cifras.

## Qué demuestra y qué no

- Demuestra que OpenCode completó el ciclo y que Codex produjo una pieza válida
  bajo un sandbox con PATH limitado.
- No demuestra que Cursor, Gemini, Freebuff o MAEX se activen solos: Gemini y
  MAEX no están instalados; Cursor/Freebuff sólo se detectaron.
- Claude Code falló con `api_error` del proveedor en la prueba no interactiva.
- La aprobación artística sigue siendo humana.

## Archivos

- `opencode/transcript.log`, `opencode/RESULT.md`, `opencode/hero.html`,
  `opencode/.ve/eval/`
- `codex/transcript.log`, `codex/RESULT.md`, `codex/hero.html`,
  `codex/.ve/eval/`
