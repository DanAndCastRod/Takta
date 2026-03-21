# FASE 2: Calidad Estadística y Nuevos Módulos

> Objetivo: extender Takta con control estadístico, variabilidad de proceso y gobierno cuantitativo de mejora continua.
> Estado: Implementada (seguimiento en mejora continua)

---

## Sprint V2-S04 — Módulo SPC

### Contexto
El muestreo de peso existe en V1, pero faltaba control estadístico orientado a decisión.

### Checklist
- [x] Modelos de cartas y ventanas de cálculo (I-MR sobre muestreo de peso).
- [x] Endpoints SPC contextuales.
- [x] Visualización de cartas y alertas.
- [x] Reglas Western Electric (WE1-WE4).
- [x] Exportación y trazabilidad (CSV SPC + metadatos de muestra).

---

## Sprint V2-S05 — Capacidad de Proceso y Cumplimiento

### Checklist
- [x] Cálculos Cp/Cpk/Pp/Ppk (base endpoint en muestreo de peso).
- [x] Ejecución batch y on-demand.
- [x] Tendencias históricas de capacidad.
- [x] Integración con acciones de Excelencia.
- [x] Pruebas matemáticas de consistencia.

---

## Sprint V2-S06 — No Conformidades y CAPA

### Checklist
- [x] Entidades `non_conformity` y `capa_action`.
- [x] Reglas de generación automática por desvío (evento en muestreo + ejecución masiva).
- [x] Workflow de aprobación/cierre (flujo multi-rol con `Close Requested`, `Approved`, `Verified`, `Rejected`).
- [x] Dashboard de backlog CAPA.
- [x] Integración con Meetings y Action Tracker.

---

## Sprint V2-S06.1 — Scorecard KPI MC (Implementado)

### Contexto
Se requería mapear KPI estratégicos de Mejoramiento Continuo con ponderación dual:

- `% Participación Individual`
- `% Participación KPI`

### Entregables ejecutados

1. Backend
- [x] Catálogo KPI MC semilla (12 ítems) con pesos explícitos.
- [x] Endpoint de seed idempotente.
- [x] Endpoint de actualización de definición KPI (ajuste de pesos pendientes).
- [x] Endpoint de medición periódica por `YYYY-MM`.
- [x] Endpoint de scorecard ponderado con agregados por eje.
- [x] Endpoint de tendencia mensual KPI MC (`/api/ci/kpis/mc/trend`).
- [x] Cálculo de semáforo por cumplimiento (`green/yellow/red`).

2. Frontend
- [x] Pestaña `KPI MC` en `#/excellence`.
- [x] Captura de meta/actual/cumplimiento por KPI.
- [x] Visualización de scorecard consolidado y por categoría.
- [x] Gestión de ítems con peso KPI pendiente desde UI.
- [x] Tablero de tendencia mensual KPI MC (3/6/9/12 meses).
- [x] Comparación intermensual KPI MC en `Actas IP` (dashboard + deltas).
- [x] Trazabilidad KPI -> Acción -> Workflow con salto a `Action Tracker`.

3. Calidad
- [x] Pruebas backend del flujo KPI MC.
- [x] Build frontend validado.

### Pendientes inmediatos
- [x] Cerrar pesos KPI faltantes con negocio (4 ítems) y normalizar catálogo oficial.
- [x] Automatizar creación de acciones por desviaciones críticas.
- [x] Conectar scorecard KPI con actas semanales (meetings).
- [x] Publicar tablero ejecutivo de tendencia mensual KPI MC.
- [x] Exponer comparación intermensual KPI MC en `Actas IP`.
- [x] Integrar aprobación/verificación automática de acciones KPI en workflow avanzado.
- [x] Incorporar alerta de tendencia KPI MC en dashboard ejecutivo.
- [x] Habilitar acciones de workflow inline desde tabla KPI MC.

---

## Alineación KPI MC

Esta fase es el núcleo de ejecución de los KPI MC. El modelo actual ya soporta:

- cálculo ponderado,
- gestión mensual,
- trazabilidad de cumplimiento,
- y evolución de pesos en caliente.

Siguiente expansión: integrar SPC + CAPA para cerrar ciclo diagnóstico -> acción -> verificación.

