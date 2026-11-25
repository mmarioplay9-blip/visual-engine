# Glassmorphism · sistema de diseño

Brief: Editor colaborativo de mapas de producto

Proyecto: **landing**. Estilo: **glassmorphism**. Modo: **dark**.
Puntuación estructural: **88.5/100** (no es una nota artística).

## Identidad y reglas

Profundidad por capas translúcidas; el vidrio debe revelar jerarquía, no ocultarla.

- Superficies translúcidas
- Borde blanco al 16 %
- Radio 24 px
- Luz fría

Anti-patrones: Vidrio sobre texto pequeño, Blur excesivo sin contraste, Más de tres capas.

## Paleta semántica

| Rol | Valor | Uso |
| --- | --- | --- |
| background | `#0a1120` | lienzo |
| surface | `rgba(20,32,52,.56)` | tarjetas y paneles |
| text | `#f4f8ff` | contenido principal |
| muted | `#b2c0d6` | metadatos |
| accent | `#9ee7ff` | acción y foco |
| accent2 | `#c8a8ff` | apoyo semántico |
| border | `rgba(255,255,255,.16)` | separación |
| success / warning / danger | `#4ade80` / `#fbbf24` / `#fb7185` | estado |

Contraste texto/fondo: **17.7:1**. Acento con tinta: **14.11:1**.

## Tipografía

- Display: **VE Space Grotesk** a 550, tracking -0.04em.
- Cuerpo: **VE Inter** a 420, línea 1.55, medida 62ch.
- Mono: **VE JetBrains Mono** para cifras y estados.
- Escala modular 1.27: caption 12px · small 14px · body 16px · lead 20px · h3 20.3px · h2 25.8px · h1 32.8px · display 41.6px · hero 52.9px.
- Responsive: caption: clamp(12px, 0.94vw, 12px); small: clamp(12px, 1.09vw, 14px); body: clamp(12px, 1.25vw, 16px); lead: clamp(14px, 1.56vw, 20px); h3: clamp(15px, 1.59vw, 20px); h2: clamp(19px, 2.02vw, 26px); h1: clamp(24px, 2.56vw, 33px); display: clamp(30px, 3.25vw, 42px); hero: clamp(38px, 4.13vw, 53px).

Fuentes locales bajo SIL Open Font License 1.1. No se descargan en tiempo de ejecución.

## Composición y layout

- Foco: tarjeta central flotante; alineación center; espacio negativo 48 %.
- Retícula 12 columnas, ancho 1240px, gutter 28px, unidad 8px.
- Radio 24px, borde 1px.
- Reglas: Máximo dos niveles de vidrio; Borde luminoso de 1 px.

## Materiales

Tipo **glass**; grano 2 %; blur 22px. Gradiente: linear-gradient(145deg, rgba(255,255,255,.18), transparent 60%). Textura: blur real.

## Movimiento

Nivel **restrained**. Duraciones 140/460/1000 ms; salida cubic-bezier(.16,1,.3,1); spring cubic-bezier(.34,1.56,.64,1); stagger 60 ms. Cámara: parallax de puntero 2 %, sin rotación. Reduced-motion desactiva animaciones no esenciales.

## Efectos compatibles

- `mesh-gradient` — fondos. Solicitado explícitamente (fondos; MIT (propio)).
- `glass-refraction` — refracción de fondo. Solicitado explícitamente (materiales; MIT (propio)).
- `bokeh-drift` — profundidad desenfocada. Compatible con Glassmorphism (particulas; MIT (propio)).

## Componentes

- NavBar
- Hero
- PrimaryCTA
- ProofStrip
- FeatureGrid
- Footer

## Decisiones

- Proyecto landing: NavBar, Hero, PrimaryCTA antes de decorar.
- Estilo Glassmorphism: Profundidad por capas translúcidas; el vidrio debe revelar jerarquía, no ocultarla.
- Tipografía display + sans + mono; escala 1.27.
- Densidad balanced; espacio base 8 px y radio 24 px.
- Movimiento restrained; transiciones de 140/460/1000 ms.
- Efectos elegidos por función: mesh-gradient (fondos), glass-refraction (refracción de fondo), bokeh-drift (profundidad desenfocada).
- Contraste de texto sobre fondo: 17.7:1.

## Auditoría estructural

- **contrast**: 45/100 — 17.7:1 OK; 1.07:1 BAJO; 10.24:1 OK; 14.11:1 OK
- **type-scale**: 100/100 — 9 pasos, cuerpo 16px, ratio 1.27
- **spacing**: 100/100 — base 8px, gutter 28px
- **hierarchy**: 74.7/100 — ratio 1.27, display 41.6px
- **restraint**: 100/100 — 3 efecto(s) para landing
- **motion-accessibility**: 100/100 — restrained; base 460ms; stagger 60ms
- **identity**: 100/100 — 4 reglas de firma; 3 anti-patrones

Auditoría estructural, no juicio artístico. Comprueba contraste, escala, ritmo, mesura y accesibilidad; la evaluación humana es independiente.

## Límites

- Los materiales requieren contraste explícito; no uses texto pequeño sobre superficies translúcidas sin auditar.
- La elección artística final requiere revisión humana; esta ficha no la sustituye.
- El perfil no identifica fuentes de una imagen: aproxima familias y proporciones.

## Aplicación en esta composición

La página usa tokens DTCG y el CSS generado; los efectos se montan sin dependencias de red.
