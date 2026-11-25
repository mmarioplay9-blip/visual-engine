# Evidencia 0.5

Este directorio se regenera con:

```bash
npm run build
node docs/evidencia/0.5/make-ab.mjs
```

El script descarga las referencias CC0 del MET, genera páginas A/B, ejecuta `opIntelligence` sobre
cada una, mide FPS/carga, graba los MP4 y mide la cámara Three.js real. No usa servicios de pago.

## Referencias

| Caso | Obra | Artista | Licencia | Objeto MET |
| --- | --- | --- | --- | --- |
| App profesional | *Architecture* | Michelangelo Colonna | CC0 / dominio público | 399581 |
| Landing premium | *The Dance Class* | Edgar Degas | CC0 / dominio público | 438817 |
| Interfaz de juego | *Armor* | Anónimo | CC0 / dominio público | 23206 |
| Escena 3D | *Astronomy* | Giambologna | CC0 / dominio público | 203938 |
| Motion graphics | *The Dance Class* | Edgar Degas | CC0 / dominio público | 438817 |

Son **referencias de dirección visual**, no pantallas de producto de esos dominios. La obra de
Degas se reutiliza en landing y motion; hay cuatro obras únicas para cinco casos. Los metadatos
descargados están en `references/metadata.json`.

## Archivos

- `ab/<caso>/a.html`, `b.html`: implementaciones comparadas.
- `ab/<caso>/measure-a|b/`: review, DOM, crítica, fidelidad, gates y capturas.
- `ab/<caso>/comparison.json`: resumen por caso.
- `measurements.json`: tabla completa y notas de tokens.
- `RESULTS.md`: informe legible.
- `webgl.json` y `measure/webgl.png`: rotación real de `camera.rotation.y`.
- `motion-a.mp4`, `motion-b.mp4`, `references/motion-reference.mp4`, `motion.json`.
- `motion-temporal/`: comparación temporal del vídeo B contra la referencia.

## Límites

- A y B fueron generados por el mismo agente y banco reproducible; no hay un segundo modelo ni
  telemetría de tokens del proveedor. Los tokens son estimados por longitud.
- Las iteraciones del loop en el banco son 0: mide una pasada, no un ciclo agente-motor.
- Los gates por defecto rechazan los cinco casos. No se relajaron para forzar un aprobado.
- La referencia de motion es un montaje de tres planos derivado de una obra CC0, no una pieza
  externa de motion graphics.
- La rotación WebGL es una escena concreta en Chromium headless; no certifica cualquier WebGL.
- La aprobación artística final es humana y está pendiente.
