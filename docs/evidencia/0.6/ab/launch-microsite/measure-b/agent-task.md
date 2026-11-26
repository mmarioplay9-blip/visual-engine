# Tarea visual priorizada

Brief: Micrositio de lanzamiento inmersivo con profundidad, luz y una única acción.
Estilo: immersive-3d
Crítica: Crítica 94/100 (A): 0 crítico(s), 0 alto(s), 1 medio(s), 0 bajo(s).

## Corrige sólo estos defectos medidos

### [MEDIUM] El material declarado no aparece en el render
- Evidencia: señales de material=0 (objetivo 2); material declarado=glass
- Ubicación: sin selector; componente superficies
- Corrección: Materializa glass: borde, sombra, transparencia o rugosidad coherentes.
- Propiedad: background / box-shadow / border
- Acción base: Haz explícito el material: borde, sombra, rugosidad o transparencia; no lo simules con ruido aleatorio.

## Reglas de la iteración

1. No reescribas todo: aplica el cambio mínimo en la ubicación indicada.
2. No añadas un efecto si no hay evidencia de que falta y una función que cumplir.
3. Conserva las decisiones que ya pasan los umbrales.
4. Vuelve a capturar y compara antes/después; revierte si no mejora.
5. La aprobación artística final es humana.

## Límites

- Sin animaciones observadas no se afirma rigidez temporal.
- La crítica detecta defectos estructurales; no sustituye la aprobación artística humana.