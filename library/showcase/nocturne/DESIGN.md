# Cinematográfico · sistema de diseño

Brief: Sitio de estreno de un documental nocturno con grano y scope 2.39

Proyecto: **landing**. Estilo: **cinematic**. Modo: **dark**.
Puntuación estructural: **97.8/100** (no es una nota artística).

## Identidad y reglas

Luz directional, contraste profundo y ritmo de plano; la interfaz se comporta como una película.

- Letterbox 2.39:1
- Titular serif de alto contraste
- Acento latón
- Grano y viñeta medidos

Anti-patrones: Colores pastel, Bordes redondeados grandes, HUD saturado.

## Paleta semántica

| Rol | Valor | Uso |
| --- | --- | --- |
| background | `#070707` | lienzo |
| surface | `#11100e` | tarjetas y paneles |
| text | `#f5efe3` | contenido principal |
| muted | `#b9ac97` | metadatos |
| accent | `#e8b86b` | acción y foco |
| accent2 | `#5fc6bd` | apoyo semántico |
| border | `#3a3025` | separación |
| success / warning / danger | `#4ade80` / `#fbbf24` / `#fb7185` | estado |

Contraste texto/fondo: **17.59:1**. Acento con tinta: **10.59:1**.

## Tipografía

- Display: **VE Source Serif 4** a 500, tracking -0.035em.
- Cuerpo: **VE Inter** a 430, línea 1.55, medida 58ch.
- Mono: **VE JetBrains Mono** para cifras y estados.
- Escala modular 1.36: caption 12px · small 14px · body 16px · lead 20px · h3 21.8px · h2 29.6px · h1 40.2px · display 54.7px · hero 74.4px.
- Responsive: caption: clamp(12px, 0.94vw, 12px); small: clamp(12px, 1.09vw, 14px); body: clamp(12px, 1.25vw, 16px); lead: clamp(14px, 1.56vw, 20px); h3: clamp(16px, 1.7vw, 22px); h2: clamp(21px, 2.31vw, 30px); h1: clamp(29px, 3.14vw, 40px); display: clamp(39px, 4.27vw, 55px); hero: clamp(54px, 5.81vw, 74px).

Fuentes locales bajo SIL Open Font License 1.1. No se descargan en tiempo de ejecución.

## Composición y layout

- Foco: centro; alineación center; espacio negativo 50 %.
- Retícula 12 columnas, ancho 1280px, gutter 40px, unidad 11px.
- Radio 2px, borde 1px.
- Reglas: Banda de imagen con letterbox; Titular sobre el eje de luz.

## Materiales

Tipo **metal**; grano 7 %; blur 0px. Gradiente: linear-gradient(180deg, rgba(232,184,107,.08), transparent 42%). Textura: grano 35 mm.

## Movimiento

Nivel **expressive**. Duraciones 220/620/1400 ms; salida cubic-bezier(.16,1,.3,1); spring cubic-bezier(.34,1.56,.64,1); stagger 120 ms. Cámara: travelling lateral 2 %, zoom 1.06, sin rotación. Reduced-motion desactiva animaciones no esenciales.

## Efectos compatibles

- `anamorphic-bloom` — luz de lente. Solicitado explícitamente (iluminacion; MIT (propio)).
- `dissolve-grain` — transiciones. Solicitado explícitamente (transiciones; MIT (propio)).
- `dust-motes` — partículas en el haz. Compatible con Cinematográfico (particulas; MIT (propio)).

## Componentes

- NavBar
- Hero
- PrimaryCTA
- ProofStrip
- FeatureGrid
- Footer

## Decisiones

- Proyecto landing: NavBar, Hero, PrimaryCTA antes de decorar.
- Estilo Cinematográfico: Luz directional, contraste profundo y ritmo de plano; la interfaz se comporta como una película.
- Tipografía serif + sans + mono; escala 1.36.
- Densidad airy; espacio base 11 px y radio 2 px.
- Movimiento expressive; transiciones de 220/620/1400 ms.
- Efectos elegidos por función: anamorphic-bloom (luz de lente), dissolve-grain (transiciones), dust-motes (partículas en el haz).
- Contraste de texto sobre fondo: 17.59:1.

## Auditoría estructural

- **contrast**: 100/100 — 17.59:1 OK; 16.61:1 OK; 9.03:1 OK; 10.59:1 OK
- **type-scale**: 100/100 — 9 pasos, cuerpo 16px, ratio 1.36
- **spacing**: 100/100 — base 11px, gutter 40px
- **hierarchy**: 84.60000000000001/100 — ratio 1.36, display 54.7px
- **restraint**: 100/100 — 3 efecto(s) para landing
- **motion-accessibility**: 100/100 — expressive; base 620ms; stagger 120ms
- **identity**: 100/100 — 4 reglas de firma; 3 anti-patrones

Auditoría estructural, no juicio artístico. Comprueba contraste, escala, ritmo, mesura y accesibilidad; la evaluación humana es independiente.

## Límites

- Movimiento expresivo: verifica prefers-reduced-motion y no bloquees la lectura.
- La elección artística final requiere revisión humana; esta ficha no la sustituye.
- El perfil no identifica fuentes de una imagen: aproxima familias y proporciones.

## Aplicación en esta composición

La página usa tokens DTCG y el CSS generado; los efectos se montan sin dependencias de red.
