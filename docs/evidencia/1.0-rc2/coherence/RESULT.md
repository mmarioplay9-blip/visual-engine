# Validación de la coherencia de matiz — 1.0.0-rc.2

Referencia base: `docs/evidencia/1.0-rc2/references/premium-landing.jpg` (sintética, 16:9, con acentos cálidos y verdes).
Rotaciones aplicadas píxel a píxel en canvas (HSV), no con filtros CSS.

| Caso | Cobertura ref | Cobertura cand | rc.1 (coseno directo) | rc.2 (kernel circular) | Disponible |
| --- | ---: | ---: | ---: | ---: | --- |
| referencia rotada +0° | 0.213 | 0.213 | 100 | 100 | sí |
| referencia rotada +15° | 0.213 | 0.222 | 93 | 83.7 | sí |
| referencia rotada +30° | 0.213 | 0.22 | 94.6 | 79.3 | sí |
| referencia rotada +60° | 0.213 | 0.217 | 24.8 | 40.9 | sí |
| referencia rotada +90° | 0.213 | 0.215 | 0 | 14.5 | sí |
| referencia rotada +120° | 0.213 | 0.218 | 0 | 3.8 | sí |
| referencia rotada +180° | 0.213 | 0.216 | 0 | 0.3 | sí |
| referencia gris + página con color | 0 | 0.213 | 0 | — | no |
| referencia gris + página gris | 0 | 0 | 0 | — | no |
| rc.1 game-cinematic B (rechazada): armadura gris vs HUD | 0.041 | 0.054 | 16.4 | — | no |
| rc.1 game-cinematic A: armadura gris vs HUD | 0.041 | 0.998 | 0 | — | no |

## Propiedades del núcleo

- Masa conservada: true.
- Decaimiento monótono con la distancia: true.
- Continuidad circular (sector 11 vecino del 0): true.

## Lectura

- rc.1 se hunde a 0 cuando los matices caen en sectores disjuntos, aunque la diferencia sea de 30°:
  es una discontinuidad del coseno sobre una variable circular, no una medida de coherencia.
- rc.2 decae de forma monótona con la distancia de matiz y **no puntúa** cuando la referencia no
  tiene masa cromática suficiente: devuelve `available:false` con el motivo, en vez de un 0 que
  suspende o un 100 que aprueba.
- El caso real de rc.1 (armadura casi gris) queda fuera de la dimensión: el gate ya no emite un
  hallazgo "incoherencia de matiz" que no puede sostener. Los demás gates siguen decidiendo.
