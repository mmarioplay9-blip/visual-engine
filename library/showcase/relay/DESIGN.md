# Aplicaciones profesionales · sistema de diseño

Brief: Consola de soporte para equipos de operaciones

Proyecto: **landing**. Estilo: **professional-app**. Modo: **light**.
Puntuación estructural: **88.9/100** (no es una nota artística).

## Identidad y reglas

Densidad controlada, familiaridad y foco en la tarea; la interfaz desaparece.

- Radio 8 px
- Borde 1 px
- Azul de acción
- Densidad 32 px

Anti-patrones: Efectos animados en el área de trabajo, Tipografía decorativa, Sombras profundas.

## Paleta semántica

| Rol | Valor | Uso |
| --- | --- | --- |
| background | `#f4f6f9` | lienzo |
| surface | `#ffffff` | tarjetas y paneles |
| text | `#17202e` | contenido principal |
| muted | `#59677a` | metadatos |
| accent | `#2457d6` | acción y foco |
| accent2 | `#0f766e` | apoyo semántico |
| border | `#d9e0e9` | separación |
| success / warning / danger | `#2f6b4f` / `#8a5a12` / `#a52a3b` | estado |

Contraste texto/fondo: **15.12:1**. Acento con tinta: **5.69:1**.

## Tipografía

- Display: **VE Inter** a 620, tracking -0.025em.
- Cuerpo: **VE Inter** a 430, línea 1.45, medida 60ch.
- Mono: **VE JetBrains Mono** para cifras y estados.
- Escala modular 1.2: caption 10.5px · small 12.3px · body 14px · lead 17.5px · h3 16.8px · h2 20.2px · h1 24.2px · display 29px · hero 34.8px.
- Responsive: caption: clamp(12px, 0.82vw, 11px); small: clamp(12px, 0.96vw, 12px); body: clamp(12px, 1.09vw, 14px); lead: clamp(13px, 1.37vw, 18px); h3: clamp(12px, 1.31vw, 17px); h2: clamp(15px, 1.58vw, 20px); h1: clamp(17px, 1.89vw, 24px); display: clamp(21px, 2.27vw, 29px); hero: clamp(25px, 2.72vw, 35px).

Fuentes locales bajo SIL Open Font License 1.1. No se descargan en tiempo de ejecución.

## Composición y layout

- Foco: contenido principal; alineación left; espacio negativo 28 %.
- Retícula 12 columnas, ancho 1440px, gutter 15px, unidad 4px.
- Radio 8px, borde 1px.
- Reglas: La acción primaria compite con una sola cosa; Estados vacíos útiles.

## Materiales

Tipo **flat**; grano 0 %; blur 0px. Gradiente: none. Textura: ninguna.

## Movimiento

Nivel **restrained**. Duraciones 120/260/600 ms; salida cubic-bezier(.16,1,.3,1); spring cubic-bezier(.34,1.56,.64,1); stagger 30 ms. Cámara: sin cámara. Reduced-motion desactiva animaciones no esenciales.

## Efectos compatibles

- `circuit-lines` — fondos. Solicitado explícitamente (fondos; MIT (propio)).
- `wave-contours` — fondos. Solicitado explícitamente (fondos; MIT (propio)).
- `mesh-gradient` — fondo de marca sutil. Compatible con Aplicaciones profesionales (fondos; MIT (propio)).

## Componentes

- NavBar
- Hero
- PrimaryCTA
- ProofStrip
- FeatureGrid
- Footer

## Decisiones

- Proyecto landing: NavBar, Hero, PrimaryCTA antes de decorar.
- Estilo Aplicaciones profesionales: Densidad controlada, familiaridad y foco en la tarea; la interfaz desaparece.
- Tipografía sans + sans + mono; escala 1.2.
- Densidad compact; espacio base 4 px y radio 8 px.
- Movimiento restrained; transiciones de 120/260/600 ms.
- Efectos elegidos por función: circuit-lines (fondos), wave-contours (fondos), mesh-gradient (fondo de marca sutil).
- Contraste de texto sobre fondo: 15.12:1.

## Auditoría estructural

- **contrast**: 100/100 — 15.12:1 OK; 16.37:1 OK; 5.32:1 OK; 5.69:1 OK
- **type-scale**: 55/100 — 9 pasos, cuerpo 14px, ratio 1.2
- **spacing**: 100/100 — base 4px, gutter 15px
- **hierarchy**: 67/100 — ratio 1.2, display 29px
- **restraint**: 100/100 — 3 efecto(s) para landing
- **motion-accessibility**: 100/100 — restrained; base 260ms; stagger 30ms
- **identity**: 100/100 — 4 reglas de firma; 3 anti-patrones

Auditoría estructural, no juicio artístico. Comprueba contraste, escala, ritmo, mesura y accesibilidad; la evaluación humana es independiente.

## Límites

- La elección artística final requiere revisión humana; esta ficha no la sustituye.
- El perfil no identifica fuentes de una imagen: aproxima familias y proporciones.

## Aplicación en esta composición

La página usa tokens DTCG y el CSS generado; los efectos se montan sin dependencias de red.
