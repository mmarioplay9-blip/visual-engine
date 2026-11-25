# Dashboards financieros · sistema de diseño

Brief: Terminal de cartera para inversión sistemática

Proyecto: **landing**. Estilo: **financial-dashboard**. Modo: **dark**.
Puntuación estructural: **88.9/100** (no es una nota artística).

## Identidad y reglas

Datos primero, color con significado y números que se comparan verticalmente.

- Mono tabular
- Densidad 4 px
- Verde/rojo semánticos
- Gráficos sin decoración

Anti-patrones: Gradientes en el área de datos, Animaciones de carga infinitas, Colores no semánticos.

## Paleta semántica

| Rol | Valor | Uso |
| --- | --- | --- |
| background | `#071019` | lienzo |
| surface | `#0b1722` | tarjetas y paneles |
| text | `#f1f7fb` | contenido principal |
| muted | `#96acbb` | metadatos |
| accent | `#36d6a4` | acción y foco |
| accent2 | `#ff6b6b` | apoyo semántico |
| border | `#1d3342` | separación |
| success / warning / danger | `#36d6a4` / `#f7c948` / `#ff6b6b` | estado |

Contraste texto/fondo: **17.72:1**. Acento con tinta: **10.41:1**.

## Tipografía

- Display: **VE Inter** a 600, tracking -0.025em.
- Cuerpo: **VE Inter** a 430, línea 1.55, medida 70ch.
- Mono: **VE JetBrains Mono** para cifras y estados.
- Escala modular 1.2: caption 10.5px · small 12.3px · body 14px · lead 17.5px · h3 16.8px · h2 20.2px · h1 24.2px · display 29px · hero 34.8px.
- Responsive: caption: clamp(12px, 0.82vw, 11px); small: clamp(12px, 0.96vw, 12px); body: clamp(12px, 1.09vw, 14px); lead: clamp(13px, 1.37vw, 18px); h3: clamp(12px, 1.31vw, 17px); h2: clamp(15px, 1.58vw, 20px); h1: clamp(17px, 1.89vw, 24px); display: clamp(21px, 2.27vw, 29px); hero: clamp(25px, 2.72vw, 35px).

Fuentes locales bajo SIL Open Font License 1.1. No se descargan en tiempo de ejecución.

## Composición y layout

- Foco: serie temporal; alineación left; espacio negativo 18 %.
- Retícula 12 columnas, ancho 1560px, gutter 12px, unidad 4px.
- Radio 6px, borde 1px.
- Reglas: Rojo y verde siempre con signo; Cifras tabulares; Sin animación que oculte el dato.

## Materiales

Tipo **flat**; grano 0 %; blur 0px. Gradiente: none. Textura: retícula de gráfico.

## Movimiento

Nivel **still**. Duraciones 80/140/220 ms; salida cubic-bezier(.16,1,.3,1); spring cubic-bezier(.34,1.56,.64,1); stagger 0 ms. Cámara: ninguna. Reduced-motion desactiva animaciones no esenciales.

## Efectos compatibles

- `circuit-lines` — trama de datos. Solicitado explícitamente (fondos; MIT (propio)).
- `waveform-monitor` — hud. Solicitado explícitamente (hud; MIT (propio)).

## Componentes

- NavBar
- Hero
- PrimaryCTA
- ProofStrip
- FeatureGrid
- Footer

## Decisiones

- Proyecto landing: NavBar, Hero, PrimaryCTA antes de decorar.
- Estilo Dashboards financieros: Datos primero, color con significado y números que se comparan verticalmente.
- Tipografía sans + sans + mono; escala 1.2.
- Densidad compact; espacio base 4 px y radio 6 px.
- Movimiento still; transiciones de 80/140/220 ms.
- Efectos elegidos por función: circuit-lines (trama de datos), waveform-monitor (hud).
- Contraste de texto sobre fondo: 17.72:1.

## Auditoría estructural

- **contrast**: 100/100 — 17.72:1 OK; 16.76:1 OK; 8.13:1 OK; 10.41:1 OK
- **type-scale**: 55/100 — 9 pasos, cuerpo 14px, ratio 1.2
- **spacing**: 100/100 — base 4px, gutter 12px
- **hierarchy**: 67/100 — ratio 1.2, display 29px
- **restraint**: 100/100 — 2 efecto(s) para landing
- **motion-accessibility**: 100/100 — still; base 140ms; stagger 0ms
- **identity**: 100/100 — 4 reglas de firma; 3 anti-patrones

Auditoría estructural, no juicio artístico. Comprueba contraste, escala, ritmo, mesura y accesibilidad; la evaluación humana es independiente.

## Límites

- La elección artística final requiere revisión humana; esta ficha no la sustituye.
- El perfil no identifica fuentes de una imagen: aproxima familias y proporciones.

## Aplicación en esta composición

La página usa tokens DTCG y el CSS generado; los efectos se montan sin dependencias de red.
