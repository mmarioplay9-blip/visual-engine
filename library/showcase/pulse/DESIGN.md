# Motion graphics · sistema de diseño

Brief: Reproductor de música con análisis de frecuencia y movimiento

Proyecto: **landing**. Estilo: **motion-graphics**. Modo: **dark**.
Puntuación estructural: **99.2/100** (no es una nota artística).

## Identidad y reglas

Tiempo, ritmo y tipografía en movimiento; cada frame tiene una función.

- Tipografía 100–240 px
- Naranja de señal
- Cortes secos
- Timeline visible

Anti-patrones: Efectos sin ritmo, Fondos recargados, Transiciones genéricas.

## Paleta semántica

| Rol | Valor | Uso |
| --- | --- | --- |
| background | `#090909` | lienzo |
| surface | `#141414` | tarjetas y paneles |
| text | `#ffffff` | contenido principal |
| muted | `#b6b6b6` | metadatos |
| accent | `#ff6b35` | acción y foco |
| accent2 | `#7cf5ff` | apoyo semántico |
| border | `#333333` | separación |
| success / warning / danger | `#4ade80` / `#fbbf24` / `#fb7185` | estado |

Contraste texto/fondo: **19.91:1**. Acento con tinta: **6.82:1**.

## Tipografía

- Display: **VE Space Grotesk** a 800, tracking -0.065em.
- Cuerpo: **VE Inter** a 430, línea 1.55, medida 42ch.
- Mono: **VE JetBrains Mono** para cifras y estados.
- Escala modular 1.45: caption 12px · small 14px · body 16px · lead 20px · h3 23.2px · h2 33.6px · h1 48.8px · display 70.7px · hero 102.6px.
- Responsive: caption: clamp(12px, 0.94vw, 12px); small: clamp(12px, 1.09vw, 14px); body: clamp(12px, 1.25vw, 16px); lead: clamp(14px, 1.56vw, 20px); h3: clamp(17px, 1.81vw, 23px); h2: clamp(24px, 2.63vw, 34px); h1: clamp(35px, 3.81vw, 49px); display: clamp(51px, 5.52vw, 71px); hero: clamp(74px, 8.02vw, 103px).

Fuentes locales bajo SIL Open Font License 1.1. No se descargan en tiempo de ejecución.

## Composición y layout

- Foco: titular a sangre; alineación asymmetric; espacio negativo 30 %.
- Retícula 12 columnas, ancho 1400px, gutter 24px, unidad 8px.
- Radio 0px, borde 1px.
- Reglas: Corte en el pico de movimiento; Nunca animar todo a la vez.

## Materiales

Tipo **flat**; grano 5 %; blur 0px. Gradiente: linear-gradient(90deg, #ff6b35, transparent 35%). Textura: grano de película.

## Movimiento

Nivel **expressive**. Duraciones 150/500/1200 ms; salida cubic-bezier(.16,1,.3,1); spring cubic-bezier(.34,1.56,.64,1); stagger 80 ms. Cámara: zoom 1.12, rotación 1.2° en transición. Reduced-motion desactiva animaciones no esenciales.

## Efectos compatibles

- `waveform-monitor` — hud. Solicitado explícitamente (hud; MIT (propio)).
- `starfield-warp` — particulas. Solicitado explícitamente (particulas; MIT (propio)).
- `volumetric-rays` — haz de luz. Compatible con Motion graphics (iluminacion; MIT (propio)).

## Componentes

- NavBar
- Hero
- PrimaryCTA
- ProofStrip
- FeatureGrid
- Footer

## Decisiones

- Proyecto landing: NavBar, Hero, PrimaryCTA antes de decorar.
- Estilo Motion graphics: Tiempo, ritmo y tipografía en movimiento; cada frame tiene una función.
- Tipografía display + sans + mono; escala 1.45.
- Densidad balanced; espacio base 8 px y radio 0 px.
- Movimiento expressive; transiciones de 150/500/1200 ms.
- Efectos elegidos por función: waveform-monitor (hud), starfield-warp (particulas), volumetric-rays (haz de luz).
- Contraste de texto sobre fondo: 19.91:1.

## Auditoría estructural

- **contrast**: 100/100 — 19.91:1 OK; 18.42:1 OK; 9.82:1 OK; 6.82:1 OK
- **type-scale**: 100/100 — 9 pasos, cuerpo 16px, ratio 1.45
- **spacing**: 100/100 — base 8px, gutter 24px
- **hierarchy**: 94.5/100 — ratio 1.45, display 70.7px
- **restraint**: 100/100 — 3 efecto(s) para landing
- **motion-accessibility**: 100/100 — expressive; base 500ms; stagger 80ms
- **identity**: 100/100 — 4 reglas de firma; 3 anti-patrones

Auditoría estructural, no juicio artístico. Comprueba contraste, escala, ritmo, mesura y accesibilidad; la evaluación humana es independiente.

## Límites

- Movimiento expresivo: verifica prefers-reduced-motion y no bloquees la lectura.
- La elección artística final requiere revisión humana; esta ficha no la sustituye.
- El perfil no identifica fuentes de una imagen: aproxima familias y proporciones.

## Aplicación en esta composición

La página usa tokens DTCG y el CSS generado; los efectos se montan sin dependencias de red.
