# Brutalismo · sistema de diseño

Brief: Cartel tipográfico para un festival de diseño independiente

Proyecto: **landing**. Estilo: **brutalism**. Modo: **light**.
Puntuación estructural: **100/100** (no es una nota artística).

## Identidad y reglas

Estructura expuesta, tipografía sin disculpas y contraste de bloque.

- Bordes 3 px
- Sombra sólida
- Amarillo ácido
- Tipografía mono grande

Anti-patrones: Redondeos, Glass, Sombras difusas.

## Paleta semántica

| Rol | Valor | Uso |
| --- | --- | --- |
| background | `#f2f0e8` | lienzo |
| surface | `#ffffff` | tarjetas y paneles |
| text | `#0b0b0b` | contenido principal |
| muted | `#4b4b4b` | metadatos |
| accent | `#ff3d00` | acción y foco |
| accent2 | `#1e3aff` | apoyo semántico |
| border | `#0b0b0b` | separación |
| success / warning / danger | `#4ade80` / `#fbbf24` / `#fb7185` | estado |

Contraste texto/fondo: **17.25:1**. Acento con tinta: **5.55:1**.

## Tipografía

- Display: **VE JetBrains Mono** a 800, tracking -0.07em.
- Cuerpo: **VE Inter** a 500, línea 1.55, medida 48ch.
- Mono: **VE JetBrains Mono** para cifras y estados.
- Escala modular 1.5: caption 12px · small 14px · body 16px · lead 20px · h3 24px · h2 36px · h1 54px · display 81px · hero 121.5px.
- Responsive: caption: clamp(12px, 0.94vw, 12px); small: clamp(12px, 1.09vw, 14px); body: clamp(12px, 1.25vw, 16px); lead: clamp(14px, 1.56vw, 20px); h3: clamp(17px, 1.88vw, 24px); h2: clamp(26px, 2.81vw, 36px); h1: clamp(39px, 4.22vw, 54px); display: clamp(58px, 6.33vw, 81px); hero: clamp(87px, 9.49vw, 122px).

Fuentes locales bajo SIL Open Font License 1.1. No se descargan en tiempo de ejecución.

## Composición y layout

- Foco: bloques apilados; alineación left; espacio negativo 20 %.
- Retícula 12 columnas, ancho 1440px, gutter 12px, unidad 5px.
- Radio 0px, borde 3px.
- Reglas: Bordes negros de 3 px; Sin radios; El amarillo es superficie, no adorno.

## Materiales

Tipo **flat**; grano 1 %; blur 0px. Gradiente: none. Textura: papel sin tratar.

## Movimiento

Nivel **expressive**. Duraciones 140/300/520 ms; salida cubic-bezier(.16,1,.3,1); spring steps(3, end); stagger 50 ms. Cámara: sin cámara. Reduced-motion desactiva animaciones no esenciales.

## Efectos compatibles

- `ink-diffusion` — distorsion. Solicitado explícitamente (distorsion; MIT (propio)).
- `dissolve-grain` — transiciones. Solicitado explícitamente (transiciones; MIT (propio)).
- `dot-matrix` — trama de impresión. Compatible con Brutalismo (fondos; MIT (propio)).

## Componentes

- NavBar
- Hero
- PrimaryCTA
- ProofStrip
- FeatureGrid
- Footer

## Decisiones

- Proyecto landing: NavBar, Hero, PrimaryCTA antes de decorar.
- Estilo Brutalismo: Estructura expuesta, tipografía sin disculpas y contraste de bloque.
- Tipografía mono + sans + mono; escala 1.5.
- Densidad compact; espacio base 5 px y radio 0 px.
- Movimiento expressive; transiciones de 140/300/520 ms.
- Efectos elegidos por función: ink-diffusion (distorsion), dissolve-grain (transiciones), dot-matrix (trama de impresión).
- Contraste de texto sobre fondo: 17.25:1.

## Auditoría estructural

- **contrast**: 100/100 — 17.25:1 OK; 19.68:1 OK; 7.65:1 OK; 5.55:1 OK
- **type-scale**: 100/100 — 9 pasos, cuerpo 16px, ratio 1.5
- **spacing**: 100/100 — base 5px, gutter 12px
- **hierarchy**: 100/100 — ratio 1.5, display 81px
- **restraint**: 100/100 — 3 efecto(s) para landing
- **motion-accessibility**: 100/100 — expressive; base 300ms; stagger 50ms
- **identity**: 100/100 — 4 reglas de firma; 3 anti-patrones

Auditoría estructural, no juicio artístico. Comprueba contraste, escala, ritmo, mesura y accesibilidad; la evaluación humana es independiente.

## Límites

- Movimiento expresivo: verifica prefers-reduced-motion y no bloquees la lectura.
- La elección artística final requiere revisión humana; esta ficha no la sustituye.
- El perfil no identifica fuentes de una imagen: aproxima familias y proporciones.

## Aplicación en esta composición

La página usa tokens DTCG y el CSS generado; los efectos se montan sin dependencias de red.
