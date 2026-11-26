# Seguridad · Visual Engine 1.0.0-rc.2

## Modelo

La herramienta se ejecuta con los permisos del usuario y opera sobre archivos del proyecto. La
superficie sensible es: instalación de configuraciones, ejecución de procesos, API local,
restauración de copias y dependencias de terceros.

## Controles implementados

| Área | Control | Verificación |
| --- | --- | --- |
| API | Loopback por defecto; otro host exige `--allow-remote` | `auditSecurity` y prueba de host externo |
| Instalación | Sin `confirm` no escribe; `--global` exige `--allow-global` | plan/apply y pruebas de instalador |
| Configuraciones | Respaldo previo y manifiesto; no sobrescribe archivos ajenos | prueba con `CLAUDE.md` y `.mcp.json` previos |
| Rutas | Contención con `path.relative`, no prefijos de cadena | `withinRoot` y auditoría del manifiesto |
| Procesos | `spawn` con argumentos en array; sin `shell:true` | escaneo de `src/` |
| Timeouts | El hijo se mata, se cierran sus tuberías y se comprueba que no queda vivo | prueba `1.0 · un timeout no deja procesos hijos vivos` |
| `.cmd` de Windows | `cmd.exe /d /s /c` sólo con binario y argumentos del registro | detección de Cursor/OpenCode/Freebuff |
| Lanzadores interactivos | Cursor, Freebuff y MAEX se localizan en PATH y **no se ejecutan** | inventario de 9 agentes |
| Dependencias | Instalación opt-in con `--allow-install`/`--yes`; nada de pago | rutas y CLI |
| Copias | Se conservan; restaurar es una acción explícita | `uninstall --restore`, `repair --yes` |
| Desinstalación | Sólo archivos del manifiesto; no borra configuración compartida | prueba de ciclo completo |

## Auditoría local

```bash
ve security --json
```

Comprueba host, contención, ausencia de shell, permisos POSIX (no aplica en Windows), gate de
instalación y existencia de copias. Devuelve `pass: false` si hay un bloqueo.

Resultado en esta máquina: **sin bloqueos, 0 avisos**; 5 comprobaciones `OK`, 3 `N/A` (permisos
POSIX, manifiesto aún no creado, copias aún no creadas) y 3 límites declarados.

## Dependencias y licencias

`npm audit --omit=dev`:

Resultado en rc.2: **0 vulnerabilidades** (`found 0 vulnerabilities`).

| Paquete | Versión | Aviso | Decisión |
| --- | --- | --- | --- |
| `zod` | **4.6.7** | GHSA-mrhx-c7xc-m3w5 / CVE-2023-54404: agotamiento de memoria al validar arrays sin límite de longitud. Afecta a `< 4.6.6`; corregido en 4.6.6 | **Resuelto**: el SDK de MCP 1.32.2 declara `zod: ^3.25 \|\| ^4.0`, así que el salto es compatible. Se migraron los esquemas al API de zod 4 (`z.record(z.string(), …)`) y el handshake MCP real sigue pasando. |
| `@modelcontextprotocol/sdk` | 1.32.2 | — | Es la versión que admite zod 4; el servidor se verifica por `tools/list` real. |

**Estado del aviso (consultado el 2026-11-25).** El aviso está publicado como *high* (CVSS 7,5),
pero su única fuente es el CVE-2023-54404, que **fue rechazado** el 2026-10-28: VulnCheck
alega que el consumo de memoria crece sólo en proporción a la entrada ya asignada por
`JSON.parse`, que sólo es alcanzable sin límite de tamaño de petición y que es el comportamiento
esperado de un validador. Hay una petición abierta para retirar el GHSA. La decisión de rc.2 no
depende de esa disputa: actualizar era posible y barato, así que se hizo. En este proyecto el
riesgo era además bajo: el servidor es local, por stdio y con esquemas estáticos sin arrays de
longitud libre expuestos a un cliente remoto.

Inventario de licencias de `node_modules`: MIT (247), ISC (17), BSD-2 (9), Apache-2.0 (7),
BSD-3 (5), MPL-2.0 (4, `mediabunny`), Unlicense (2), 0BSD, BlueOak, CC-BY-4.0 (`caniuse-lite`),
Python-2.0, Remotion License (11) y GSAP standard license. Ninguna licencia copyleft fuerte en
código que se distribuya; MPL-2.0 es a nivel de archivo y no se modifica.

## Secretos y rutas personales

Revisión de todos los archivos versionados:

```bash
git grep -n -I -E "sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY"
git grep -n -I -E "D:\\\\proyectos|C:\\\\Users|/Users/|/home/"
```

Resultado: **0 coincidencias**. No hay `.env`, credenciales ni claves. Las rutas absolutas que
quedaban en el metadato de referencias de 0.6 se convirtieron a rutas relativas. Los registros
crudos del A/B con Codex se retiraron antes de publicar; las métricas agregadas se conservan con
las rutas saneadas (`<repo>`, `<home>`).

## Límites

- No es un pentest ni revisa NTFS, cortafuegos o el sandbox de cada agente.
- Los agentes de terceros tienen sus propios permisos y riesgos.
- El contenido de referencias y proyectos puede ser sensible: todo queda local, pero el agente
  conectado decide qué envía a su proveedor.
- No hay autenticación en la API local; no la expongas fuera de loopback.
- La auditoría de dependencias es la de `npm audit`; no sustituye una revisión de código de cada
  paquete.

## Reportar

Abre un issue privado o escribe al mantenedor antes de publicar detalles. Incluye versión,
sistema, comando y traza sin datos personales.
