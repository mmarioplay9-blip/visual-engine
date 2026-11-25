# Interfaces de videojuego · sistema de diseño

Brief: HUD de escuadrón para un shooter táctico competitivo

Proyecto: **landing**. Estilo: **game-ui**. Modo: **dark**.
Puntuación estructural: **97.2/100** (no es una nota artística).

## Identidad y reglas

HUD diegético, jerarquía instantánea y datos que se leen en movimiento.

- Esquinas de 6 px
- Barras segmentadas
- Verde señal
- Etiquetas de tecla

Anti-patrones: Texto menor de 12 px, Decoración sin estado, Contraste bajo.

## Paleta semántica

| Rol | Valor | Uso |
| --- | --- | --- |
| background | `#061016` | lienzo |
| surface | `#0b1a22` | tarjetas y paneles |
| text | `#eafbff` | contenido principal |
| muted | `#90b1ba` | metadatos |
| accent | `#63ffb5` | acción y foco |
| accent2 | `#ffcf5a` | apoyo semántico |
| border | `#1d4a56` | separación |
| success / warning / danger | `#4ade80` / `#fbbf24` / `#fb7185` | estado |

Contraste texto/fondo: **18.05:1**. Acento con tinta: **15.19:1**.

## Tipografía

- Display: **VE Space Grotesk** a 750, tracking -0.035em.
- Cuerpo: **VE Inter** a 430, línea 1.55, medida 52ch.
- Mono: **VE JetBrains Mono** para cifras y estados.
- Escala modular 1.32: caption 11.3px · small 13.1px · body 15px · lead 18.8px · h3 19.8px · h2 26.1px · h1 34.5px · display 45.5px · hero 60.1px.
- Responsive: caption: clamp(12px, 0.88vw, 11px); small: clamp(12px, 1.02vw, 13px); body: clamp(12px, 1.17vw, 15px); lead: clamp(14px, 1.47vw, 19px); h3: clamp(14px, 1.55vw, 20px); h2: clamp(19px, 2.04vw, 26px); h1: clamp(25px, 2.7vw, 35px); display: clamp(33px, 3.55vw, 46px); hero: clamp(43px, 4.7vw, 60px).

Fuentes locales bajo SIL Open Font License 1.1. No se descargan en tiempo de ejecución.

## Composición y layout

- Foco: centro de acción; alineación center; espacio negativo 22 %.
- Retícula 12 columnas, ancho 1500px, gutter 14px, unidad 4px.
- Radio 6px, borde 1px.
- Reglas: Datos de estado siempre visibles; Energía y vida nunca sólo por color.

## Materiales

Tipo **metal**; grano 3 %; blur 0px. Gradiente: linear-gradient(180deg, rgba(99,255,181,.1), transparent). Textura: triángulos de advertencia.

## Movimiento

Nivel **expressive**. Duraciones 90/300/600 ms; salida cubic-bezier(.16,1,.3,1); spring cubic-bezier(.34,1.56,.64,1); stagger 50 ms. Cámara: golpe lateral 1.5 %, retorno 0.4 s. Reduced-motion desactiva animaciones no esenciales.

## Efectos compatibles

- `target-reticle` — retícula de objetivo. Solicitado explícitamente (hud; MIT (propio)).
- `telemetry-grid` — telemetría del HUD. Solicitado explícitamente (hud; MIT (propio)).

## Componentes

- NavBar
- Hero
- PrimaryCTA
- ProofStrip
- FeatureGrid
- Footer

## Decisiones

- Proyecto landing: NavBar, Hero, PrimaryCTA antes de decorar.
- Estilo Interfaces de videojuego: HUD diegético, jerarquía instantánea y datos que se leen en movimiento.
- Tipografía display + sans + mono; escala 1.32.
- Densidad compact; espacio base 4 px y radio 6 px.
- Movimiento expressive; transiciones de 90/300/600 ms.
- Efectos elegidos por función: target-reticle (retícula de objetivo), telemetry-grid (telemetría del HUD).
- Contraste de texto sobre fondo: 18.05:1.

## Auditoría estructural

- **contrast**: 100/100 — 18.05:1 OK; 16.66:1 OK; 8.4:1 OK; 15.19:1 OK
- **type-scale**: 100/100 — 9 pasos, cuerpo 15px, ratio 1.32
- **spacing**: 100/100 — base 4px, gutter 14px
- **hierarchy**: 80.20000000000002/100 — ratio 1.32, display 45.5px
- **restraint**: 100/100 — 2 efecto(s) para landing
- **motion-accessibility**: 100/100 — expressive; base 300ms; stagger 50ms
- **identity**: 100/100 — 4 reglas de firma; 3 anti-patrones

Auditoría estructural, no juicio artístico. Comprueba contraste, escala, ritmo, mesura y accesibilidad; la evaluación humana es independiente.

## Límites

- Movimiento expresivo: verifica prefers-reduced-motion y no bloquees la lectura.
- La elección artística final requiere revisión humana; esta ficha no la sustituye.
- El perfil no identifica fuentes de una imagen: aproxima familias y proporciones.

## Aplicación en esta composición

La página usa tokens DTCG y el CSS generado; los efectos se montan sin dependencias de red.
