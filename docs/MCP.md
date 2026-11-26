# MCP · Visual Engine 1.0.0-rc.2

Servidor MCP por **stdio**: `node dist/cli/index.js mcp`. Versión 1.0.0-rc.2.
**45 herramientas en 5 grupos**, un recurso y un prompt.

## Instalación

```bash
ve install --agents claude,opencode,freebuff --yes
```

El instalador fusiona la entrada `visual-engine` sin borrar servidores previos,
respalda el archivo y verifica el handshake. Configuraciones equivalentes:

```json
{
  "mcpServers": {
    "visual-engine": { "command": "node", "args": ["C:/ruta/visual-engine/dist/cli/index.js", "mcp"] }
  }
}
```

OpenCode usa `"mcp": { "visual-engine": { "type": "local", "command": ["node", "..."], "enabled": true } }`.
Codex usa `[mcp_servers.visual-engine]` en TOML.

## Herramientas por etapa

| Etapa | Herramientas |
| --- | --- |
| Entrada | `visual_plan` (brief medido + plan de 8 pasos; puerta de entrada) |
| Instalación y contexto | `visual_agents`, `visual_install`, `visual_profile`, `visual_activation`, `visual_security`, `visual_usage`, `visual_context`, `visual_doctor` |
| Referencia | `visual_analyze`, `visual_timeline`, `visual_camera`, `visual_inspect`, `visual_effects_detect`, `visual_spec`, `visual_reference_effects`, `visual_reference_design` |
| Dirección y composición | `visual_art_direction`, `visual_motion_director`, `visual_showcase`, `visual_compose`, `visual_smart_effects`, `visual_effects_list`, `visual_effect_apply` |
| Captura y medida | `visual_capture`, `visual_review`, `visual_compare`, `visual_temporal`, `visual_benchmark` |
| Crítica y aceptación | `visual_debug`, `visual_critic`, `visual_fidelity`, `visual_gate` |
| Mejora | `visual_iterate`, `visual_loop`, `visual_loops` |
| Utilidades | `visual_vision`, `visual_metadata`, `visual_frames`, `visual_recommend`, `visual_adapters`, `visual_scaffold`, `visual_deps`, `visual_install_deps` |

`visual_install` exige `confirm=true` para `apply`, `uninstall` y `repair`.
`visual_loop` e `visual_iterate` exigen confirmación cuando escriben archivos.

## Recurso y prompt

- Recurso `visual://effects`: catálogo; no debe pegarse entero en el contexto.
- Prompt `visual-quality-review`: guía de revisión con evidencia.

## Descubrimiento selectivo

No hace falta cargar las 45 herramientas en cada tarea. El servidor filtra por grupo:

```bash
VE_MCP_GROUPS=analysis,verify ve mcp        # 19 herramientas
VE_MCP_TOOLS=visual_plan,visual_capture ve mcp
node dist/cli/index.js mcp                  # todas (comportamiento por defecto)
```

Grupos: `analysis` (14), `direction` (10), `build` (9), `verify` (5), `agents` (7).
La CLI y `ve serve` conservan todas las capacidades; el filtro sólo decide qué se expone al
modelo. Un test comprueba que el subconjunto tiene 19 herramientas y que `visual_plan` funciona.

## Optimización

- `visual_plan` devuelve el brief y sólo el paso siguiente con sus herramientas, en vez de la
  biblioteca completa.
- `visual_context` devuelve 4–10 herramientas y 0–4 recetas según el perfil.
- `visual_profile` cambia capacidades y presupuestos, nunca la estética.
- `visual_usage` distingue `reported` de `estimated`; no convierte estimaciones
  en mediciones.

## Verificación real

`verifyMcpServer()` abre el servidor, inicializa, lista herramientas y cierra.
Se ejecuta en `ve install --yes`, en `ve install verify` y en la prueba 0.6.
