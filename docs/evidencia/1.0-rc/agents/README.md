# A/B real con Codex — Visual Engine 1.0.0-rc.1

Tarea nueva e idéntica: landing de **HALO FOUNDRY** a 1280×720, CSS autocontenido. Mismo modelo, mismo prompt, mismo sandbox y mismo directorio temporal. La única diferencia es Visual Engine.

| Métrica | A sin VE | B con VE |
| --- | ---: | ---: |
| Calidad global | 77.1 | **62.3** |
| Fidelidad estructural | 72.8 | **48.4** |
| Composición | 93.9 | 40.6 |
| Tipografía | 91.2 | 82.5 |
| Accesibilidad | 100.0 | 100.0 |
| Iluminación | 36.3 | 35.4 |
| Coherencia | 22.9 | 14.0 |
| FPS | 61.4 | 61.7 |
| Gates | reject | **reject** |
| Tamaño HTML | 5471 B | 4781 B |
| Duración | 109 s | 111 s |

## ¿Invocó las herramientas?

- **A**: 0 comandos `ve`, 0 llamadas MCP. Usó su skill global de diseño y Chrome para revisar su página.
- **B**: **9 comandos `ve`** con salida real — `doctor`, `context`, `effects list`, `vision status`, `agents`, `art`, `capture` — y leyó la skill instalada en `.codex/skills/visual-engine/SKILL.md`.
- Las capturas son `a.png` y `b.png`; `comparison.json` conserva las métricas agregadas. Los registros crudos de invocación (JSONL de Codex) se retiraron antes de publicar por privacidad.

## Límites

- Ambos brazos podían leer el HOME y encontraron la skill global `design-taste-frontend`; A no es un agente en blanco.
- Es una sola pasada por brazo; no se repitió para estimar varianza.
- Las métricas son las del motor, sin cambios de umbrales ni fórmulas.
- `codex exec` deniega MCP por defecto en modo no interactivo; para que B use MCP hace falta `-c mcp_servers.visual-engine.default_tools_approval_mode="approve"`, documentado en la guía de agentes.
