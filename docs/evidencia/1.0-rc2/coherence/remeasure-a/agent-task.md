# Tarea visual priorizada

Brief: HUD de juego con referencia de armadura
Estilo: game-ui
Crítica: Crítica 88/100 (A): 0 crítico(s), 1 alto(s), 0 medio(s), 0 bajo(s).

## Corrige sólo estos defectos medidos

### [HIGH] Iluminación plana o contradictoria
- Evidencia: iluminación=28.9 (objetivo 58)
- Ubicación: sin selector; componente global
- Corrección: Define una dirección de luz principal y una sombra de contacto; evita halos sin fuente.
- Propiedad: box-shadow / gradient
- Acción base: Unifica la dirección de luz y el contraste; evita sombras contradictorias.

## Reglas de la iteración

1. No reescribas todo: aplica el cambio mínimo en la ubicación indicada.
2. No añadas un efecto si no hay evidencia de que falta y una función que cumplir.
3. Conserva las decisiones que ya pasan los umbrales.
4. Vuelve a capturar y compara antes/después; revierte si no mejora.
5. La aprobación artística final es humana.

## Límites

- Sin animaciones observadas no se afirma rigidez temporal.
- La crítica detecta defectos estructurales; no sustituye la aprobación artística humana.