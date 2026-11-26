# Política de seguridad

## Versiones soportadas

| Versión | Soporte |
| --- | --- |
| 1.0.x (incluye rc) | Sí |
| 0.6.x | Sin parches de funciones; actualiza |
| 0.5.x y anteriores | Sin parches; actualiza |

## Reportar una vulnerabilidad

No publiques detalles explotables en un issue público. Envía un informe privado
al mantenedor con: versión, sistema operativo, comando, entrada mínima, efecto y
propuesta de mitigación. Acuse de recibo objetivo: 7 días. No se ofrece programa
de recompensas.

## Alcance

Entran: ejecución de procesos, instalación de configuraciones, contención de
rutas, respaldos/restauración, API local, lectura de archivos del proyecto y
dependencias.

No entran: vulnerabilidades del proveedor del agente, del navegador, de FFmpeg o
de Ollama; ataques que requieran acceso previo al usuario; contenido malicioso
en referencias que el usuario aporte.

## Prácticas

- La API escucha en `127.0.0.1`; fuera de loopback requiere `--allow-remote`.
- Las operaciones que escriben exigen confirmación.
- No se sobrescriben archivos no gestionados; hay copia previa y manifiesto.
- No se usa shell libre; los lanzadores `.cmd` se invocan con binario del
  registro.
- `ve security` audita los controles locales.
- Un timeout mata el proceso, cierra sus tuberías y comprueba que no queda vivo.
- Los lanzadores interactivos (Cursor, Freebuff, MAEX) se detectan sin ejecutarse.

## Dependencias

`npm audit --omit=dev` informa de una alerta **alta** en `zod` < 4.6.6 (agotamiento de memoria con
colecciones enormes). No se actualiza a zod 4 porque el SDK de MCP 1.20 usa la API de zod 3; el
servidor es local, por stdio y con esquemas estáticos. Está documentado en
[docs/SEGURIDAD.md](docs/SEGURIDAD.md) y se revisará cuando el SDK migre.

Detalle: [docs/SEGURIDAD.md](docs/SEGURIDAD.md).
