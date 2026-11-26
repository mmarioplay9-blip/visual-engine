# Verificación de Visual Engine 0.6

Fecha: 2026-11-25 · Windows 11 · Node 26.13.1 · FFmpeg 9.1 · Chromium de
Playwright 1.65 · Ollama 0.40.17 con `llava:7b`.

## Suite

- `npm run build`: correcto (TypeScript estricto).
- `npm test`: **62/62 pruebas**, código de salida **0**, 268,9 s (54 anteriores
  + 8 de 0.6).
- Se conservan **58 efectos**, **15 estilos**, **20 composiciones** y las 54
  pruebas anteriores.

La primera pasada terminó las 62 pruebas pero el proceso no salía: la detección
con timeout (`maex`, ausente) dejaba abiertas las tuberías de un proceso nieto.
Se corrigió en `exec` cerrando `stdout`/`stderr`/`stdin` y liberando el hijo; la
repetición completa sale con código 0. No se cambió ninguna aserción.

## A/B 0.6 · siete casos

Mismo agente, brief, copy y banco reproducible. B usa contexto, Art Director,
paleta derivada de la referencia, luz en capas, crítico, fidelidad y gates. **No
se cambió ningún umbral ni fórmula de métrica.** A es una plantilla genérica.

| Caso | Calidad A → B | Fidelidad A → B | FPS A → B | Gates A → B |
| --- | ---: | ---: | ---: | --- |
| App profesional | 66,4 → **89,7** | 64,6 → **91,6** | 60,8 → 61,5 | reject → **accept** |
| Landing premium | 73,8 → **86,1** | 71,2 → **81,1** | 60,8 → 61,0 | reject → **accept** |
| Interfaz de juego | 71,6 → **86,5** | 63,3 → **82,8** | 60,9 → 61,3 | reject → **accept** |
| Escena 3D | 75,0 → **87,2** | 64,6 → **87,7** | 61,3 → 58,7 | reject → **accept** |
| Motion graphics | 74,0 → **78,6** | 69,4 → **83,5** | 60,8 → 60,4 | reject → **accept** |
| Analítica (ref. local) | 76,2 → **91,7** | 65,6 → **91,8** | 61,0 → 61,4 | reject → **accept** |
| Micrositio (ref. local) | 87,1 → **92,0** | 71,8 → **79,9** | 61,5 → 60,9 | reject → **accept** |

Los cinco casos de 0.5 se repitieron; los dos últimos usan renders propios del
repositorio como referencias independientes del MET.

### Causas corregidas, no umbrales

1. **Coherencia 0/14,5**: la paleta de B no se derivaba de la referencia. Ahora
   se extrae la paleta medida y se construye tema, superficies y acento.
2. **Iluminación 35–50**: fondos planos y capas demasiado opacas. Se añadieron
   luz clave, relleno, viñeta y materiales con sombra/desenfoque; HUD y 3D
   dejaron de usar colores fijos y usan tokens.
3. **Contraste crítico**: el texto derivado no cumplía WCAG. Se calcula el
   contraste y se aclara el color hasta 5,2:1 sobre superficie.
4. **Fidelidad del HUD 62,1**: paleta y luz alineadas con la referencia subieron
   a 82,8; el resto se declara proxy.
5. **Motion rígido**: el debugger leía `linear` para toda animación CSS porque
   usaba `getTiming().easing`. Ahora lee `animation-timing-function` real; además
   las escenas usan entrada con curva y corte con fundido.
6. **Rendimiento del gate**: el A/B medía FPS después de la inteligencia y el
   gate usaba un proxy. Ahora mide FPS primero y lo pasa como medición real a
   ambos casos.

### WebGL y vídeo

- Rotación Three.js: 1,5° esperados, **1,41° medidos**, error **0,09°**, 214
  frames, `status: verified`.
- Vídeo B: 1280×720, 25 fps, tres planos; comparación temporal **59,2/100**.
  La referencia sigue siendo un montaje derivado de una obra CC0, no una pieza
  externa licenciada.

## Autonomía real

| Agente | Ejecución | Resultado |
| --- | --- | --- |
| OpenCode 1.19.3 (`deepseek-v4.1-flash-free`) | 10 pasos reales sobre `reference.jpg` | crítica 58 → **100**; calidad 81,3 → **90,2**; contraste 6 → **0**; gates **accept** |
| Codex 0.172.0 | misma tarea, ejecución no interactiva | ver `docs/evidencia/0.6/autonomia/codex/`; se registra el resultado real, incluido cualquier fallo |
| Claude Code 2.1.328 | prueba no interactiva | `api_error` del proveedor; **no verificado** |

No se presenta una demo programada como autonomía: OpenCode ejecutó los
comandos, leyó las salidas y corrigió el HTML por sí mismo. El detalle está en
`docs/evidencia/0.6/autonomia/`.

## Consumo

- Tokens del A/B: A 747–951; B 925–1.585, estimados por caracteres/4. **No hay
  telemetría del proveedor** y así se etiqueta.
- OpenCode aportó su propio recuento en la sesión; se guarda como `reported`
  cuando está disponible y no se extrapola.

## Seguridad y plataformas

- API en `127.0.0.1` por defecto; fuera de loopback exige `--allow-remote`.
- Procesos sin `shell: true`; el instalador usa `cmd.exe` sólo para lanzadores
  `.cmd` con binario y argumentos del registro.
- Respaldos antes de escribir, manifiesto con rutas contenidas y desinstalación
  limitada a lo gestionado.
- Auditoría: `ve security` (sin bloqueos en Windows).
- **Linux/macOS**: flujo y CI preparados; **no ejecutados** en esta entrega.

## Preparación para 1.0

Falta: publicación autorizada, ejecución real en Linux/macOS, una pieza externa
licenciada para el A/B de motion, sesión autónoma de Cursor/Gemini/Freebuff y
aprobación artística humana de los siete casos.
