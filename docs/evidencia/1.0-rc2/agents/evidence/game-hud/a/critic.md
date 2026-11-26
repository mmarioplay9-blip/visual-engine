# Tarea visual priorizada

Brief: HUD de videojuego sobre un cañón desértico al atardecer, 1280×720, CSS/SVG local.
Estilo: game-ui
Crítica: Crítica 82/100 (B): 0 crítico(s), 1 alto(s), 1 medio(s), 0 bajo(s).

## Corrige sólo estos defectos medidos

### [HIGH] Incoherencia estética entre la intención y el resultado
- Evidencia: coherencia de matiz=12.1 (objetivo 58)
- Ubicación: sin selector; componente palette
- Corrección: Reduce la paleta a tokens semánticos y elimina acentos que no tengan un rol.
- Propiedad: color tokens
- Acción base: Reduce la paleta y reutiliza tokens; elimina acentos y materiales que no pertenecen al sistema.

### [MEDIUM] Escala tipográfica insuficiente o cuerpo por debajo del mínimo legible
- Evidencia: pasos tipográficos=3 (objetivo 3); cuerpo medio px=0 (objetivo 12); ratio máximo/mínimo=1.38 (objetivo 1.8)
- Ubicación: sin selector; componente typography
- Corrección: Define una escala modular de al menos tres pasos y un cuerpo de 16 px cuando el espacio lo permita.
- Propiedad: font-size / line-height
- Acción base: Ajusta la escala modular, el cuerpo mínimo y el interlineado antes de cambiar la familia.

## Reglas de la iteración

1. No reescribas todo: aplica el cambio mínimo en la ubicación indicada.
2. No añadas un efecto si no hay evidencia de que falta y una función que cumplir.
3. Conserva las decisiones que ya pasan los umbrales.
4. Vuelve a capturar y compara antes/después; revierte si no mejora.
5. La aprobación artística final es humana.

## Límites

- Sin animaciones observadas no se afirma rigidez temporal.
- La crítica detecta defectos estructurales; no sustituye la aprobación artística humana.