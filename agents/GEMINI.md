# Visual Engine · contexto para Gemini CLI

Este repositorio usa Visual Engine (`ve`), un motor local y gratuito de calidad visual.

## Uso

- Comprueba el entorno: `ve doctor`.
- Mide la referencia: `ve analyze <archivo> --json`.
- Genera una base: `ve effects apply <id> --out <carpeta>`.
- Captura el resultado: `ve capture <html|url> --serve <carpeta> --frames 6`.
- Revisa y compara: `ve review --reference <ref> --target-dir <carpeta> --frames 6`.
- API local: `ve serve` → `http://127.0.0.1:4747/v1/health`.

## Reglas

1. No diseñes plano si se pide calidad avanzada: luz, profundidad, jerarquía y detalle.
2. Una referencia manda: paleta, contraste y ritmo se miden, no se adivinan.
3. Cada efecto debe justificar su coste; si no sube la puntuación, se retira.
4. Sin APIs de pago ni CDNs. Todo local.
5. No declares éxito sin ejecutar la herramienta y leer el resultado.
6. Respeta las licencias: GSAP Club no, Remotion no es MIT, React Bits CC-BY requiere crédito.

La skill completa está en `skills/visual-engine/SKILL.md`.
