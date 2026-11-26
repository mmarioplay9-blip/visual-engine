# A/B real con Codex — Visual Engine 1.0.0-rc.2

codex-cli 0.172.0. Mismo modelo, misma referencia adjunta (`-i`), mismo prompt y mismo sandbox en cada pareja. La única diferencia es Visual Engine: A corre en un directorio limpio; B recibe `ve install --agents codex` y el servidor MCP por `-c`. Referencias sintéticas 16:9 declaradas, sin material de cliente, y prohibido incrustar la imagen: se reconstruye con código.

**Resultado:** B mejora en 2/5 casos, empata en 3/5 y empeora en 0/5. La mejora grande está en el caso difícil (game-hud, +7,3 de calidad y +13,1 de fidelidad); professional-app sube +1,6 al corregir contraste, y los tres restantes quedan dentro de la resolución del proxy. **No se observa regresión de calidad global, sí una regresión de dimensión** (ver abajo).

## Calidad medida por el mismo motor

| Caso | Calidad | Fidelidad | Composición | Tipografía | Iluminación | Coherencia | Gates |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| professional-app | 95.2 → **96.8** (+1.6) | 94.9 → **94.7** (-0.2) | 99.8 → 99.8 | 91.1 → 72.2 | 98.8 → 97.5 | — → — | reject → accept |
| scene-3d | 95.7 → **95.8** (+0.1) | 88.0 → **88.0** (+0.0) | 94.1 → 94.1 | 85.1 → 85.1 | 97.3 → 97.7 | 100.0 → 100.0 | accept → accept |
| game-hud | 85.3 → **92.6** (+7.3) | 72.8 → **85.9** (+13.1) | 82.4 → 86.6 | 61.5 → 68.7 | 90.4 → 94.5 | 12.1 → 99.6 | reject → accept |
| motion-title | 96.2 → **97.0** (+0.8) | 95.6 → **96.3** (+0.7) | 98.9 → 99.5 | 79.7 → 80.7 | 97.4 → 99.9 | — → — | accept → accept |
| premium-landing | 97.4 → **97.5** (+0.1) | 91.7 → **91.8** (+0.1) | 98.0 → 98.0 | 91.2 → 91.2 | 95.3 → 95.9 | 100.0 → 100.0 | accept → accept |

## Invocación, coste y tiempo

| Caso | Comandos `ve` A → B | Tokens entrada A → B | De ellos cacheados A → B | Tokens salida A → B | Duración A → B | Bytes A → B |
| --- | --- | --- | --- | --- | --- | --- |
| professional-app | 0 → 6 | 370805 → 1189664 | 334720 → 1146240 | 7121 → 9090 | 163 s → 257 s | 14597 → 14124 |
| scene-3d | 0 → 8 | 440358 → 721550 | 409728 → 677504 | 2202 → 3343 | 72 s → 143 s | 9800 → 9801 |
| game-hud | 0 → 27 | 419402 → 2865608 | 359296 → 2802944 | 2652 → 5743 | 84 s → 249 s | 15501 → 14096 |
| motion-title | 0 → 6 | 307545 → 583288 | 278784 → 526080 | 2317 → 2495 | 72 s → 116 s | 5035 → 4258 |
| premium-landing | 0 → 4 | 313639 → 771958 | 279040 → 722816 | 1912 → 2550 | 57 s → 113 s | 8669 → 8694 |

## Diferencias que importan

- professional-app: typography 91.1 → 72.2 (-18.9)
- professional-app: gates reject → accept (A bloqueaba: critical-findings=1, contrast=31)
- game-hud: depth 98.9 → 87.2 (-11.7)
- game-hud: gates reject → accept (A bloqueaba: typography=61.5, high-findings=1)

## Lectura honesta

- **game-hud**: A dejó una banda negra de ~20 % de alto (el canvas no llenaba 720 px), la tipografía del HUD quedó por debajo del umbral (61,5) y el gate la rechazó. B midió la referencia, capturó a 1280×720, corrigió y llenó el lienzo: 92,6 y gate aceptado. La diferencia es visible en `evidence/game-hud/*/review/captures/capture-01.png`.
- **professional-app**: A tenía 31 incumplimientos de contraste y un hallazgo crítico; B los corrigió. Aun así B bajó tipografía de 91,1 a 72,2 (texto más fino en la tabla), y se publica.
- **scene-3d / motion-title / premium-landing**: diferencias ≤ 1,2 puntos. Son empates dentro de la resolución del proxy, no victorias.
- **Coste**: los tokens de entrada crecen 1,4×–6,8×, pero 97–99 % son lecturas de caché; el coste real es el **tiempo** (1,6×–3×) y el número de turnos. No hay telemetría de facturación del proveedor.

## Límites

- **professional-app**: la carpeta cruda de ejecución (`work/professional-app/{a,b}`) se eliminó en una limpieza de directorios no referenciados. Se conservan el HTML de cada rama, las capturas, los artefactos de revisión, `results.json`, `runs.json` y `evidence/professional-app/*-agent.json`, que contienen comandos, invocaciones y consumo reales. El JSONL crudo de Codex de ese caso es el único artefacto perdido.
- Una pasada por rama y caso: no se estima varianza; un empate no demuestra equivalencia.
- El agente B puede leer el código fuente del motor desde su ruta de instalación; A no. Asimetría de información declarada.
- El modelo es el de por defecto de la cuenta, el mismo en las dos ramas; no se fija versión exacta del modelo.
- La puntuación automática no es un juicio artístico humano; las capturas se conservan para revisión.
