# Tarea visual priorizada

Brief: HUD de videojuego diegético, legible en movimiento y con jerarquía de estado.
Estilo: game-ui
Crítica: Crítica 76/100 (B): 0 crítico(s), 2 alto(s), 0 medio(s), 0 bajo(s).

## Corrige sólo estos defectos medidos

### [HIGH] Incoherencia estética entre la intención y el resultado
- Evidencia: coherencia de matiz=0 (objetivo 58)
- Ubicación: sin selector; componente palette
- Corrección: Reduce la paleta a tokens semánticos y elimina acentos que no tengan un rol.
- Propiedad: color tokens
- Acción base: Reduce la paleta y reutiliza tokens; elimina acentos y materiales que no pertenecen al sistema.

### [HIGH] Iluminación plana o contradictoria
- Evidencia: iluminación=27.6 (objetivo 58)
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