# Ciencia ficción · sistema de diseño

Brief: Sala de señales para monitorización de sensores remotos

Proyecto: **landing**. Estilo: **sci-fi**. Modo: **dark**.
Puntuación estructural: **96.2/100** (no es una nota artística).

## Identidad y reglas

Consola de misión: capas de información, tipografía técnica y una paleta de instrumento.

- Etiquetas en mayúsculas mono
- Barras de estado
- Verde fósforo y ámbar
- Esquinas vivas

Anti-patrones: Serif, Blanco puro dominante, Radios grandes.

## Paleta semántica

| Rol | Valor | Uso |
| --- | --- | --- |
| background | `#05090c` | lienzo |
| surface | `#0b1215` | tarjetas y paneles |
| text | `#f1f7ed` | contenido principal |
| muted | `#91a69c` | metadatos |
| accent | `#b8f36b` | acción y foco |
| accent2 | `#ff8b4a` | apoyo semántico |
| border | `#22383a` | separación |
| success / warning / danger | `#4ade80` / `#fbbf24` / `#fb7185` | estado |

Contraste texto/fondo: **18.34:1**. Acento con tinta: **14.8:1**.

## Tipografía

- Display: **VE JetBrains Mono** a 700, tracking -0.02em.
- Cuerpo: **VE Inter** a 430, línea 1.55, medida 64ch.
- Mono: **VE JetBrains Mono** para cifras y estados.
- Escala modular 1.26: caption 10.5px · small 12.3px · body 14px · lead 17.5px · h3 17.6px · h2 22.2px · h1 28px · display 35.3px · hero 44.5px.
- Responsive: caption: clamp(12px, 0.82vw, 11px); small: clamp(12px, 0.96vw, 12px); body: clamp(12px, 1.09vw, 14px); lead: clamp(13px, 1.37vw, 18px); h3: clamp(13px, 1.38vw, 18px); h2: clamp(16px, 1.73vw, 22px); h1: clamp(20px, 2.19vw, 28px); display: clamp(25px, 2.76vw, 35px); hero: clamp(32px, 3.48vw, 45px).

Fuentes locales bajo SIL Open Font License 1.1. No se descargan en tiempo de ejecución.

## Composición y layout

- Foco: centro de mando; alineación asymmetric; espacio negativo 30 %.
- Retícula 12 columnas, ancho 1400px, gutter 15px, unidad 4px.
- Radio 2px, borde 1px.
- Reglas: Jerarquía por densidad, no por tamaño; Separadores de 1 px.

## Materiales

Tipo **metal**; grano 4 %; blur 0px. Gradiente: linear-gradient(180deg, rgba(184,243,107,.06), transparent). Textura: scanlines 3 px.

## Movimiento

Nivel **restrained**. Duraciones 140/380/1200 ms; salida cubic-bezier(.16,1,.3,1); spring cubic-bezier(.34,1.56,.64,1); stagger 40 ms. Cámara: paneo orbital 3°, sin zoom. Reduced-motion desactiva animaciones no esenciales.

## Efectos compatibles

- `radar-sweep` — barrido de radar. Solicitado explícitamente (hud; MIT (propio)).
- `waveform-monitor` — hud. Solicitado explícitamente (hud; MIT (propio)).
- `wireframe-globe` — globo wireframe. Compatible con Ciencia ficción (3d; MIT (propio)).

## Componentes

- NavBar
- Hero
- PrimaryCTA
- ProofStrip
- FeatureGrid
- Footer

## Decisiones

- Proyecto landing: NavBar, Hero, PrimaryCTA antes de decorar.
- Estilo Ciencia ficción: Consola de misión: capas de información, tipografía técnica y una paleta de instrumento.
- Tipografía mono + sans + mono; escala 1.26.
- Densidad compact; espacio base 4 px y radio 2 px.
- Movimiento restrained; transiciones de 140/380/1200 ms.
- Efectos elegidos por función: radar-sweep (barrido de radar), waveform-monitor (hud), wireframe-globe (globo wireframe).
- Contraste de texto sobre fondo: 18.34:1.

## Auditoría estructural

- **contrast**: 100/100 — 18.34:1 OK; 17.33:1 OK; 7.74:1 OK; 14.8:1 OK
- **type-scale**: 100/100 — 9 pasos, cuerpo 14px, ratio 1.26
- **spacing**: 100/100 — base 4px, gutter 15px
- **hierarchy**: 73.6/100 — ratio 1.26, display 35.3px
- **restraint**: 100/100 — 3 efecto(s) para landing
- **motion-accessibility**: 100/100 — restrained; base 380ms; stagger 40ms
- **identity**: 100/100 — 4 reglas de firma; 3 anti-patrones

Auditoría estructural, no juicio artístico. Comprueba contraste, escala, ritmo, mesura y accesibilidad; la evaluación humana es independiente.

## Límites

- La elección artística final requiere revisión humana; esta ficha no la sustituye.
- El perfil no identifica fuentes de una imagen: aproxima familias y proporciones.

## Aplicación en esta composición

La página usa tokens DTCG y el CSS generado; los efectos se montan sin dependencias de red.
