# Contribuir

## Entorno

```bash
npm ci
npx playwright install chromium
npm run build
npm test
```

Requiere Node 20+, FFmpeg/FFprobe y Chromium. Las pruebas son la fuente de
verdad: no se acepta una función nueva sin una comprobación ejecutada.

## Reglas del proyecto

1. **No simular resultados.** Una métrica nueva debe medirse; una estimación se
   etiqueta como tal.
2. **No relajar gates** para aprobar una entrega. Se corrige la causa.
3. **No eliminar capacidades** existentes sin una decisión explícita.
4. **Local y gratuito**: sin APIs de pago ni telemetría.
5. **Licencias**: GSAP Club no; Remotion no es MIT; React Bits CC-BY exige
   atribución.
6. **Seguridad**: nada de `shell: true` con entrada del usuario; rutas contenidas;
   la API escucha en loopback por defecto.

## Flujo

- Abre un issue con el caso, la versión y la salida real.
- Añade una prueba que falle antes del cambio.
- Ejecuta `npm run build` y la prueba concreta; antes de cerrar, la suite.
- Actualiza `CHANGELOG.md` y, si cambia el contrato, `docs/`.
- Commits pequeños y en español, con el porqué.

## Estilo

TypeScript estricto, módulos ESM, sin dependencias nuevas si el problema se
resuelve con la biblioteca estándar. Los informes y mensajes van en español.
