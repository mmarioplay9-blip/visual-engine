# Quality Gates 0.5
Rechazado: 1 bloqueo(s). Una media alta no compensa un defecto crítico.
| Gate | Estado | Valor | Umbral | Bloquea | Detalle |
| --- | --- | ---: | ---: | --- | --- |
| Calidad visual global | pass | 77.1 | 72 | sí | Puntuación ponderada de las dimensiones disponibles. |
| Fidelidad estructural | pass | 72.8 | 70 | sí | No usa la similitud de píxeles como sustituto. |
| Composición | pass | 93.9 | 62 | sí | Balance de masa medido. |
| Tipografía y legibilidad | pass | 91.2 | 62 | sí | Auditoría DOM + escala. |
| Rendimiento | pass | 61.4 | 55 | sí | FPS medidos. |
| Defectos críticos | pass | 0 | 0 | sí | Un defecto crítico bloquea aunque la media sea alta. |
| Defectos de gravedad alta | fail | 2 | 0 | sí | Los defectos altos también bloquean por defecto. |
| Contraste DOM | pass | 0 | 0 | sí | Peor contraste 13:1; 5 textos. |
| Funcionamiento sin errores | pass | 0 | 0 | sí | Consola, pageerror, recursos fallidos e imágenes rotas. |
| Aprobación artística humana | pending | pendiente | recomendada | no | No bloquea por configuración, pero queda pendiente y se declara. |
- Aviso: La calidad artística final aún no ha sido aprobada por una persona.