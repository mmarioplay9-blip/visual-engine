# Verificación real — 2026-11-25

> La fase 0.2 (timeline, cámara, inspección, efectos, spec, temporal e iteración) se verificó por
> separado en [VERIFICACION-0.2](VERIFICACION-0.2.md).

Todo lo de este documento se ejecutó en esta máquina. Los fallos encontrados se conservan:
forman parte del resultado.

## Entorno

| Elemento | Valor |
| --- | --- |
| Sistema | Windows 11, `win32/x64` |
| Node / npm | 26.13.1 / 11.20.0 |
| FFmpeg / FFprobe | 9.1-full_build (gyan.dev) |
| Playwright | 1.65.1, Chromium 1255 (headless shell) |
| TypeScript | 5.9.3 |
| Espacio libre | 441 GB en `C:` (el proyecto vive en `D:`) |

## Resultado global

- `npm test`: **20/20 PASS** en 27,7 s.
- Demo E2E: **68.0 → 74.3 → 81.3** sobre 100 (línea base → primera versión completa →
  versión corregida tras la revisión).
- Instalador Windows: **exit 0** sobre un clon local del repositorio.
- `ve update`: **exit 0** contra un remoto git local (no GitHub).
- `ve deps install`: instaló `is-number` de verdad (1 paquete, 0 vulnerabilidades).
- MCP: cliente stdio real, 13 herramientas, 1 recurso y 1 prompt.
- API local: 14 rutas, incluida la revisión completa con mapa de calor.

## Pruebas automáticas

```
tests 20 · pass 20 · fail 0 · duration_ms 27783
```

| Archivo | Qué demuestra |
| --- | --- |
| `tests/core.test.mjs` | Métricas de color/contraste/bordes, paleta, ffprobe de la referencia, los dos cortes, perfiles idénticos (100) y opuestos, SSIM/MAE/ΔE y PNG del mapa de calor, `runNpm` sin shell |
| `tests/cli.test.mjs` | `version`, `help`, `doctor` real, 6 efectos, aplicación con parámetros sin placeholders, scaffold Three.js validado con `node --check`, extracción de fotogramas PNG, `init` idempotente con configs JSON válidas, instalación bloqueada sin `--yes` |
| `tests/api.test.mjs` | `/v1/health`, `/v1/capabilities`, efectos, análisis, captura, bloqueo de instalación, JSON inválido y `/v1/review` completo |
| `tests/mcp.test.mjs` | Listado de herramientas, `visual_doctor`, `visual_effects_list`, `visual_analyze`, `visual_deps_plan`, `visual_review` y recurso `visual://effects` |
| `tests/e2e.test.mjs` | Revisión de la línea base y de la versión final; exige que la final supere a la base en más de 5 puntos y no tenga errores JS |

`pretest` ejecuta `demo/prepare.mjs`, que copia GSAP/Three desde `node_modules` y genera la
referencia si falta: un clon limpio puede ejecutar las pruebas sin descargas adicionales.

## Referencia y demo

Referencia sintética (`demo/make-reference.mjs`): 540×960, 3,00 s, 30 fps, 90 fotogramas,
812 KB. Se dibuja por código para no depender de material de terceros.

| Medición de la referencia | Valor |
| --- | --- |
| Paleta | `#091012` 67 %, `#094745` 11 %, `#3a3929` 6 %, `#0e7974` 6 %, `#1caea3` 3 %, `#73633d` 2 % |
| Luminancia / contraste / saturación | 14,6 % / 15,4 % / 74,3 % |
| Colorido / densidad de bordes | 48,6 % / 3,2 % |
| Movimiento medio | 4,00 (escala ×100) |
| Cortes detectados | **1,00 s y 2,00 s** (detector de escenas FFmpeg) |
| Ritmo | 40 cortes/min |

| Revisión | Puntuación | ΔE paleta | Δ luminancia | Δ contraste | Δ movimiento |
| --- | --- | --- | --- | --- | --- |
| Línea base (plana) | 68,0 (C) | 14,6 | −6,9 % | −6,9 % | −4,00 |
| Primera versión (paleta correcta, sin luz) | 74,3 (B) | 7,0 | −8,5 % | −6,9 % | −3,40 |
| Final (luz, banda, anillo, acentos) | **81,3 (B)** | 4,8 | −2,9 % | +1,0 % | −2,40 |

La puntuación se repite con ±0,5 entre ejecuciones (68,0 y 81,1–81,5 en las distintas pruebas).

Artefactos: `demo/out/baseline/`, `demo/out/final-v2/` (informe, JSON, capturas, mapa de calor).

## Instalador y actualización

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File install\install.ps1 `
  -Repo "file:///<repo>" `
  -Dest "...\.tmp\install-test" -NoLink
```

- `git clone` + `npm install` + `npm run build` + `npx playwright install chromium`: **exit 0**.
- Instalación resultante: 111 MB; `version` y `doctor` responden; 7/9 herramientas disponibles
  (faltan Remotion, no instalado, y React Bits, que no es un paquete npm).
- `npm link` **no** se probó: se usó `-NoLink` para no tocar el prefijo global. El comando se
  verificó como `node dist/cli/index.js`.
- `ve update --dir <clon>`: `git pull` + `npm install` + `npm run build`, **exit 0**.
- `install/install.sh`: sólo comprobación sintáctica (`bash -n`), **no ejecutado** en Linux/macOS.
- El remoto probado es un repositorio git local; la actualización desde GitHub no se ha podido
  verificar porque el proyecto aún no está publicado.

## Errores encontrados y corregidos durante la verificación

1. **Segundo corte no detectado.** Con 8 muestras, los cortes de 1 s y 2 s no coincidían con los
   fotogramas analizados. Se sustituyó la inferencia por el detector de escenas de FFmpeg
   (`select` + `showinfo`). Ahora detecta 1,00 s y 2,00 s.
2. **Titular invisible en la demo.** `background-clip: text` en el `h1` combinado con
   transformaciones por carácter hacía que el texto no se pintara. Lo descubrió la captura real.
   Se pasó a color sólido con sombra y acento en la última palabra; la puntuación subió de 74,3 a
   81,3.
3. **`ve update` fallaba en Windows** con `ENOENT: spawn npm`. El shim `npm.cmd` no se puede
   lanzar sin shell. Se resuelve `npm-cli.js` junto a Node y se ejecuta con `process.execPath`,
   sin shell y sin concatenar rutas. Añadida prueba de regresión (`runNpm --version`).
4. **Acentos rotos en PowerShell 5.1** al leer `install.ps1` sin BOM y al redirigir la salida.
   Se añadió BOM UTF-8 y codificación UTF-8 de consola; comprobado con
   «Visual Engine · instalación».
5. **Importaciones ESM con ruta absoluta de Windows** en dos pruebas (`ERR_UNSUPPORTED_ESM_URL_SCHEME`).
   Corregido con `pathToFileURL`.
6. **Doble lectura del cuerpo HTTP** en la prueba de la API. Corregido leyendo el texto una vez.
7. **Errores de tipos** en `composeProfile` (unión de `kind`), `init` (estados de MCP) y `tags`.
   Corregidos con tipos explícitos.

## No verificado (no se presenta como funcionando)

- Ejecución real en Linux y macOS.
- Publicación en GitHub y actualización desde el remoto público.
- Render de Remotion (no instalado; el scaffold no se ha ejecutado en un proyecto Remotion).
- Componentes originales de React Bits (el adaptador genera una implementación propia).
- Firefox y WebKit (sólo Chromium).
- Detección de objetos, pose, OCR, audio o subtítulos.
- Corrección automática del código del usuario (el motor entrega instrucciones, no parchea).
- Precisión perceptual con material real de cliente: la demo usa una referencia sintética.
