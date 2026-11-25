# Neumorphism · sistema de diseño

Brief: Aplicación de seguimiento de hábitos con superficies suaves

Proyecto: **landing**. Estilo: **neumorphism**. Modo: **light**.
Puntuación estructural: **89.2/100** (no es una nota artística).

## Identidad y reglas

Relieve suave y táctil; sólo funciona con una sola fuente de luz y contraste controlado.

- Doble sombra
- Radio 26 px
- Superficie única
- Acento azul acero

Anti-patrones: Sombras múltiples, Contraste bajo en texto, Brutalismo.

## Paleta semántica

| Rol | Valor | Uso |
| --- | --- | --- |
| background | `#e8edf2` | lienzo |
| surface | `#e8edf2` | tarjetas y paneles |
| text | `#24303c` | contenido principal |
| muted | `#5c6b79` | metadatos |
| accent | `#2e6f8e` | acción y foco |
| accent2 | `#9b6b3f` | apoyo semántico |
| border | `#c9d3dc` | separación |
| success / warning / danger | `#4ade80` / `#fbbf24` / `#fb7185` | estado |

Contraste texto/fondo: **11.41:1**. Acento con tinta: **4.72:1**.

## Tipografía

- Display: **VE Inter** a 550, tracking -0.03em.
- Cuerpo: **VE Inter** a 430, línea 1.55, medida 62ch.
- Mono: **VE JetBrains Mono** para cifras y estados.
- Escala modular 1.22: caption 12px · small 14px · body 16px · lead 20px · h3 19.5px · h2 23.8px · h1 29.1px · display 35.4px · hero 43.2px.
- Responsive: caption: clamp(12px, 0.94vw, 12px); small: clamp(12px, 1.09vw, 14px); body: clamp(12px, 1.25vw, 16px); lead: clamp(14px, 1.56vw, 20px); h3: clamp(14px, 1.52vw, 20px); h2: clamp(17px, 1.86vw, 24px); h1: clamp(21px, 2.27vw, 29px); display: clamp(25px, 2.77vw, 35px); hero: clamp(31px, 3.38vw, 43px).

Fuentes locales bajo SIL Open Font License 1.1. No se descargan en tiempo de ejecución.

## Composición y layout

- Foco: centro; alineación center; espacio negativo 46 %.
- Retícula 12 columnas, ancho 1180px, gutter 33px, unidad 10px.
- Radio 26px, borde 1px.
- Reglas: Una luz superior izquierda; Contraste de texto ≥ 7:1.

## Materiales

Tipo **soft**; grano 0 %; blur 0px. Gradiente: linear-gradient(145deg, #f7fafc, #dfe6ec). Textura: none.

## Movimiento

Nivel **restrained**. Duraciones 180/380/900 ms; salida cubic-bezier(.16,1,.3,1); spring cubic-bezier(.34,1.56,.64,1); stagger 60 ms. Cámara: sin cámara. Reduced-motion desactiva animaciones no esenciales.

## Efectos compatibles

- `wave-contours` — relieve de fondo. Solicitado explícitamente (fondos; MIT (propio)).
- `caustic-light` — luz suave. Solicitado explícitamente (iluminacion; MIT (propio)).

## Componentes

- NavBar
- Hero
- PrimaryCTA
- ProofStrip
- FeatureGrid
- Footer

## Decisiones

- Proyecto landing: NavBar, Hero, PrimaryCTA antes de decorar.
- Estilo Neumorphism: Relieve suave y táctil; sólo funciona con una sola fuente de luz y contraste controlado.
- Tipografía sans + sans + mono; escala 1.22.
- Densidad airy; espacio base 10 px y radio 26 px.
- Movimiento restrained; transiciones de 180/380/900 ms.
- Efectos elegidos por función: wave-contours (relieve de fondo), caustic-light (luz suave).
- Contraste de texto sobre fondo: 11.41:1.

## Auditoría estructural

- **contrast**: 100/100 — 11.41:1 OK; 11.41:1 OK; 4.65:1 OK; 4.72:1 OK
- **type-scale**: 55/100 — 9 pasos, cuerpo 16px, ratio 1.22
- **spacing**: 100/100 — base 10px, gutter 33px
- **hierarchy**: 69.19999999999999/100 — ratio 1.22, display 35.4px
- **restraint**: 100/100 — 2 efecto(s) para landing
- **motion-accessibility**: 100/100 — restrained; base 380ms; stagger 60ms
- **identity**: 100/100 — 4 reglas de firma; 3 anti-patrones

Auditoría estructural, no juicio artístico. Comprueba contraste, escala, ritmo, mesura y accesibilidad; la evaluación humana es independiente.

## Límites

- Los materiales requieren contraste explícito; no uses texto pequeño sobre superficies translúcidas sin auditar.
- La elección artística final requiere revisión humana; esta ficha no la sustituye.
- El perfil no identifica fuentes de una imagen: aproxima familias y proporciones.

## Aplicación en esta composición

La página usa tokens DTCG y el CSS generado; los efectos se montan sin dependencias de red.
