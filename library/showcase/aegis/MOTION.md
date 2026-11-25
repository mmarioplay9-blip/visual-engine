# Motion Director · Ciencia ficción

Nivel **restrained**. Duraciones 140/380/1200 ms; stagger 40 ms.

## Recetas

| ID | Uso | Duración | Easing | Reduced motion |
| --- | --- | ---: | --- | --- |
| micro | respuesta a hover/focus | 140 ms | cubic-bezier(.16,1,.3,1) | sin transformación; sólo cambio de color |
| enter | entrada de contenido | 380 ms | cubic-bezier(.16,1,.3,1) | aparece sin desplazamiento |
| exit | salida de contenido | 274 ms | cubic-bezier(.4,0,1,1) | desaparece sin desplazamiento |
| screen | transición entre pantallas | 1200 ms | cubic-bezier(.65,0,.35,1) | corte instantáneo |
| coordinated | coreografía escalonada | 380 ms | cubic-bezier(.34,1.56,.64,1) | todo visible; stagger 0 |
| interaction | respuesta a puntero | 140 ms | cubic-bezier(.34,1.56,.64,1) | sin escala; estado de color |

## Cámara

- **push-in**: acercamiento lento sin recorte; 0° máximo; 2160 ms.
- **orbit**: órbita corta sobre el objeto focal; 1.5° máximo; 1680 ms.
- **parallax**: desplazamiento relativo de tres planos; 0° máximo; 1440 ms.

## Validación

- Transición: **verified**; 31 muestras; monotónica sí; jerk máximo 0.006222. curva smoothstep muestreada; se exige monotonía y segunda diferencia < 0.01.
- Rotación: **verified**; esperada 2°, medida 1.5°, error 0.5°. patrón sintético rotado con ángulo conocido y estimador de cámara (hipótesis ±3°); se mide magnitud y se acepta error ≤ 1°.

## Límites

- La coreografía se entrega como CSS/GSAP/Motion; no todas las composiciones usan las tres librerías.
- La validación de rotación comprueba el estimador con una imagen sintética, no certifica cualquier render WebGL.
- La fluidez visual final depende del dispositivo; reduced-motion se prueba en Chromium.
- No se anima información crítica si el usuario prefiere movimiento reducido.
