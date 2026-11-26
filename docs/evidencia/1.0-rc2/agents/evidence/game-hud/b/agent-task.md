# Tarea visual priorizada

Brief: HUD de videojuego sobre un cañón desértico al atardecer, 1280×720, CSS/SVG local.
Estilo: game-ui
Crítica: Crítica 88/100 (A): 0 crítico(s), 0 alto(s), 2 medio(s), 0 bajo(s).

## Corrige sólo estos defectos medidos

### [MEDIUM] Escala tipográfica insuficiente o cuerpo por debajo del mínimo legible
- Evidencia: pasos tipográficos=3 (objetivo 3); cuerpo medio px=15.6 (objetivo 12); ratio máximo/mínimo=1.13 (objetivo 1.8)
- Ubicación: html > body > main > h1.mission · top-left
- Corrección: Define una escala modular de al menos tres pasos y un cuerpo de 16 px cuando el espacio lo permita.
- Propiedad: font-size / line-height
- Acción base: Ajusta la escala modular, el cuerpo mínimo y el interlineado antes de cambiar la familia.

### [MEDIUM] El material declarado no aparece en el render
- Evidencia: señales de material=1 (objetivo 2); material declarado=metal
- Ubicación: sin selector; componente superficies
- Corrección: Materializa metal: borde, sombra, transparencia o rugosidad coherentes.
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