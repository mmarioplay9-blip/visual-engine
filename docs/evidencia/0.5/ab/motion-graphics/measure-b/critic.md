# Tarea visual priorizada

Brief: Reel de motion graphics de seis segundos, tres planos, cortes en el pico de movimiento.
Estilo: motion-graphics
Crítica: Crítica 88/100 (A): 0 crítico(s), 1 alto(s), 0 medio(s), 0 bajo(s).

## Corrige sólo estos defectos medidos

### [HIGH] Animaciones rígidas o demasiado rápidas
- Evidencia: proporción lineal/≤120 ms=1 (objetivo 0.6)
- Ubicación: html > body > main.reel > section.scene.s1:nth-of-type(1)
- Corrección: Usa una curva con salida suave y 180–500 ms; reserva el spring para interacción directa.
- Propiedad: transition-timing-function
- Acción base: Sustituye el movimiento lineal por una curva con aceleración y desaceleración; reduce la distancia.

## Reglas de la iteración

1. No reescribas todo: aplica el cambio mínimo en la ubicación indicada.
2. No añadas un efecto si no hay evidencia de que falta y una función que cumplir.
3. Conserva las decisiones que ya pasan los umbrales.
4. Vuelve a capturar y compara antes/después; revierte si no mejora.
5. La aprobación artística final es humana.

## Límites

- Sin medición de rendimiento no se afirma FPS ni carga.
- La crítica detecta defectos estructurales; no sustituye la aprobación artística humana.