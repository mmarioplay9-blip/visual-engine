# Interfaces naturales y orgánicas · sistema de diseño

Brief: Aplicación de temporada de cultivo y trazabilidad local

Proyecto: **landing**. Estilo: **organic-natural**. Modo: **light**.
Puntuación estructural: **96.9/100** (no es una nota artística).

## Identidad y reglas

Formas blandas, materiales cálidos y ritmo humano; tecnología que se siente materia.

- Radio 32 px
- Verde bosque
- Terracota
- Texturas de papel

Anti-patrones: Neón, Bordes duros, Densidad financiera.

## Paleta semántica

| Rol | Valor | Uso |
| --- | --- | --- |
| background | `#f1eadc` | lienzo |
| surface | `#fbf6eb` | tarjetas y paneles |
| text | `#21352b` | contenido principal |
| muted | `#5c6b5b` | metadatos |
| accent | `#31705a` | acción y foco |
| accent2 | `#b45f3f` | apoyo semántico |
| border | `#d1c2a9` | separación |
| success / warning / danger | `#2f6b4f` / `#8a5a12` / `#a52a3b` | estado |

Contraste texto/fondo: **10.9:1**. Acento con tinta: **4.88:1**.

## Tipografía

- Display: **VE Source Serif 4** a 520, tracking -0.035em.
- Cuerpo: **VE Inter** a 420, línea 1.62, medida 60ch.
- Mono: **VE JetBrains Mono** para cifras y estados.
- Escala modular 1.3: caption 12.8px · small 14.9px · body 17px · lead 21.3px · h3 22.1px · h2 28.7px · h1 37.3px · display 48.6px · hero 63.1px.
- Responsive: caption: clamp(12px, 1vw, 13px); small: clamp(12px, 1.16vw, 15px); body: clamp(12px, 1.33vw, 17px); lead: clamp(15px, 1.66vw, 21px); h3: clamp(16px, 1.73vw, 22px); h2: clamp(21px, 2.24vw, 29px); h1: clamp(27px, 2.91vw, 37px); display: clamp(35px, 3.8vw, 49px); hero: clamp(45px, 4.93vw, 63px).

Fuentes locales bajo SIL Open Font License 1.1. No se descargan en tiempo de ejecución.

## Composición y layout

- Foco: diagonal orgánica; alineación asymmetric; espacio negativo 50 %.
- Retícula 12 columnas, ancho 1200px, gutter 38px, unidad 11px.
- Radio 32px, borde 1px.
- Reglas: Curvas grandes, una sola por bloque; Nada de ángulos rectos duros.

## Materiales

Tipo **paper**; grano 4 %; blur 2px. Gradiente: radial-gradient(circle at 20% 10%, rgba(180,95,63,.12), transparent 44%). Textura: fibra de papel.

## Movimiento

Nivel **restrained**. Duraciones 140/620/1300 ms; salida cubic-bezier(.22,.61,.36,1); spring cubic-bezier(.34,1.56,.64,1); stagger 60 ms. Cámara: respiración 1.01, sin rotación. Reduced-motion desactiva animaciones no esenciales.

## Efectos compatibles

- `caustic-light` — luz de agua. Solicitado explícitamente (iluminacion; MIT (propio)).
- `ink-diffusion` — tinta orgánica. Solicitado explícitamente (distorsion; MIT (propio)).

## Componentes

- NavBar
- Hero
- PrimaryCTA
- ProofStrip
- FeatureGrid
- Footer

## Decisiones

- Proyecto landing: NavBar, Hero, PrimaryCTA antes de decorar.
- Estilo Interfaces naturales y orgánicas: Formas blandas, materiales cálidos y ritmo humano; tecnología que se siente materia.
- Tipografía serif + sans + mono; escala 1.3.
- Densidad airy; espacio base 11 px y radio 32 px.
- Movimiento restrained; transiciones de 140/620/1300 ms.
- Efectos elegidos por función: caustic-light (luz de agua), ink-diffusion (tinta orgánica).
- Contraste de texto sobre fondo: 10.9:1.

## Auditoría estructural

- **contrast**: 100/100 — 10.9:1 OK; 12.11:1 OK; 4.73:1 OK; 4.88:1 OK
- **type-scale**: 100/100 — 9 pasos, cuerpo 17px, ratio 1.3
- **spacing**: 100/100 — base 11px, gutter 38px
- **hierarchy**: 78/100 — ratio 1.3, display 48.6px
- **restraint**: 100/100 — 2 efecto(s) para landing
- **motion-accessibility**: 100/100 — restrained; base 620ms; stagger 60ms
- **identity**: 100/100 — 4 reglas de firma; 3 anti-patrones

Auditoría estructural, no juicio artístico. Comprueba contraste, escala, ritmo, mesura y accesibilidad; la evaluación humana es independiente.

## Límites

- La elección artística final requiere revisión humana; esta ficha no la sustituye.
- El perfil no identifica fuentes de una imagen: aproxima familias y proporciones.

## Aplicación en esta composición

La página usa tokens DTCG y el CSS generado; los efectos se montan sin dependencias de red.
