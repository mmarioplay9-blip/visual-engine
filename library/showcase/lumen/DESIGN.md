# Minimalismo premium · sistema de diseño

Brief: Landing de estudio de arquitectura con luz natural y materialidad

Proyecto: **landing**. Estilo: **minimal-premium**. Modo: **light**.
Puntuación estructural: **97.5/100** (no es una nota artística).

## Identidad y reglas

Contenido escaso, tensión por escala y espacio; el lujo está en lo que se omite.

- Titular de 2–4 palabras
- Regla horizontal fina
- Mucho aire perimetral
- Un único acento cálido

Anti-patrones: Gradientes arcoíris, Sombras difusas grandes, Más de dos familias.

## Paleta semántica

| Rol | Valor | Uso |
| --- | --- | --- |
| background | `#f6f2ea` | lienzo |
| surface | `#fffdf8` | tarjetas y paneles |
| text | `#171512` | contenido principal |
| muted | `#5f5a52` | metadatos |
| accent | `#9b3d2e` | acción y foco |
| accent2 | `#1f5b4d` | apoyo semántico |
| border | `#d6cdbf` | separación |
| success / warning / danger | `#2f6b4f` / `#8a5a12` / `#a52a3b` | estado |

Contraste texto/fondo: **16.32:1**. Acento con tinta: **6.07:1**.

## Tipografía

- Display: **VE Space Grotesk** a 500, tracking -0.055em.
- Cuerpo: **VE Inter** a 430, línea 1.55, medida 54ch.
- Mono: **VE JetBrains Mono** para cifras y estados.
- Escala modular 1.34: caption 12px · small 14px · body 16px · lead 20px · h3 21.4px · h2 28.7px · h1 38.5px · display 51.6px · hero 69.1px.
- Responsive: caption: clamp(12px, 0.94vw, 12px); small: clamp(12px, 1.09vw, 14px); body: clamp(12px, 1.25vw, 16px); lead: clamp(14px, 1.56vw, 20px); h3: clamp(15px, 1.67vw, 21px); h2: clamp(21px, 2.24vw, 29px); h1: clamp(28px, 3.01vw, 39px); display: clamp(37px, 4.03vw, 52px); hero: clamp(50px, 5.4vw, 69px).

Fuentes locales bajo SIL Open Font License 1.1. No se descargan en tiempo de ejecución.

## Composición y layout

- Foco: centro-izquierda; alineación left; espacio negativo 62 %.
- Retícula 12 columnas, ancho 1180px, gutter 50px, unidad 12px.
- Radio 4px, borde 1px.
- Reglas: Una idea por viewport; Líneas de 1 px, nunca cajas pesadas.

## Materiales

Tipo **flat**; grano 1 %; blur 0px. Gradiente: none. Textura: none.

## Movimiento

Nivel **restrained**. Duraciones 180/480/1100 ms; salida cubic-bezier(.16,1,.3,1); spring cubic-bezier(.34,1.56,.64,1); stagger 70 ms. Cámara: drift vertical 1.5 %, sin zoom. Reduced-motion desactiva animaciones no esenciales.

## Efectos compatibles

- `mesh-gradient` — atmósfera casi imperceptible. Solicitado explícitamente (fondos; MIT (propio)).
- `dust-motes` — textura espacial. Solicitado explícitamente (particulas; MIT (propio)).

## Componentes

- NavBar
- Hero
- PrimaryCTA
- ProofStrip
- FeatureGrid
- Footer

## Decisiones

- Proyecto landing: NavBar, Hero, PrimaryCTA antes de decorar.
- Estilo Minimalismo premium: Contenido escaso, tensión por escala y espacio; el lujo está en lo que se omite.
- Tipografía display + sans + mono; escala 1.34.
- Densidad airy; espacio base 12 px y radio 4 px.
- Movimiento restrained; transiciones de 180/480/1100 ms.
- Efectos elegidos por función: mesh-gradient (atmósfera casi imperceptible), dust-motes (textura espacial).
- Contraste de texto sobre fondo: 16.32:1.

## Auditoría estructural

- **contrast**: 100/100 — 16.32:1 OK; 17.93:1 OK; 6.12:1 OK; 6.07:1 OK
- **type-scale**: 100/100 — 9 pasos, cuerpo 16px, ratio 1.34
- **spacing**: 100/100 — base 12px, gutter 50px
- **hierarchy**: 82.4/100 — ratio 1.34, display 51.6px
- **restraint**: 100/100 — 2 efecto(s) para landing
- **motion-accessibility**: 100/100 — restrained; base 480ms; stagger 70ms
- **identity**: 100/100 — 4 reglas de firma; 3 anti-patrones

Auditoría estructural, no juicio artístico. Comprueba contraste, escala, ritmo, mesura y accesibilidad; la evaluación humana es independiente.

## Límites

- La elección artística final requiere revisión humana; esta ficha no la sustituye.
- El perfil no identifica fuentes de una imagen: aproxima familias y proporciones.

## Aplicación en esta composición

La página usa tokens DTCG y el CSS generado; los efectos se montan sin dependencias de red.
