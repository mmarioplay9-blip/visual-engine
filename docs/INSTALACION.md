# Instalación · Visual Engine 1.0.0-rc.2

Todo es local y gratuito. No hay cuentas, telemetría ni APIs de pago.

## Requisitos

| Herramienta | Versión probada | Nota |
| --- | --- | --- |
| Node.js | 26.13.1 | mínimo 20.11 |
| FFmpeg + FFprobe | 9.1 | en PATH; necesario para vídeo |
| Git | 2.x | instalar, actualizar y `iterate --patch` |
| Chromium de Playwright | 1.65 | `npx playwright install chromium` (~130 MB) |
| Tesseract | 5.4 | opcional: OCR |
| Ollama + modelo de visión | 0.40.17 / `llava:7b` | opcional: descripción semántica |

Sin las dependencias opcionales el motor funciona y declara la ausencia.

## Instalar desde el repositorio

```bash
git clone https://github.com/mmarioplay9-blip/visual-engine.git visual-engine
cd visual-engine
npm ci
npm run build
npm link                 # opcional; también sirve `node dist/cli/index.js`
npx playwright install chromium
ve doctor
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File install\install.ps1 -Ref main
```

Linux/macOS:

```bash
./install/install.sh --no-link
```

Los instaladores clonan (o actualizan) en `%LOCALAPPDATA%\visual-engine` o
`~/.local/share/visual-engine`, instalan dependencias, compilan, instalan Chromium y verifican
con `ve version` y `ve doctor`.

## Instalar en un proyecto

```bash
cd mi-proyecto
ve agents                                  # qué agentes hay de verdad
ve install --dry-run                       # plan, sin escribir
ve install --yes --agents claude,cursor    # escribe con respaldo y manifiesto
ve install --yes --agents codex --verify   # handshake MCP al terminar
```

Reglas del instalador:

- Sin `--yes` no escribe nada.
- No sobrescribe archivos que no gestiona; con `--force` hace copia previa.
- La configuración global exige `--global --allow-global`.
- Cada archivo queda en `.visual-engine/install.json` para actualizar o desinstalar.
- Los modelos pesados de Ollama se listan, nunca se descargan.

## Actualizar

```bash
ve update          # git pull + npm install + build + verificación
ve repair --yes    # repara JSON dañado o archivos ausentes desde el manifiesto
```

## Desinstalar

```bash
ve uninstall --yes             # sólo lo gestionado; conserva configuraciones compartidas
ve uninstall --yes --restore   # restaura además las copias previas
```

La desinstalación no borra entradas MCP dentro de archivos compartidos: las deja y avisa, para no
destruir configuración de otros servidores.

## Verificar la instalación

```bash
ve version
ve doctor --json
ve agents
ve install verify          # initialize + tools/list contra el servidor MCP (45 herramientas)
ve security
npm test                   # 69 pruebas
```

## Instalación desde un clon limpio

Comprobado en Windows 11 con un clon local del repositorio, sin `node_modules` ni `dist`:

1. `git clone <ruta-local> <destino>` y `npm ci`.
2. `npm run build` y `npx playwright install chromium`.
3. `ve doctor` y `ve version`.
4. `ve install --yes --agents codex` en un proyecto vacío, `ve repair --yes` y
   `ve uninstall --yes`.
5. `ve update` sobre el clon.

El resultado exacto de esta comprobación está en
[docs/VERIFICACION-1.0.md](VERIFICACION-1.0.md#instalación-desde-clon-limpio).

## Problemas frecuentes

| Síntoma | Causa y solución |
| --- | --- |
| `ffmpeg` no encontrado | Instálalo y reabre la terminal; `ve doctor` lo confirma |
| Chromium ausente | `npx playwright install chromium` |
| `ve` no está en PATH | `npm link`, o usa `node dist/cli/index.js` |
| `npm link` falla por permisos | Usa el binario directo; no hace falta enlazar |
| Codex no llama a las herramientas MCP | En `codex exec` añade `default_tools_approval_mode = "approve"` |
| El agente no descubre la skill | `ve install --yes --agents <id>` y reinicia la sesión |
| JSON inválido tras editar a mano | `ve repair --yes` restaura la copia del manifiesto |
