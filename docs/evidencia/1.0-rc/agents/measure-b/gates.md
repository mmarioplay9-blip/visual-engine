# Quality Gates 0.5
Rechazado: 4 bloqueo(s). Una media alta no compensa un defecto crítico.
| Gate | Estado | Valor | Umbral | Bloquea | Detalle |
| --- | --- | ---: | ---: | --- | --- |
| Calidad visual global | fail | 62.3 | 72 | sí | Puntuación ponderada de las dimensiones disponibles. |
| Fidelidad estructural | fail | 48.4 | 70 | sí | No usa la similitud de píxeles como sustituto. |
| Composición | fail | 40.6 | 62 | sí | Balance de masa medido. |
| Tipografía y legibilidad | pass | 82.5 | 62 | sí | Auditoría DOM + escala. |
| Rendimiento | pass | 61.7 | 55 | sí | FPS medidos. |
| Defectos críticos | pass | 0 | 0 | sí | Un defecto crítico bloquea aunque la media sea alta. |
| Defectos de gravedad alta | fail | 5 | 0 | sí | Los defectos altos también bloquean por defecto. |
| Contraste DOM | pass | 0 | 0 | sí | Peor contraste 12.75:1; 2 textos. |
| Funcionamiento sin errores | pass | 0 | 0 | sí | Consola, pageerror, recursos fallidos e imágenes rotas. |
| Aprobación artística humana | pending | pendiente | recomendada | no | No bloquea por configuración, pero queda pendiente y se declara. |
- Aviso: La calidad artística final aún no ha sido aprobada por una persona.