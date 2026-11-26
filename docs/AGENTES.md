# Compatibilidad por agente · Visual Engine 1.0.0-rc.2

Tres estados que no se mezclan:

- **Diseñado**: el formato y los archivos están implementados en el registro.
- **Instalado**: `ve install --yes` escribió los archivos y el manifiesto.
- **Verificado**: además, el binario existe y el servidor MCP respondió a un `initialize` +
  `tools/list` real (**45 herramientas**, versión 1.0.0-rc.2).

| Agente | Detección real | Instrucciones | Skill / regla | MCP | Activación |
| --- | --- | --- | --- | --- | --- |
| OpenAI Codex | `codex 0.172.0` | `AGENTS.md` | `.codex/skills/visual-engine` | TOML `[mcp_servers.visual-engine]` | condicional |
| Claude Code | `claude 2.1.328` | `CLAUDE.md` | `.claude/skills/visual-engine` | `.mcp.json` | automática por skill |
| Cursor | `cursor` (ruta) | `.cursor/rules/visual-engine.mdc` | regla `.mdc` | `.cursor/mcp.json` | condicional |
| Gemini CLI | **ausente** en esta máquina | `GEMINI.md` | — | `.gemini/settings.json` | condicional |
| Freebuff | `freebuff` (ruta) | `AGENTS.md` | `.agents/skills/visual-engine` | no documentado; no se inventa | automática por skill |
| OpenCode | `opencode 1.19.3` | `AGENTS.md` | — | `opencode.json` (`mcp`) | condicional |
| MAEX | `maex.cmd` (lanzador) | `AGENTS.md` | — | TOML compatible, sin verificar | manual |
| Ollama | `ollama 0.40.17` | `.visual-engine/ollama-system.md` | — | no implementa MCP | manual |
| Cliente MCP genérico | — | `AGENTS.md` | — | `.visual-engine/mcp.json` | manual |

## Qué se comprobó de verdad

- **Handshake MCP**: 45 herramientas por stdio contra el binario de este paquete. Es la
  verificación que el instalador registra.
- **Codex 1.0-rc**: sesión real no interactiva en un directorio limpio. Leyó la skill instalada e
  invocó `ve doctor`, `context`, `effects list`, `vision status`, `agents`, `art` y `capture`
  (9 comandos). En una ejecución previa también invocó `visual_agents` por MCP. Resultado de
  calidad y límites en [docs/evidencia/1.0-rc/agents](../docs/evidencia/1.0-rc/agents/README.md).
- **OpenCode 0.6**: ejecución autónoma de 10 pasos con corrección propia.
- **Claude Code**: binario detectado; el proveedor devolvió `api_error` en la prueba no
  interactiva. **No verificado** como consumidor.
- **Freebuff**: el CLI solo ofrece `login`/`doctor` y un modo interactivo; no hay ejecución no
  interactiva que se pueda medir sin abrir una sesión. **No verificado** como consumidor.
- **Cursor / Gemini / MAEX**: sin sesión autónoma medida. MAEX es un lanzador interactivo: se
  detecta en PATH y **no se ejecuta** durante el inventario.

## Activación

`ve activation "<solicitud>"` devuelve señal, confianza, categorías y motivo. Es
**asesoramiento**: no se promete un hook que el agente no ofrece.

| Agente | Mecanismo real |
| --- | --- |
| Claude Code | `description` de la skill; invocación semántica |
| Freebuff | skill descubierta en `.agents/skills` |
| Codex / Cursor / Gemini / OpenCode | instrucciones o reglas + MCP; el modelo decide |
| Ollama | el anfitrión inyecta el prompt; sin activación propia |

## Sin activación automática

Para cualquier agente que no descubra skills, tres pasos y nada más:

1. Instala las instrucciones en el proyecto: `ve install --yes --agents <id>`.
2. Pide contexto antes del catálogo: `ve context "<tarea>" --max-recipes 3 --json`.
3. Cierra el ciclo: `ve review --reference <ref> --target-dir . --out ./out` y
   `ve gate --from ./out/intelligence.json`.

La skill canónica está en `skills/visual-engine/SKILL.md`; el prompt de sistema para modelos
locales, en `.visual-engine/ollama-system.md` tras instalar.

## Configuración manual

### Codex

Copia `.visual-engine/codex-mcp.toml` al final de `~/.codex/config.toml`, o usa
`ve install --global --allow-global --agents codex`. Para `codex exec` no interactivo, añade la
aprobación; sin ella Codex deniega toda llamada MCP:

```toml
[mcp_servers.visual-engine]
command = "C:\\ruta\\a\\node.exe"
args = ["C:\\ruta\\a\\visual-engine\\dist\\cli\\index.js", "mcp"]
default_tools_approval_mode = "approve"
```

### Claude Code

`.mcp.json`:

```json
{ "mcpServers": { "visual-engine": { "command": "node", "args": [".../index.js", "mcp"] } } }
```

### Cursor

`.cursor/mcp.json` con la misma estructura y `.cursor/rules/visual-engine.mdc` como regla.

### OpenCode

`opencode.json`:

```json
{ "mcp": { "visual-engine": { "type": "local", "command": ["node", ".../index.js", "mcp"], "enabled": true } } }
```

### Ollama

No hay MCP. Sigue `.visual-engine/ollama-system.md` y llama a `ve` por CLI o API local.

## Diagnóstico

```bash
ve agents                 # binario, config, skill, activación e integración
ve install --dry-run      # plan sin escribir
ve repair --yes           # JSON dañado, archivos ausentes
ve security               # loopback, rutas, shell, copias
```
