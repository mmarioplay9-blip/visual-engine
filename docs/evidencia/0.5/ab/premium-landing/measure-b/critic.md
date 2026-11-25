# Tarea visual priorizada

Brief: Landing de arquitectura premium, editorial, con una obra como material y una sola acción.
Estilo: editorial
Crítica: Crítica 70/100 (B): 0 crítico(s), 2 alto(s), 1 medio(s), 0 bajo(s).

## Corrige sólo estos defectos medidos

### [HIGH] Incoherencia estética entre la intención y el resultado
- Evidencia: coherencia de matiz=14.5 (objetivo 58)
- Ubicación: sin selector; componente palette
- Corrección: Reduce la paleta a tokens semánticos y elimina acentos que no tengan un rol.
- Propiedad: color tokens
- Acción base: Reduce la paleta y reutiliza tokens; elimina acentos y materiales que no pertenecen al sistema.

### [HIGH] Iluminación plana o contradictoria
- Evidencia: iluminación=42.6 (objetivo 58)
- Ubicación: sin selector; componente global
- Corrección: Define una dirección de luz principal y una sombra de contacto; evita halos sin fuente.
- Propiedad: box-shadow / gradient
- Acción base: Unifica la dirección de luz y el contraste; evita sombras contradictorias.

### [MEDIUM] El material declarado no aparece en el render
- Evidencia: señales de material=1 (objetivo 2); material declarado=paper
- Ubicación: sin selector; componente superficies
- Corrección: Materializa paper: borde, sombra, transparencia o rugosidad coherentes.
- Propiedad: background / box-shadow / border
- Acción base: Haz explícito el material: borde, sombra, rugosidad o transparencia; no lo simules con ruido aleatorio.

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