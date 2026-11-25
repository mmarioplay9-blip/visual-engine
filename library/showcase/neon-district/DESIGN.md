# Cyberpunk · sistema de diseño

Brief: Menú de videojuego de acción en una metrópolis lluviosa

Proyecto: **landing**. Estilo: **cyberpunk**. Modo: **dark**.
Puntuación estructural: **97.3/100** (no es una nota artística).

## Identidad y reglas

Tensión urbana, señal rota y contraste violento; el error forma parte del lenguaje.

- Bordes de 2 px
- Sombra desplazada
- Tipografía condensada
- Etiquetas de sistema

Anti-patrones: Minimalismo vacío, Pasteles, Glassmorphism genérico.

## Paleta semántica

| Rol | Valor | Uso |
| --- | --- | --- |
| background | `#08060d` | lienzo |
| surface | `#120d1b` | tarjetas y paneles |
| text | `#fff4fb` | contenido principal |
| muted | `#b7a1bd` | metadatos |
| accent | `#ff2e88` | acción y foco |
| accent2 | `#f4ff3f` | apoyo semántico |
| border | `#3a1e48` | separación |
| success / warning / danger | `#4ade80` / `#fbbf24` / `#fb7185` | estado |

Contraste texto/fondo: **18.79:1**. Acento con tinta: **5.52:1**.

## Tipografía

- Display: **VE Space Grotesk** a 750, tracking -0.04em.
- Cuerpo: **VE JetBrains Mono** a 430, línea 1.55, medida 64ch.
- Mono: **VE JetBrains Mono** para cifras y estados.
- Escala modular 1.33: caption 10.5px · small 12.3px · body 14px · lead 17.5px · h3 18.6px · h2 24.8px · h1 32.9px · display 43.8px · hero 58.3px.
- Responsive: caption: clamp(12px, 0.82vw, 11px); small: clamp(12px, 0.96vw, 12px); body: clamp(12px, 1.09vw, 14px); lead: clamp(13px, 1.37vw, 18px); h3: clamp(13px, 1.45vw, 19px); h2: clamp(18px, 1.94vw, 25px); h1: clamp(24px, 2.57vw, 33px); display: clamp(32px, 3.42vw, 44px); hero: clamp(42px, 4.55vw, 58px).

Fuentes locales bajo SIL Open Font License 1.1. No se descargan en tiempo de ejecución.

## Composición y layout

- Foco: diagonal; alineación asymmetric; espacio negativo 24 %.
- Retícula 12 columnas, ancho 1360px, gutter 14px, unidad 4px.
- Radio 0px, borde 2px.
- Reglas: Capas cortadas por bandas; El glitch aparece en transición, no permanente.

## Materiales

Tipo **plastic**; grano 9 %; blur 4px. Gradiente: linear-gradient(135deg, rgba(255,46,136,.2), transparent 48%). Textura: ruido + scanlines.

## Movimiento

Nivel **expressive**. Duraciones 140/300/700 ms; salida cubic-bezier(.16,1,.3,1); spring cubic-bezier(.2,1.8,.4,1); stagger 50 ms. Cámara: golpe lateral 4 %, rotación 0.6° con retorno. Reduced-motion desactiva animaciones no esenciales.

## Efectos compatibles

- `glitch-slices` — error de señal. Solicitado explícitamente (transiciones; MIT (propio)).
- `neon-rim` — borde luminoso. Solicitado explícitamente (iluminacion; MIT (propio)).

## Componentes

- NavBar
- Hero
- PrimaryCTA
- ProofStrip
- FeatureGrid
- Footer

## Decisiones

- Proyecto landing: NavBar, Hero, PrimaryCTA antes de decorar.
- Estilo Cyberpunk: Tensión urbana, señal rota y contraste violento; el error forma parte del lenguaje.
- Tipografía display + mono; escala 1.33.
- Densidad compact; espacio base 4 px y radio 0 px.
- Movimiento expressive; transiciones de 140/300/700 ms.
- Efectos elegidos por función: glitch-slices (error de señal), neon-rim (borde luminoso).
- Contraste de texto sobre fondo: 18.79:1.

## Auditoría estructural

- **contrast**: 100/100 — 18.79:1 OK; 17.82:1 OK; 8.49:1 OK; 5.52:1 OK
- **type-scale**: 100/100 — 9 pasos, cuerpo 14px, ratio 1.33
- **spacing**: 100/100 — base 4px, gutter 14px
- **hierarchy**: 81.30000000000001/100 — ratio 1.33, display 43.8px
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
