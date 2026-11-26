# Tarea visual priorizada

Brief: Landing editorial y sobria para un estudio de cerámica de autor, 1280×720, CSS autocontenido, tono editorial.
Estilo: editorial
Crítica: Crítica 40/100 (D): 0 crítico(s), 5 alto(s), 0 medio(s), 0 bajo(s).

## Corrige sólo estos defectos medidos

### [HIGH] Composición desequilibrada o con focos en competencia
- Evidencia: composición=40.6 (objetivo 62)
- Ubicación: center
- Corrección: Reequilibra la masa horizontal/vertical y deja un único punto de entrada.
- Propiedad: grid / align / max-width
- Acción base: Reequilibra la masa y reduce la competencia entre focos; conserva un punto de entrada.

### [HIGH] La profundidad visual es insuficiente o no está jerarquizada
- Evidencia: profundidad=48.1 (objetivo 55)
- Ubicación: html > body > main.landing
- Corrección: Separa fondo, contenido y foco con escala, luminancia y una sombra de contacto coherente.
- Propiedad: box-shadow / filter / transform
- Acción base: Crea dos o tres planos reales: superficie, contenido y foco; usa contraste, sombra de contacto y escala.

### [HIGH] Jerarquía visual débil: varios elementos compiten por la atención
- Evidencia: jerarquía=45.3 (objetivo 62)
- Ubicación: #titulo
- Corrección: Sube un solo titular y baja el resto; usa tamaño, peso o contraste, no los tres a la vez.
- Propiedad: font-size / font-weight
- Acción base: Refuerza un único foco: tamaño, peso o contraste; baja el resto un nivel.

### [HIGH] Incoherencia estética entre la intención y el resultado
- Evidencia: coherencia de matiz=14 (objetivo 58)
- Ubicación: sin selector; componente palette
- Corrección: Reduce la paleta a tokens semánticos y elimina acentos que no tengan un rol.
- Propiedad: color tokens
- Acción base: Reduce la paleta y reutiliza tokens; elimina acentos y materiales que no pertenecen al sistema.

### [HIGH] Iluminación plana o contradictoria
- Evidencia: iluminación=35.4 (objetivo 58)
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