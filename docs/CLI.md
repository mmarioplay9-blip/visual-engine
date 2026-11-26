# CLI · Visual Engine 1.0.0-rc.2

`ve <comando>`. Sin `npm link`, usa `node dist/cli/index.js`.

## Instalación y agentes

| Comando | Qué hace |
| --- | --- |
| `ve agents` | Detecta binarios y estado diseñado/instalado/verificado |
| `ve install` | Plan sin escribir |
| `ve install --yes` | Aplica con respaldos y manifiesto |
| `ve install --global --allow-global --agents codex --yes` | Configuración global autorizada |
| `ve uninstall --yes [--restore]` | Elimina sólo lo gestionado |
| `ve repair [--yes]` | Diagnostica y restaura JSON dañado |
| `ve profile lite\|professional\|cinematic` | Capacidades y presupuestos |
| `ve activation "<texto>" [--agent claude]` | Señal de activación |
| `ve security [--json]` | Auditoría local |

## Análisis y dirección

`plan` (alias `brief`) es la primera llamada: brief medido de la referencia y plan de 8 pasos.
Después, `analyze`, `frames`, `timeline`, `motion`, `inspect`, `detect`, `spec`,
`recommend`, `temporal`, `art`, `refdesign`, `motiondirector`, `showcase`,
`compose`, `refeffects`.

```bash
ve plan "landing editorial" --reference ref.jpg --out ./sistema
ve art "landing editorial" --from-plan ./sistema/reference-first.json --out ./sistema
```

`--from-plan` subordina el modo del estilo a la luminancia medida: si el estilo pide oscuro y la
referencia es clara, adopta el modo de la referencia y declara el conflicto en `warnings`.

## Medida y crítica

`capture`, `compare`, `review`, `debug`, `critic`, `fidelity`, `gate`,
`benchmark`, `vision`.

## Mejora

`iterate`, `loop`, `loops`, `backup`, `context`, `usage`.

## Biblioteca

`effects list|show|apply|select`, `adapters`, `deps`, `gallery`.

## Ejemplos

```bash
ve plan "HUD diegético" --reference ref.jpg --out ./sistema
ve context "landing cinematográfica" --profile cinematic
ve art "HUD diegético" --style game-ui --out ./sistema
ve capture hero.html --width 1280 --height 720 --frames 2 --out .ve/capture
ve critic --reference ref.jpg --target-dir . --target hero.html --out .ve/critic
ve gate --from .ve/critic/intelligence.json --require-human
ve loop --reference ref.jpg --target-dir . --replace index.nuevo.html --confirm
ve usage --input 1200 --output 340 --reported --source claude
```

Códigos de salida: `1` en errores, gates rechazados y loops fallidos o
revertidos. `--json` está disponible en los comandos principales.
