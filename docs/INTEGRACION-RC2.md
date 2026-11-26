# Integraciones verificadas · Visual Engine 1.0.0-rc.2

Instalación global preparada y comprobada en esta máquina (Windows 11, Node 26,
Codex CLI 0.172.0, Freebuff 0.2.38). Cada fila distingue **instalado**, **descubierto**
y **ejecutado**: el handshake se hizo arrancando el servidor con el comando y el entorno
que el propio archivo de configuración del agente declara.

## Qué quedó instalado

| Agente | Configuración MCP | Instrucciones | Skill | Verificación real |
| --- | --- | --- | --- | --- |
| **Codex** | `~/.codex/config.toml` (bloque añadido, resto intacto) | `~/.codex/AGENTS.md` **no se tocó** (ya existía) | `~/.codex/skills/visual-engine/SKILL.md` | Descubrió la skill y **ejecutó** `visual_effects_list` → 58 efectos |
| **Claude Code** | `~/.claude.json` (fusión con respaldo) | `~/.claude/CLAUDE.md` | `~/.claude/skills/visual-engine/SKILL.md` | Handshake + `visual_doctor` ok · 38 herramientas |
| **Cursor** | `~/.cursor/mcp.json` (creado) | `~/.cursor/rules/visual-engine.mdc` | — | Handshake + `visual_doctor` ok · 38 herramientas |
| **Freebuff** | no soportado (no se declara) | — (por proyecto) | `~/.agents/skills/visual-engine/SKILL.md` | Skill en disco con frontmatter válido y alcance visual |
| **OpenCode** | `~/.config/opencode/opencode.json` (creado) | `~/.config/opencode/AGENTS.md` | — | Handshake + `visual_doctor` ok · 38 herramientas |

Respaldos de todo lo modificado: `.visual-engine/backups/2026-11-26T02-57-00-100Z/`
(incluye `config.toml` y `.claude.json` originales).

Los cuatro clientes MCP exponen **38 herramientas** (grupos `analysis`, `direction`,
`build`, `verify`). El grupo `agents` —instalar, perfilar, auditar— queda en la CLI para
no gastar esquemas en cada sesión: `ve install`, `ve profile`, `ve usage`, `ve security`.

## Cómo usarlo desde cada agente

### Codex CLI

```bash
codex            # sesión normal: la skill aparece y el MCP ya está cargado
```

En la sesión, pide trabajo visual con lenguaje normal («rehace este hero siguiendo
`ref.jpg`»). Codex cargará `visual-engine` por descripción. Para trabajo no interactivo:

```bash
printf '%s' "Usa visual_plan con la tarea y la referencia ref.jpg" | codex exec --sandbox workspace-write
```

`~/.codex/config.toml` incluye `default_tools_approval_mode = "approve"` en el bloque de
Visual Engine. Sin esa línea, `codex exec` (política `never`) rechaza toda llamada MCP
aunque el servidor esté bien: fue el único fallo real encontrado en la integración.
Si prefieres aprobar a mano, borra esa línea o pon `"prompt"`; en sesión interactiva
verás la confirmación por herramienta.

### Claude Code

```bash
claude
```

La skill global vive en `~/.claude/skills/visual-engine/` y el MCP en `~/.claude.json`
(ámbito usuario). Pide la tarea; si quieres forzarla: «usa la skill visual-engine».
Comprobación barata dentro de la sesión: `/mcp` debe listar `visual-engine` conectado.

### Cursor

Abre el proyecto. `~/.cursor/mcp.json` aporta el servidor y
`~/.cursor/rules/visual-engine.mdc` la regla (se adjunta por descripción). En
**Settings → MCP** debe aparecer `visual-engine` con las 38 herramientas; si no,
recarga la ventana. En el chat: «sigue la regla visual-engine y usa `visual_plan`».

### Freebuff

```bash
freebuff          # nueva sesión en la carpeta del proyecto
```

Freebuff descubre `~/.agents/skills/visual-engine/SKILL.md` por nombre y descripción;
no se declara MCP porque Freebuff no documenta una ruta MCP. Pide la tarea visual y, si
hace falta, «usa la skill visual-engine». La skill ejecuta la CLI `ve` (global por npm).

### OpenCode

```bash
opencode
```

`~/.config/opencode/opencode.json` declara `mcp.visual-engine` con `environment`
(`VE_MCP_GROUPS`) y `~/.config/opencode/AGENTS.md` las reglas. Comprueba con
`opencode mcp list` o dentro de la sesión.

## Perfil por defecto y escalado

- **professional** es el perfil instalado: 6000 tokens de presupuesto, 7 herramientas,
  2 correcciones, 15 minutos. Es el que usan las instrucciones y la skill por defecto.
- **lite** sólo para comprobaciones rápidas (4 herramientas, 1 pasada).
- **cinematic** sólo cuando la pieza sea la principal del proyecto, haya referencia y
  asumas el coste. El perfil cambia alcance, nunca umbrales ni estética.

El perfil se guarda por proyecto en `.visual-engine/profile.json`; no existe un
«perfil global» persistente, así que la instalación global lo fija en las instrucciones
y en este repositorio, y cada proyecto nuevo lo hereda al ejecutar `ve install`.

## Activación sólo en tareas visuales

- La descripción de la skill declara el alcance: interfaz, web, motion, 3D, HUD, vídeo,
  imagen. No backend, datos, documentación, tests ni refactors sin interfaz.
- `visual_activation` (CLI: `ve activation`) clasifica la petición y devuelve
  `activate:false` con el motivo para tareas no visuales; es consultivo, no obligatorio.
- No se escribió ningún `~/AGENTS.md` ni `~/CLAUDE.md` en el home: se instala únicamente
  donde cada agente lee de verdad, para no filtrar reglas visuales a proyectos ajenos.
- «Sin Visual Engine» en el prompt desactiva la skill.

## Cómo revertir

```bash
# Codex: quita el bloque desde "# Visual Engine 1.0" hasta el final
# Claude: elimina mcpServers.visual-engine de ~/.claude.json
# Cursor: borra ~/.cursor/mcp.json y ~/.cursor/rules/visual-engine.mdc
# Freebuff: borra ~/.agents/skills/visual-engine
# OpenCode: borra ~/.config/opencode/opencode.json y AGENTS.md
# Y restaura desde .visual-engine/backups/2026-11-26T02-57-00-100Z/
```

## Límites de esta verificación

- **Claude Code no tiene sesión iniciada** en esta máquina (`Not logged in`): se verificó
  su configuración y el handshake, no una invocación desde el agente.
- **Cursor y OpenCode** no se lanzaron en modo headless: handshake correcto, uso real
  pendiente de tu primera sesión.
- **Freebuff**: la skill está instalada y es válida, pero esta sesión se inició antes de
  la instalación; se descubrirá en la próxima.
- **Gemini CLI y MAEX no están instalados**: se dejan preparados, no verificados.
- **macOS y Linux no se probaron** en esta máquina.
- El informe reproducible está en `docs/evidencia/1.0-rc2/integrations/`:
  `verify.mjs` (handshake por agente) e `integrations.json` (resultado).
