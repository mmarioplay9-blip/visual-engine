# Tarea visual priorizada

Brief: Panel de aplicación profesional con navegación, métricas, gráfico y tabla, 1280×720.
Estilo: sci-fi
Crítica: Crítica 70/100 (B): 1 crítico(s), 0 alto(s), 0 medio(s), 0 bajo(s).

## Corrige sólo estos defectos medidos

### [CRITICAL] Texto por debajo del contraste mínimo en el DOM
- Evidencia: incumplimientos=31 (objetivo 0); peor contraste=1.24:1 (objetivo 4.5:1 (3:1 texto grande))
- Ubicación: #export · top-right
- Corrección: Ajusta color/fondo del texto con peor contraste (1.24:1).
- Objetivo: #export
- Propiedad: color / background-color
- Acción base: Sube el contraste del texto o cambia el fondo; no ocultes el foco.

## Reglas de la iteración

1. No reescribas todo: aplica el cambio mínimo en la ubicación indicada.
2. No añadas un efecto si no hay evidencia de que falta y una función que cumplir.
3. Conserva las decisiones que ya pasan los umbrales.
4. Vuelve a capturar y compara antes/después; revierte si no mejora.
5. La aprobación artística final es humana.

## Límites

- Sin animaciones observadas no se afirma rigidez temporal.
- La crítica detecta defectos estructurales; no sustituye la aprobación artística humana.