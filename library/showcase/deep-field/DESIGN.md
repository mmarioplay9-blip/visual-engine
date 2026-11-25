# Diseño 3D inmersivo · sistema de diseño

Brief: Experiencia inmersiva de divulgación astronómica

Proyecto: **landing**. Estilo: **immersive-3d**. Modo: **dark**.
Puntuación estructural: **97.6/100** (no es una nota artística).

## Identidad y reglas

Espacio, profundidad y capas; la cámara es parte de la composición.

- Violeta profundo
- Tarjetas flotantes
- Sombras de contacto
- Cámara orbital

Anti-patrones: UI plana sin profundidad, Exceso de blur, Texto sobre zona de alto detalle.

## Paleta semántica

| Rol | Valor | Uso |
| --- | --- | --- |
| background | `#05060f` | lienzo |
| surface | `#0d1224` | tarjetas y paneles |
| text | `#f3f5ff` | contenido principal |
| muted | `#a5b0d0` | metadatos |
| accent | `#8b7bff` | acción y foco |
| accent2 | `#4ee1d0` | apoyo semántico |
| border | `#27335a` | separación |
| success / warning / danger | `#4ade80` / `#fbbf24` / `#fb7185` | estado |

Contraste texto/fondo: **18.58:1**. Acento con tinta: **5.87:1**.

## Tipografía

- Display: **VE Space Grotesk** a 600, tracking -0.05em.
- Cuerpo: **VE Inter** a 430, línea 1.55, medida 62ch.
- Mono: **VE JetBrains Mono** para cifras y estados.
- Escala modular 1.35: caption 12px · small 14px · body 16px · lead 20px · h3 21.6px · h2 29.2px · h1 39.4px · display 53.1px · hero 71.7px.
- Responsive: caption: clamp(12px, 0.94vw, 12px); small: clamp(12px, 1.09vw, 14px); body: clamp(12px, 1.25vw, 16px); lead: clamp(14px, 1.56vw, 20px); h3: clamp(16px, 1.69vw, 22px); h2: clamp(21px, 2.28vw, 29px); h1: clamp(28px, 3.08vw, 39px); display: clamp(38px, 4.15vw, 53px); hero: clamp(52px, 5.6vw, 72px).

Fuentes locales bajo SIL Open Font License 1.1. No se descargan en tiempo de ejecución.

## Composición y layout

- Foco: objeto central desplazado; alineación center; espacio negativo 45 %.
- Retícula 12 columnas, ancho 1360px, gutter 38px, unidad 10px.
- Radio 20px, borde 1px.
- Reglas: Máximo tres planos de profundidad; La cámara respeta reduced-motion.

## Materiales

Tipo **glass**; grano 3 %; blur 16px. Gradiente: radial-gradient(circle at 70% 20%, rgba(139,123,255,.22), transparent 45%). Textura: profundidad volumétrica.

## Movimiento

Nivel **expressive**. Duraciones 140/520/1400 ms; salida cubic-bezier(.16,1,.3,1); spring cubic-bezier(.34,1.56,.64,1); stagger 60 ms. Cámara: órbita 6°, dolly-in 1.08, parallax 3 capas. Reduced-motion desactiva animaciones no esenciales.

## Efectos compatibles

- `cube-field` — campo 3D. Solicitado explícitamente (3d; MIT (propio)).
- `starfield-warp` — profundidad estelar. Solicitado explícitamente (particulas; MIT (propio)).

## Componentes

- NavBar
- Hero
- PrimaryCTA
- ProofStrip
- FeatureGrid
- Footer

## Decisiones

- Proyecto landing: NavBar, Hero, PrimaryCTA antes de decorar.
- Estilo Diseño 3D inmersivo: Espacio, profundidad y capas; la cámara es parte de la composición.
- Tipografía display + sans + mono; escala 1.35.
- Densidad airy; espacio base 10 px y radio 20 px.
- Movimiento expressive; transiciones de 140/520/1400 ms.
- Efectos elegidos por función: cube-field (campo 3D), starfield-warp (profundidad estelar).
- Contraste de texto sobre fondo: 18.58:1.

## Auditoría estructural

- **contrast**: 100/100 — 18.58:1 OK; 17.11:1 OK; 9.35:1 OK; 5.87:1 OK
- **type-scale**: 100/100 — 9 pasos, cuerpo 16px, ratio 1.35
- **spacing**: 100/100 — base 10px, gutter 38px
- **hierarchy**: 83.5/100 — ratio 1.35, display 53.1px
- **restraint**: 100/100 — 2 efecto(s) para landing
- **motion-accessibility**: 100/100 — expressive; base 520ms; stagger 60ms
- **identity**: 100/100 — 4 reglas de firma; 3 anti-patrones

Auditoría estructural, no juicio artístico. Comprueba contraste, escala, ritmo, mesura y accesibilidad; la evaluación humana es independiente.

## Límites

- Movimiento expresivo: verifica prefers-reduced-motion y no bloquees la lectura.
- La elección artística final requiere revisión humana; esta ficha no la sustituye.
- El perfil no identifica fuentes de una imagen: aproxima familias y proporciones.

## Aplicación en esta composición

La página usa tokens DTCG y el CSS generado; los efectos se montan sin dependencias de red.
