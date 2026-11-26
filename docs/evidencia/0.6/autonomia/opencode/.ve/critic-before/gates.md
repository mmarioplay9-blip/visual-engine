# Quality Gates 0.5
Rechazado: 4 bloqueo(s). Una media alta no compensa un defecto crítico.
| Gate | Estado | Valor | Umbral | Bloquea | Detalle |
| --- | --- | ---: | ---: | --- | --- |
| Calidad visual global | pass | 81.3 | 72 | sí | Puntuación ponderada de las dimensiones disponibles. |
| Fidelidad estructural | pass | 74.6 | 70 | sí | No usa la similitud de píxeles como sustituto. |
| Composición | fail | 52.9 | 62 | sí | Balance de masa medido. |
| Tipografía y legibilidad | pass | 100 | 62 | sí | Auditoría DOM + escala. |
| Rendimiento | pass | 74.5 | 55 | sí | Estabilidad de captura; no son FPS. |
| Defectos críticos | fail | 1 | 0 | sí | Un defecto crítico bloquea aunque la media sea alta. |
| Defectos de gravedad alta | fail | 1 | 0 | sí | Los defectos altos también bloquean por defecto. |
| Contraste DOM | fail | 6 | 0 | sí | Peor contraste 3.33:1; 9 textos. |
| Funcionamiento sin errores | pass | 0 | 0 | sí | Consola, pageerror, recursos fallidos e imágenes rotas. |
| Aprobación artística humana | pending | pendiente | recomendada | no | No bloquea por configuración, pero queda pendiente y se declara. |
- Aviso: La calidad artística final aún no ha sido aprobada por una persona.