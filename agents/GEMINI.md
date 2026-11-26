# Visual Engine · contexto para Gemini CLI

> Visual Engine 1.0.0-rc.2: comprueba con `ve agents` (diseñado ≠ instalado ≠ verificado).
> `ve install` sin `--yes` sólo planifica; `--profile` cambia capacidades, no estética.

Este repositorio usa Visual Engine (`ve`), un motor local y gratuito de calidad visual.

## Uso

- Brief y plan: `ve plan "<intención>" --reference <archivo> --out ./sistema`.
- Comprueba el entorno: `ve doctor`.
- Mide la referencia: `ve analyze <archivo> --json`.
- Genera una base sólo si la referencia la sostiene: `ve effects apply <id> --out <carpeta>`.
- Captura el resultado: `ve capture <html|url> --serve <carpeta> --frames 6`.
- Revisa y compara: `ve review --reference <ref> --target-dir <carpeta> --frames 6`.
- Depura y critica: `ve debug ...` y `ve critic --reference <ref> --target-dir <carpeta>`.
- Acepta o itera: `ve gate --from <intelligence.json> --require-human` y `ve loop ... --confirm`.
- API local: `ve serve` → `http://127.0.0.1:4747/v1/health`.

## Reglas

1. La referencia y la intención mandan sobre cualquier estilo o plantilla.
2. No impongas estética oscura, partículas, glow o glassmorphism sin evidencia en la referencia.
3. Cada efecto debe justificar su coste; si no sube la fidelidad, se retira.
4. Sin APIs de pago ni CDNs. Todo local.
5. No declares éxito sin ejecutar la herramienta y leer el resultado; sin captura y gate no
   está terminado.
6. Respeta las licencias: GSAP Club no, Remotion no es MIT, React Bits CC-BY requiere crédito.

La skill completa está en `skills/visual-engine/SKILL.md`.
