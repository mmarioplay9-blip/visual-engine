# API local · Visual Engine 1.0.0-rc.1

```bash
ve serve                 # http://127.0.0.1:4747
ve serve --allow-install # habilita POST /v1/deps/install
```

Por defecto sólo escucha en `127.0.0.1`. Un host distinto exige
`--allow-remote` y la API lo rechaza sin él. Cuerpo máximo: 2 MB.

## Rutas nuevas de 0.6

| Método | Ruta | Notas |
| --- | --- | --- |
| GET | `/v1/agents` | Inventario real por agente |
| GET | `/v1/profiles` | Lite, Professional, Cinematic |
| GET | `/v1/profiles/:id` | Perfil y descripción |
| POST | `/v1/install/plan` | Plan sin escribir |
| POST | `/v1/install` | Requiere `confirm: true` |
| POST | `/v1/uninstall` | Requiere `confirm: true` |
| POST | `/v1/repair` | Restaura JSON desde copia con `confirm` |
| GET | `/v1/install/verify` | Handshake MCP real |
| POST | `/v1/activation` | `{ request, agent? }` |
| GET | `/v1/security` | Auditoría local |
| POST | `/v1/usage` | `{ reported }` o `{ inputText, outputText }` |

## Rutas existentes

`/v1/health`, `/v1/capabilities`, `/v1/doctor`, `/v1/effects`,
`/v1/effects/:id`, `/v1/analyze`, `/v1/frames`, `/v1/capture`, `/v1/compare`,
`/v1/review`, `/v1/adapters`, `/v1/scaffold`, `/v1/deps`, `/v1/timeline`,
`/v1/camera`, `/v1/inspect`, `/v1/effects/detect`, `/v1/spec`,
`/v1/recommend`, `/v1/temporal`, `/v1/vision`, `/v1/compose`,
`/v1/reference-effects`, `/v1/benchmark`, `/v1/art-direction`,
`/v1/reference-design`, `/v1/motion-director`, `/v1/showcase`,
`/v1/intelligence`, `/v1/debug`, `/v1/critic`, `/v1/fidelity`, `/v1/gates`,
`/v1/context`, `/v1/smart-effects`, `/v1/loop`, `/v1/loops`,
`/v1/loops/restore`, `/v1/iterate`, `/v1/backups`, `/v1/backups/restore`,
`/v1/benchmarks`.

## Ejemplo

```bash
curl -s http://127.0.0.1:4747/v1/agents
curl -s -X POST http://127.0.0.1:4747/v1/activation -H 'content-type: application/json' \
  -d '{"request":"HUD de videojuego con glitch","agent":"claude"}'
curl -s -X POST http://127.0.0.1:4747/v1/install/plan -H 'content-type: application/json' \
  -d '{"projectDir":".","agents":["claude"],"profile":"lite"}'
```

Las operaciones que escriben exigen confirmación explícita. No hay autenticación
porque la API es local; no la expongas a una red sin poner un proxy con auth.
