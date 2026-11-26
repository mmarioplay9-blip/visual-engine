# Quality Gates 0.5
Rechazado: 2 bloqueo(s). Una media alta no compensa un defecto crítico.
| Gate | Estado | Valor | Umbral | Bloquea | Detalle |
| --- | --- | ---: | ---: | --- | --- |
| Calidad visual global | pass | 95.2 | 72 | sí | Puntuación ponderada de las dimensiones disponibles. |
| Fidelidad estructural | pass | 94.9 | 70 | sí | No usa la similitud de píxeles como sustituto. |
| Composición | pass | 99.8 | 62 | sí | Balance de masa medido. |
| Tipografía y legibilidad | pass | 91.1 | 62 | sí | Auditoría DOM + escala. |
| Rendimiento | pass | 60.9 | 55 | sí | FPS medidos. |
| Defectos críticos | fail | 1 | 0 | sí | Un defecto crítico bloquea aunque la media sea alta. |
| Defectos de gravedad alta | pass | 0 | 0 | sí | Los defectos altos también bloquean por defecto. |
| Contraste DOM | fail | 31 | 0 | sí | Peor contraste 1.24:1; 49 textos. |
| Funcionamiento sin errores | pass | 0 | 0 | sí | Consola, pageerror, recursos fallidos e imágenes rotas. |
| Aprobación artística humana | pending | pendiente | recomendada | no | No bloquea por configuración, pero queda pendiente y se declara. |
- Aviso: La calidad artística final aún no ha sido aprobada por una persona.