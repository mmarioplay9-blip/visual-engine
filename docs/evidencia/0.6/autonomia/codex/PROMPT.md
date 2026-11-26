Eres un agente autónomo. Trabaja SOLO dentro de esta carpeta; no toques nada fuera.

Tarea: crear `hero.html` (1280x720) que reproduzca la dirección visual de `reference.jpg` para una landing premium de arquitectura, con una sola acción y copy en español.

CLI: `node "<repo>/dist/cli/index.js"` (llámalo VE).
No instales dependencias, no uses red, no inventes métricas.

Pasos obligatorios (ejecuta cada uno y lee su salida):
1. `VE context "landing premium editorial de arquitectura" --profile professional`
2. `VE art "landing premium editorial de arquitectura" --style editorial --out .ve/art`
3. Escribe `hero.html` usando los tokens y la referencia.
4. `VE capture hero.html --width 1280 --height 720 --frames 2 --out .ve/capture --json`
5. `VE critic --reference reference.jpg --target-dir . --target hero.html --out .ve/critic --json`
6. Corrige los hallazgos critical/high reales (contraste, iluminación, coherencia).
7. Repite `VE capture` y `VE critic` tras corregir.
8. Escribe `RESULT.md` con: comandos ejecutados, puntuaciones antes/después, cambios hechos y límites.

No afirmes nada que no hayas ejecutado. Si un comando falla, cópialo en RESULT.md y continúa.
