# Señal 01 · demostración visual independiente

Una sola página, sin dependencias ni red, para comprobar lo que el motor dice medir:
shader propio, materiales, iluminación, animación, efectos y jerarquía tipográfica.
No usa ninguna composición de la biblioteca: es una pieza original construida a partir
de una referencia sintética (`reference.jpg`, generada para esta prueba y declarada como tal).

## Abrir

```bash
# opción 1: abrir el archivo
start demo/senal/index.html        # Windows
open  demo/senal/index.html        # macOS (no verificado en esta máquina)

# opción 2: servir en local (recomendado para backdrop-filter y capturas)
npx http-server demo/senal -p 4173 -c-1
# http://127.0.0.1:4173/?clean=1   → sin barra de controles, para capturar
```

## Qué demuestra cada capa

| Capa | Implementación | Cómo comprobarla |
| --- | --- | --- |
| **Shader** | WebGL 1, SDF de anillo con latón cepillado (ruido radial + micro-rasgos), especular Blinn y fresnel | Botón «Shader» lo apaga; el anillo desaparece y queda el CSS |
| **Materiales** | Latón procedural en GLSL; vidrio esmerilado con `backdrop-filter`; papel con `feTurbulence` inline | Botón «Luz» baja la clave a 0,35 y el latón pierde el reflejo |
| **Iluminación** | Clave cálida superior izquierda, contraluz frío inferior derecho, viñeta y sombra de contacto | Comparar con `reference.jpg`; la masa de luz está en el mismo cuadrante |
| **Animación** | `settle` de la tarjeta, `draw` de las barras, `breathe` de la luz, `grain` del papel | `prefers-reduced-motion` desactiva todo y deja el estado final |
| **Efectos** | Polvo suspendido en el shader, bloom cálido, grano animado | Botón «Polvo» lo retira sin tocar el resto |
| **Tipografía** | Grotesca del sistema, `tabular-nums`, escala `clamp`, etiqueta con relieve | La etiqueta y el pie de tarjeta usan la misma familia y jerarquía |
| **Accesibilidad** | `role="img"` con descripción, botones `aria-pressed`, foco visible, contraste AA | Tabular por los controles; el foco nunca se pierde |

Controles: `Shader`, `Polvo`, `Luz`, `Pausa`. La barra se oculta a los 4 s y vuelve con
ratón o teclado; `?clean=1` la elimina por completo para las capturas de evidencia.

## Resultado medido

`ve review --reference demo/senal/reference.jpg --target-dir demo/senal --frames 6 --width 1392 --height 752 --out demo/senal/evidencia`

| Métrica | Valor |
| --- | --- |
| Fidelidad | **87,6/100 (B)** · SSIM 0,5855 · ΔE 17,4 · MAE 0,137 |
| Calidad | **81,5/100** (coherencia 98,3 · accesibilidad 100 · fluidez 99,9) |
| Composición | 66,9 · jerarquía 67,3 · profundidad 63,2 · iluminación 78,5 |
| Tipografía | 52,2 · rendimiento 36,8 (proxy, ver límites) |
| Errores de consola | 0 |

Cada captura está en `evidencia/captures/` y el mapa de calor en `evidencia/diff/heatmap.png`.

## Correcciones y una que se revirtió

1. **El shader no compilaba**: `fwidth` exige `GL_OES_standard_derivatives` en WebGL 1. Se
   sustituyó por un ancho de antialias fijo. Sin esto el anillo no existía y la profundidad
   medida era 30,2.
2. **Radio en unidades equivocadas**: el shader normaliza por altura, pero el radio se pasaba
   en píxeles; el anillo quedaba fuera del lienzo. Corregido a unidades normalizadas.
3. **Canto interior invertido**: el `smoothstep` pintaba de verde el exterior en vez del
   interior. Corregido; la calidad pasó de 72,6 a 81,5.
4. **Intento de subir contraste** (viñeta y sombra más densas, grano al 20 %, línea teal):
   empeoró la fidelidad de 87,5 a 86,6 y el contraste de 16,2 a 15,6 %. **Revertido.** Se
   declara en vez de maquillarlo.

## Límites

- La referencia es **sintética** y generada; sirve para medir composición, paleta y luz, no
  para afirmar fidelidad frente a un diseño humano real.
- El texto de la referencia es ilegible por generación; el de la demo es deliberado y
  sustituye «8 MONE» por «SEÑAL 01» con masa tipográfica equivalente.
- La puntuación de **rendimiento es un proxy** (fluidez de fotogramas y coste de capas);
  no sustituye una medición con DevTools en tu GPU.
- La escena se revisó en Chromium headless 1392×752. **Firefox y Safari no se probaron.**
- Una puntuación alta no es aprobación artística: la decisión final es humana.
