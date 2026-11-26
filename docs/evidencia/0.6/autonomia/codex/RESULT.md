# Resultado — Umbral

Creado `hero.html`, hero editorial de arquitectura con copy en español y una sola acción: «Descubrir nuestra mirada». La acción usa un `details` nativo para mostrar la propuesta sin navegación ni servicios externos.

## Comandos VE ejecutados, en orden

Se ejecutaron desde esta carpeta. No se instalaron dependencias ni se usó la red.

1. `node "<repo>/dist/cli/index.js" context "landing premium editorial de arquitectura" --profile professional`
   - Código 0. Seleccionó cuatro herramientas, una receta y dos documentos. La salida declara que el perfil no impone estética y las recetas no sustituyen la medición.
2. `node "<repo>/dist/cli/index.js" art "landing premium editorial de arquitectura" --style editorial --out .ve/art`
   - Código 0. Generó sistema de diseño, tokens y fuentes locales. Auditoría estructural del sistema generado: **98.7/100**, peor contraste informado: **5.94:1**. Estos valores NO son puntuaciones de `hero.html`.
3. Se escribió `hero.html` utilizando `.ve/art/design-system.css` y `reference.jpg`.
4. `node "<repo>/dist/cli/index.js" capture hero.html --width 1280 --height 720 --frames 2 --out .ve/capture --json`
   - Código 1. Salida exacta: `Error: ffprobe no pudo leer capture-01.png: ENOENT: spawn ffprobe ENOENT`
   - Aunque falló el comando, dejó `capture-01.png` y `capture-02.png`; se inspeccionó visualmente la primera. Ambas se conservaron en `.ve/before/`, junto con el HTML anterior.
5. `node "<repo>/dist/cli/index.js" critic --reference reference.jpg --target-dir . --target hero.html --out .ve/critic --json`
   - Código 1. Salida exacta: `Error: ffprobe no pudo leer reference.jpg: ENOENT: spawn ffprobe ENOENT`
6. Se corrigió la iluminación mediante revisión visual propia, sin atribuir hallazgos a VE.
7. Se repitió exactamente el comando del paso 4 tras modificar el HTML.
   - Código 1. Salida exacta: `Error: ffprobe no pudo leer capture-01.png: ENOENT: spawn ffprobe ENOENT`
   - Volvió a generar las dos capturas. Se inspeccionó visualmente la primera final y se verificaron sus dimensiones con `System.Drawing.Image`: **1280×720**.
8. Se repitió exactamente el comando del paso 5 tras modificar el HTML.
   - Código 1. Salida exacta: `Error: ffprobe no pudo leer reference.jpg: ENOENT: spawn ffprobe ENOENT`

## Puntuaciones antes y después

| Evaluación de hero.html | Antes | Después |
| --- | --- | --- |
| VE critic | No disponible: falta ffprobe | No disponible: falta ffprobe |
| Informe de VE capture | No disponible: falta ffprobe | No disponible: falta ffprobe |

No se inventaron puntuaciones, mejoras numéricas ni niveles de severidad. No fue posible obtener ni resolver una lista automática de hallazgos critical/high porque `critic` falló antes de producirla.

## Dirección visual y cambios

- Se reutilizó la pintura local como fondo atmosférico; no se presenta como fotografía de una obra del estudio. Se conservaron los verdes apagados, los grises cálidos y un acento rojizo de la referencia.
- Se aplicaron los tokens editoriales de marfil, texto oscuro, escalas de cuerpo y cabecera, fuentes serif/sans/mono y transiciones de VE. La escala principal se ajustó a 88 px para la composición.
- El copy «El arte de habitar» relaciona el carácter pictórico con arquitectura e interiores. No se añadieron cifras comerciales, clientes, premios ni proyectos ficticios.
- Tras inspeccionar la primera captura, se añadió una sombra superior para respaldar el texto de cabecera. Se redujo el velo central y se concentró la sombra inferior en el pie, recuperando la luz de la pintura sin eliminar la zona oscura del texto principal.
- Se añadieron foco visible, imagen decorativa excluida del árbol accesible y adaptación CSS para pantallas estrechas.

## Comprobaciones auxiliares y fallos

Se ejecutaron `Get-Location`, `rg --files -g 'AGENTS.md' -g 'reference.jpg' -g '*'`, lecturas locales con `Get-Content` de los tokens y CSS generados, y `rg --files .ve/art` y `rg --files .ve`. Se inspeccionaron la referencia y las capturas mediante el visor local.

`Get-Command ffprobe,ffmpeg -ErrorAction SilentlyContinue | Select-Object Name,Source` no encontró ejecutables y terminó con código 1. No se buscó fuera de esta carpeta ni se intentó instalar herramientas.

Se ejecutó además:

```powershell
node "<repo>/dist/cli/index.js" critic --help
```

Código 1. Salida exacta: `Error: Uso: ve critic --reference <imagen|vídeo> --target-dir <proyecto> [--brief ...]`

La primera comprobación auxiliar de HTML falló por el paso de comillas de PowerShell a `node -e`. Comando ejecutado:

```powershell
node -e "const fs=require('fs');const h=fs.readFileSync('hero.html','utf8');const checks={espanol:h.includes('lang=\"es\"'),unaAccion:(h.match(/<summary>/g)||[]).length===1,referenciaLocal:h.includes('src=\"reference.jpg\"'),sinRecursosRemotos:!/(https?:)?\/\//.test(h)};console.log(JSON.stringify(checks,null,2));if(Object.values(checks).some(v=>!v))process.exit(1)"
```

Salida de error: `SyntaxError: missing ) after argument list` y `Expected ',', got 'ident'`. Se corrigió creando un archivo JS local, sin modificar el HTML para acomodar la prueba:

```powershell
node .ve/verify.cjs
```

Código 0. Las cinco comprobaciones estáticas pasaron: idioma español, una sola acción, referencia local, ausencia de URLs remotas y existencia de fuentes locales. No constituyen una auditoría completa de accesibilidad ni una prueba de interacción.

Se crearon y copiaron los archivos de respaldo con `New-Item` y `Copy-Item`, únicamente dentro de `.ve/before`. Los archivos se escribieron mediante `apply_patch`.

## Límites

- `ffprobe` no está disponible para VE: quedan pendientes la crítica automática y su comparación numérica antes/después.
- La revisión visual es propia; no equivale a certificación de contraste WCAG. No se midieron ratios de contraste del hero final.
- No se probó la apertura de `details` con un clic ni la variante móvil; su implementación es HTML nativo. La captura demuestra el renderizado del estado inicial a 1280×720.
- La página depende del JPEG local y de `.ve/art/` para su aspecto. Mantener estos recursos junto al HTML.
- No se accedió ni se escribió en el registro `<home>\registro-local`: la instrucción específica de esta tarea exige trabajar solo dentro de esta carpeta. Este turno queda documentado aquí.
