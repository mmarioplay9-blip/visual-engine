# Futurista · sistema de diseño

Brief: Panel de operaciones para una red de infraestructura orbital

Proyecto: **dashboard**. Estilo: **futuristic**. Modo: **dark**.
Puntuación estructural: **96.9/100** (no es una nota artística).

## Identidad y reglas

Sistemas abiertos, retícula visible y tecnología que no grita; preciso, aéreo y rápido.

- Retícula de 24 px
- Cifras tabulares
- Acento cian-lima
- Esquinas de 10 px

Anti-patrones: Neón magenta, Texturas orgánicas, Sombras duras.

## Paleta semántica

| Rol | Valor | Uso |
| --- | --- | --- |
| background | `#050b12` | lienzo |
| surface | `#0a1520` | tarjetas y paneles |
| text | `#e9fbff` | contenido principal |
| muted | `#8ea9b8` | metadatos |
| accent | `#5ff2d6` | acción y foco |
| accent2 | `#7aa2ff` | apoyo semántico |
| border | `#17364a` | separación |
| success / warning / danger | `#4ade80` / `#fbbf24` / `#fb7185` | estado |

Contraste texto/fondo: **18.54:1**. Acento con tinta: **13.96:1**.

## Tipografía

- Display: **VE Space Grotesk** a 600, tracking -0.05em.
- Cuerpo: **VE Inter** a 430, línea 1.55, medida 60ch.
- Mono: **VE JetBrains Mono** para cifras y estados.
- Escala modular 1.3: caption 10.5px · small 12.3px · body 14px · lead 17.5px · h3 18.2px · h2 23.7px · h1 30.8px · display 40px · hero 52px.
- Responsive: caption: clamp(12px, 0.82vw, 11px); small: clamp(12px, 0.96vw, 12px); body: clamp(12px, 1.09vw, 14px); lead: clamp(13px, 1.37vw, 18px); h3: clamp(13px, 1.42vw, 18px); h2: clamp(17px, 1.85vw, 24px); h1: clamp(22px, 2.41vw, 31px); display: clamp(29px, 3.13vw, 40px); hero: clamp(37px, 4.06vw, 52px).

Fuentes locales bajo SIL Open Font License 1.1. No se descargan en tiempo de ejecución.

## Composición y layout

- Foco: izquierda + panel derecho; alineación asymmetric; espacio negativo 38 %.
- Retícula 12 columnas, ancho 1360px, gutter 28px, unidad 8px.
- Radio 10px, borde 1px.
- Reglas: Retícula visible sólo donde ayuda; Datos monoespaciados.

## Materiales

Tipo **glass**; grano 2 %; blur 14px. Gradiente: linear-gradient(120deg, rgba(95,242,214,.12), transparent 50%). Textura: retícula 24 px.

## Movimiento

Nivel **restrained**. Duraciones 140/420/1100 ms; salida cubic-bezier(.16,1,.3,1); spring cubic-bezier(.34,1.56,.64,1); stagger 60 ms. Cámara: orbita suave 2°, drift 2 %. Reduced-motion desactiva animaciones no esenciales.

## Efectos compatibles

- `circuit-lines` — retícula de sistema. Solicitado explícitamente (fondos; MIT (propio)).
- `radar-sweep` — hud. Solicitado explícitamente (hud; MIT (propio)).

## Componentes

- AppShell
- Sidebar
- TopBar
- MetricCard
- TimeSeries
- DataTable
- StatusLegend

## Decisiones

- Proyecto dashboard: AppShell, Sidebar, TopBar antes de decorar.
- Estilo Futurista: Sistemas abiertos, retícula visible y tecnología que no grita; preciso, aéreo y rápido.
- Tipografía display + sans + mono; escala 1.3.
- Densidad balanced; espacio base 8 px y radio 10 px.
- Movimiento restrained; transiciones de 140/420/1100 ms.
- Efectos elegidos por función: circuit-lines (retícula de sistema), radar-sweep (hud).
- Contraste de texto sobre fondo: 18.54:1.

## Auditoría estructural

- **contrast**: 100/100 — 18.54:1 OK; 17.27:1 OK; 8.01:1 OK; 13.96:1 OK
- **type-scale**: 100/100 — 9 pasos, cuerpo 14px, ratio 1.3
- **spacing**: 100/100 — base 8px, gutter 28px
- **hierarchy**: 78/100 — ratio 1.3, display 40px
- **restraint**: 100/100 — 2 efecto(s) para dashboard
- **motion-accessibility**: 100/100 — restrained; base 420ms; stagger 60ms
- **identity**: 100/100 — 4 reglas de firma; 3 anti-patrones

Auditoría estructural, no juicio artístico. Comprueba contraste, escala, ritmo, mesura y accesibilidad; la evaluación humana es independiente.

## Límites

- La elección artística final requiere revisión humana; esta ficha no la sustituye.
- El perfil no identifica fuentes de una imagen: aproxima familias y proporciones.

## Aplicación en esta composición

La página usa tokens DTCG y el CSS generado; los efectos se montan sin dependencias de red.
