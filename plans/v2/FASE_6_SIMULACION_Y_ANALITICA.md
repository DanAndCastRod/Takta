# FASE 6: Simulación de Flujo y Analítica

> Objetivo: habilitar simulación operacional integrada y analítica avanzada para decisiones de capacidad, balanceo y mejora.
> Estado: Implementada (S16-S18 cerrados)

---

## Sprint V2-S16 — Motor de Simulación de Flujo

### Checklist
- [x] Modelo de simulación discreta (nodos/rutas/eventos).
- [x] Ejecución por intervalo y volumen (simulación visual continua en canvas).
- [x] Variabilidad (distribuciones de tiempo).
- [x] Persistencia de escenarios y resultados.
- [x] Validación contra histórico.

---

## Sprint V2-S17 — Semaforización de Densidad y Cuellos

### Checklist
- [x] Umbrales configurables de semáforo.
- [x] Pintado en tiempo real sobre diagrama.
- [x] Consumo de señales SPC/CAPA para ajustar capacidad efectiva de conectores.
- [x] Ranking de puntos críticos.
- [x] Vínculo automático con acciones de mejora.
- [x] Export ejecutivo de simulación.

---

## Sprint V2-S18 — Analítica de Escenarios y Recomendaciones

### Checklist
- [x] Comparador multi-escenario.
- [x] Integración con Ingeniería, Ejecución y SPC.
- [x] Impacto en throughput, WIP, lead time y cumplimiento.
- [x] Recomendaciones trazables.
- [x] Registro de decisiones y resultado real.

---

## Casos de simulación comprometidos

1. Cambio de layout.
2. Cambio de dotación.
3. Paro recurrente.
4. Variación peso/calidad.
5. Escenario pico por turno.

---

## Alineación KPI MC en Simulación

Los KPI MC deben consumir resultados de simulación para:

- priorizar iniciativas de mejora,
- cuantificar impacto esperado,
- y cerrar ciclo ROI (plan -> ejecución -> validación).

Estado actual:
- [x] Integración base scorecard/calidad en simulación iniciada (señales SPC/CAPA + backlog operativo en flujo).
- [x] Fundaciones de semáforo de flujo implementadas en editor.
