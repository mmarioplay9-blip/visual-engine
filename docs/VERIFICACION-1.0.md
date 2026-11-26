# Verificación de Visual Engine 1.0.0-rc.1

Fecha: 2026-11-26 · Windows 11 · Node 26.13.1 · FFmpeg 9.1 · Playwright 1.65.1 ·
Ollama 0.40.17 · Tesseract 5.4.

Esta entrega se apoya en el repositorio existente. No se reconstruyó el proyecto ni se eliminó
ninguna capacidad. Se conservan **58 efectos**, **15 estilos**, **20 composiciones**, **44
herramientas MCP** y **47 comandos CLI**.

## Suite

- `npm run build`: correcto (TypeScript estricto).
- `npm test`: **63/63 pruebas**, código de salida **0**, 221 s en la primera pasada completa.
- 62 pruebas anteriores + 1 nueva de procesos huérfanos. No se relajó ninguna aserción.

## Estabilización y auditoría

| Hallazgo | Causa real | Corrección | Evidencia |
| --- | --- | --- | --- |
| Inventario de agentes tardaba 6,63 s | `maex` es un `.cmd` que abre una sesión interactiva; `--version` no termina y agotaba el timeout | Se localiza en PATH y **no se ejecuta**, igual que Cursor y Freebuff; caché de PATH | **0,98 s** con 9 agentes |
| Un timeout se informaba como código 1 | `SIGKILL` deja `code` en `null` y se confundía con un fallo del binario | Marca `timedOut` y devuelve **124** | prueba `1.0 · un timeout no deja procesos hijos vivos` |
| Posible EPIPE al escribir stdin | El hijo podía morir antes de leer la entrada | Manejador de error en `stdin` | build y suite |
| ¿La corrección oculta huérfanos? | No se comprobaba | El hijo se mata, se destruyen sus tuberías, se hace `unref` y se verifica con `process.kill(pid, 0)` | hijo muerto, lista de vivos vacía, < 12 s |
| Instalar dejaba el agente como «diseñado» | El estado se leía del manifiesto **anterior** | El manifiesto marca `installed` lo que se acaba de escribir | `codex:installed` en el clon limpio |
| Codex no recibía bloque MCP en proyecto | La rama de «snippet manual» era inalcanzable | Se genera `.visual-engine/codex-mcp.toml` | archivo escrito y desinstalado |
| Ruta personal en evidencia 0.6 | Metadato con ruta absoluta | Rutas relativas | `git grep` sin coincidencias |
| `AGENTS.md` decía 39 comandos | Dato obsoleto | 47 comandos | `ve --help` |

## Calidad visual: cinco proyectos nuevos

Referencias CC0 del MET independientes. A es una plantilla genérica con el mismo copy; B usa
dirección artística, paleta derivada, contraste WCAG, jerarquía y movimiento. **No se cambió
ninguna fórmula, peso ni umbral.** Una pasada por proyecto.

| Proyecto | Calidad A → B | Fidelidad A → B | Composición A → B | Gates |
| --- | ---: | ---: | ---: | --- |
| Landing premium | 75,9 → **86,2** | 72,5 → **80,1** | 94,6 → 75,0 | reject → **accept** |
| Aplicación de escritorio | 68,1 → **89,7** | 65,0 → **93,4** | 87,7 → 99,6 | reject → **accept** |
| Interfaz cinematográfica | 73,3 → **77,7** | 63,5 → **71,6** | 86,5 → 82,3 | reject → **reject** |
| Escena 3D interactiva | 80,5 → **83,8** | 75,2 → **77,2** | 97,6 → 85,0 | reject → **accept** |
| Motion graphics | 73,2 → **86,9** | 71,4 → **90,5** | 88,9 → 97,8 | reject → **accept** |

La composición baja en tres casos y se publica. **El rechazo de la interfaz de juego también:**
la referencia CC0 es casi gris y el HUD no reproduce su distribución de matiz; el gate hace lo
que debe. No se tintó la página para aprobarlo.

### Fidelidad temporal

| Métrica | A (estático) | B |
| --- | ---: | ---: |
| Puntuación temporal | 37,6 | **76,6** (0.6: 59,2) |
| Luminancia | 0,178 | **0,694** |
| Correlación de movimiento | 0,403 | 0,508 |
| F1 de cortes | 0 | 0,8 |
| Deriva | 0 s | 0 s |

Referencia: 1280×720, 25 fps, 6,00 s, cortes en 2,00 y 4,00 s. Resultado: 5,80 s, cortes en 1,84 y
3,84 s. El vídeo se recorta 0,2 s de arranque y 0,4 s de cola del contexto de grabación; es
edición declarada, no un cambio de métrica. Sin corrección de exposición: la primera medición ya
superó el umbral de revisión.

### WebGL

1,49° medidos frente a 1,5° esperados, **error 0,01°**, 184 frames, escena interactiva con
arrastre. La rotación se lee de `camera.rotation.y`.

## Agentes reales

### Codex 0.172.0 (no interactivo)

Misma tarea, modelo, prompt y sandbox en dos directorios limpios. B recibe `ve install` y el
servidor MCP por `-c`.

| | A sin VE | B con VE |
| --- | ---: | ---: |
| Calidad | **77,1** | 62,3 |
| Fidelidad | **72,8** | 48,4 |
| Gates | reject | reject |
| Comandos `ve` | 0 | **9** |

B invocó `doctor`, `context`, `effects list`, `vision status`, `agents`, `art` y `capture`, y leyó
la skill instalada. Aun así su página puntuó peor: el split oscuro se aleja de la composición de
la referencia clara. **Es un resultado negativo y se publica.** También se comprobó que
`codex exec` deniega MCP sin `default_tools_approval_mode = "approve"`; con esa opción una
llamada `visual_agents` se completó en una ejecución previa.

### Otros agentes

| Agente | Resultado real |
| --- | --- |
| OpenCode 1.19.3 | Sesión autónoma de 10 pasos en 0.6; sin regresión |
| Claude Code 2.1.328 | `api_error` del proveedor en modo no interactivo: **no verificado** |
| Freebuff | El CLI sólo ofrece `login`/`doctor` y modo interactivo; **no se ejecutó una sesión** |
| Cursor / Gemini / MAEX | Sin sesión autónoma. MAEX es un lanzador interactivo y no se ejecuta |
| Ollama | HTTP real y modelos listados; no implementa MCP |

## Instalación desde clon limpio

Windows 11, clon local del commit de la RC, sin `node_modules` ni `dist`:

1. `install/install.sh --no-link` → **exit 0**; `visual-engine 1.0.0-rc.1`; `ve doctor` 8/9
   (falta `react-bits`, opcional).
2. `ve install --yes --agents codex` en un proyecto vacío → `AGENTS.md`, skill y
   `.visual-engine/codex-mcp.toml`; manifiesto `codex:installed`; 0 conflictos.
3. `ve repair --yes` → sin incidencias.
4. `ve uninstall --yes` → elimina los 3 archivos gestionados y conserva las copias.
5. `ve update` → `git pull` + `npm install` + build correctos.

## Seguridad, dependencias y rendimiento

- `ve security`: **sin bloqueos, 0 avisos** (5 OK, 3 N/A por Windows/manifiesto, 3 límites).
- `npm audit --omit=dev`: **1 alerta alta** en `zod` < 4.6.6. No se actualiza porque el SDK de MCP
  usa zod 3; el servidor es local, por stdio y con esquemas estáticos. Documentado.
- Licencias: MIT 247, ISC 17, BSD 9+5, Apache-2.0 7, MPL-2.0 4 (`mediabunny`), Remotion 11,
  GSAP estándar. Sin copyleft fuerte en código distribuido.
- Secretos y rutas personales en archivos versionados: **0 coincidencias**.
- FPS de los cinco proyectos B: 55,8–61,4; carga 719–850 ms. Sin regresión frente a A.
- Tokens: estimados por caracteres; el A/B de proyectos va de 1.394 a 2.101 por página B. No hay
  telemetría del proveedor.

## Decisión

**Listo como release candidate, no como 1.0 final.** Lo que sostiene la RC:

- Suite completa en verde, instalación universal verificada de punta a punta y seguridad sin
  bloqueos.
- Cinco proyectos nuevos medidos, cuatro pasan los gates sin tocarlos, y la fidelidad temporal
  sube de 59,2 a 76,6.
- Un agente real invoca las herramientas y el resultado se publica aunque sea peor.

Lo que impide declarar 1.0 final:

1. **Sin ejecución en Linux/macOS.** El CI está preparado y no se ha ejecutado.
2. **A/B con Codex negativo** en el proxy estructural; falta revisión artística humana.
3. **Un gate rechaza una pieza válida** por coherencia de matiz con una referencia casi gris: el
   proxy de composición/coherencia necesita revisión antes de prometer superioridad.
4. **Alerta alta de `zod`** sin parche compatible con el SDK de MCP.
5. **Freebuff y Claude Code** no se han podido verificar como consumidores en esta máquina.

Nada de esto se oculta en el README ni en las capacidades declaradas.
