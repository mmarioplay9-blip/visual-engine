# Tarea visual priorizada

Brief: Analizar y mejorar hero.html
Estilo: minimal-premium
Crítica: Crítica 58/100 (C): 1 crítico(s), 1 alto(s), 0 medio(s), 0 bajo(s).

## Corrige sólo estos defectos medidos

### [CRITICAL] Texto por debajo del contraste mínimo en el DOM
- Evidencia: incumplimientos=6 (objetivo 0); peor contraste=3.33:1 (objetivo 4.5:1 (3:1 texto grande))
- Ubicación: body > main.hero > header.masthead > p.issue:nth-of-type(2) · top-right
- Corrección: Ajusta color/fondo del texto con peor contraste (3.33:1).
- Objetivo: body > main.hero > header.masthead > p.issue:nth-of-type(2)
- Propiedad: color / background-color
- Acción base: Sube el contraste del texto o cambia el fondo; no ocultes el foco.

### [HIGH] Composición desequilibrada o con focos en competencia
- Evidencia: composición=52.9 (objetivo 62)
- Ubicación: center
- Corrección: Reequilibra la masa horizontal/vertical y deja un único punto de entrada.
- Propiedad: grid / align / max-width
- Acción base: Reequilibra la masa y reduce la competencia entre focos; conserva un punto de entrada.

## Reglas de la iteración

1. No reescribas todo: aplica el cambio mínimo en la ubicación indicada.
2. No añadas un efecto si no hay evidencia de que falta y una función que cumplir.
3. Conserva las decisiones que ya pasan los umbrales.
4. Vuelve a capturar y compara antes/después; revierte si no mejora.
5. La aprobación artística final es humana.

## Límites

- Sin medición de rendimiento no se afirma FPS ni carga.
- Sin animaciones observadas no se afirma rigidez temporal.
- La crítica detecta defectos estructurales; no sustituye la aprobación artística humana.