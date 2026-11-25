# Wave Contours

Curvas de nivel topográficas desplazadas por ruido; terreno abstracto con lectura de profundidad.

- Categoría: **fondos**
- Motor: Canvas 2D
- Dependencias: ninguna
- Licencia: MIT (código propio de Visual Engine)
- Compatibilidad: Chromium/Firefox/Safari recientes; respeta `prefers-reduced-motion`; DPR limitado a 2.

## Integración

```js
import { mount } from './effect.js';

const canvas = document.querySelector('#ve-canvas');
const dispose = mount(canvas, {
  accent: '#12e0c8',
  accent2: '#ffb454',
});

// Al desmontar:
dispose();
```

`mount` devuelve una función de limpieza. El canvas debe tener tamaño CSS (100% o píxeles); el runtime ajusta el backing store y el DPR.

## Parámetros

| Nombre | Tipo | Defecto | Descripción |
| --- | --- | --- | --- |
| `bg` | color | `#05070d` | Fondo base |
| `accent` | color | `#12e0c8` | Acento frío |
| `accent2` | color | `#ffb454` | Acento cálido |
| `speed` | number | `1` | Velocidad de la animación |
| `lines` | number | `44` | Número de curvas |
| `depth` | number | `0.6` | Amplitud del terreno |

## Rendimiento e integración

- Medición reproducible: `ve benchmark --effect wave-contours`.
- Bucle de Canvas 2D; pausa con `document.hidden` y reduce DPR en móviles.
- No uses este efecto como capa de fondo si el texto principal no tiene contraste suficiente: mide con `ve review`.
- Los parámetros son independientes; evita combinar más de 6 capas animadas a pantalla completa sin medir FPS.

## Archivos

- `effect.js`: implementación y export `mount`.
- `config.js`: valores por defecto (sustituidos por `ve effects apply --set`).
- `ve-runtime.js`: runtime compartido, sin dependencias.
- `index.html`: previsualización autónoma.
