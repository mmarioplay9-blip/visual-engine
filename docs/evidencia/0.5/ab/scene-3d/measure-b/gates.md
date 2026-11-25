# Quality Gates 0.5
Rechazado: 2 bloqueo(s). Una media alta no compensa un defecto crítico.
| Gate | Estado | Valor | Umbral | Bloquea | Detalle |
| --- | --- | ---: | ---: | --- | --- |
| Calidad visual global | pass | 76.8 | 72 | sí | Puntuación ponderada de las dimensiones disponibles. |
| Fidelidad estructural | fail | 66.1 | 70 | sí | No usa la similitud de píxeles como sustituto. |
| Composición | pass | 82.7 | 62 | sí | Balance de masa medido. |
| Tipografía y legibilidad | pass | 100 | 62 | sí | Auditoría DOM + escala. |
| Rendimiento | pass | 65.3 | 55 | sí | Estabilidad de captura; no son FPS. |
| Defectos críticos | pass | 0 | 0 | sí | Un defecto crítico bloquea aunque la media sea alta. |
| Defectos de gravedad alta | fail | 2 | 0 | sí | Los defectos altos también bloquean por defecto. |
| Contraste DOM | pass | 0 | 0 | sí | Peor contraste 6.13:1; 10 textos. |
| Funcionamiento sin errores | pass | 0 | 0 | sí | Consola, pageerror, recursos fallidos e imágenes rotas. |
| Aprobación artística humana | pending | pendiente | recomendada | no | No bloquea por configuración, pero queda pendiente y se declara. |
- Aviso: La calidad artística final aún no ha sido aprobada por una persona.