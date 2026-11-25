# Diseño editorial · sistema de diseño

Brief: Revista independiente de crítica cultural con retícula editorial

Proyecto: **landing**. Estilo: **editorial**. Modo: **light**.
Puntuación estructural: **98.7/100** (no es una nota artística).

## Identidad y reglas

Jerarquía periodística, retícula asimétrica y tensión entre serif y sans.

- Serif de 72–160 px
- Filetes negros
- Columna estrecha de datos
- Rojo de imprenta

Anti-patrones: Sombras, Gradientes llamativos, Texto justificado sin control.

## Paleta semántica

| Rol | Valor | Uso |
| --- | --- | --- |
| background | `#f3eee2` | lienzo |
| surface | `#faf6ec` | tarjetas y paneles |
| text | `#17140f` | contenido principal |
| muted | `#5c554a` | metadatos |
| accent | `#a62f24` | acción y foco |
| accent2 | `#1f4f46` | apoyo semántico |
| border | `#cfc4b0` | separación |
| success / warning / danger | `#2f6b4f` / `#8a5a12` / `#a52a3b` | estado |

Contraste texto/fondo: **15.86:1**. Acento con tinta: **5.94:1**.

## Tipografía

- Display: **VE Source Serif 4** a 600, tracking -0.045em.
- Cuerpo: **VE Inter** a 420, línea 1.6, medida 58ch.
- Mono: **VE JetBrains Mono** para cifras y estados.
- Escala modular 1.42: caption 12.8px · small 14.9px · body 17px · lead 21.3px · h3 24.1px · h2 34.3px · h1 48.7px · display 69.1px · hero 98.2px.
- Responsive: caption: clamp(12px, 1vw, 13px); small: clamp(12px, 1.16vw, 15px); body: clamp(12px, 1.33vw, 17px); lead: clamp(15px, 1.66vw, 21px); h3: clamp(17px, 1.88vw, 24px); h2: clamp(25px, 2.68vw, 34px); h1: clamp(35px, 3.8vw, 49px); display: clamp(50px, 5.4vw, 69px); hero: clamp(71px, 7.67vw, 98px).

Fuentes locales bajo SIL Open Font License 1.1. No se descargan en tiempo de ejecución.

## Composición y layout

- Foco: titular izquierdo; alineación asymmetric; espacio negativo 40 %.
- Retícula 12 columnas, ancho 1300px, gutter 36px, unidad 10px.
- Radio 0px, borde 1px.
- Reglas: Reglas horizontales como puntuación; Un solo acento rojo.

## Materiales

Tipo **paper**; grano 5 %; blur 0px. Gradiente: none. Textura: papel 120 g.

## Movimiento

Nivel **restrained**. Duraciones 140/440/950 ms; salida cubic-bezier(.16,1,.3,1); spring cubic-bezier(.34,1.56,.64,1); stagger 45 ms. Cámara: sin cámara; entrada por líneas. Reduced-motion desactiva animaciones no esenciales.

## Efectos compatibles

- `ink-diffusion` — tinta sobre papel. Solicitado explícitamente (distorsion; MIT (propio)).
- `dot-matrix` — fondos. Solicitado explícitamente (fondos; MIT (propio)).

## Componentes

- NavBar
- Hero
- PrimaryCTA
- ProofStrip
- FeatureGrid
- Footer

## Decisiones

- Proyecto landing: NavBar, Hero, PrimaryCTA antes de decorar.
- Estilo Diseño editorial: Jerarquía periodística, retícula asimétrica y tensión entre serif y sans.
- Tipografía serif + sans + mono; escala 1.42.
- Densidad balanced; espacio base 10 px y radio 0 px.
- Movimiento restrained; transiciones de 140/440/950 ms.
- Efectos elegidos por función: ink-diffusion (tinta sobre papel), dot-matrix (fondos).
- Contraste de texto sobre fondo: 15.86:1.

## Auditoría estructural

- **contrast**: 100/100 — 15.86:1 OK; 17.02:1 OK; 6.36:1 OK; 5.94:1 OK
- **type-scale**: 100/100 — 9 pasos, cuerpo 17px, ratio 1.42
- **spacing**: 100/100 — base 10px, gutter 36px
- **hierarchy**: 91.19999999999999/100 — ratio 1.42, display 69.1px
- **restraint**: 100/100 — 2 efecto(s) para landing
- **motion-accessibility**: 100/100 — restrained; base 440ms; stagger 45ms
- **identity**: 100/100 — 4 reglas de firma; 3 anti-patrones

Auditoría estructural, no juicio artístico. Comprueba contraste, escala, ritmo, mesura y accesibilidad; la evaluación humana es independiente.

## Límites

- La elección artística final requiere revisión humana; esta ficha no la sustituye.
- El perfil no identifica fuentes de una imagen: aproxima familias y proporciones.

## Aplicación en esta composición

La página usa tokens DTCG y el CSS generado; los efectos se montan sin dependencias de red.
