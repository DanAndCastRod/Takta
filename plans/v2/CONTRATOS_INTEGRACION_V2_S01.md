# Contratos de Integración V2 — Sprint S01/S06.2

> Fecha actualización: 2026-03-06
> Estado: Activo

## 1. Objetivo

Definir contratos canónicos para interoperabilidad entre módulos y gobierno de KPI MC.

## 2. Contexto Canónico Compartido

Campos base:

- `asset_id` (UUID)
- `product_reference_id` (UUID)
- `process_standard_id` (UUID)
- `period` (`YYYY-MM`) para mediciones KPI

Reglas:

- Compatibilidad de lectura para aliases legacy (`assetId`, `referenceId`, `standardId`).
- Escritura obligatoria en formato canónico.
- `period` inválido retorna `400`.

## 3. Endpoints de Integración Base

### `GET /api/integration/context/options`
Carga catálogos base para selector global de contexto.

### `GET /api/integration/context/summary`
Entrega resumen contextual + enlaces rápidos inter-módulo.

### `GET /api/ci/actions`
Lectura de acciones con filtros opcionales:

- `status`
- `asset_id`
- `source_document` (exacto)
- `source_prefix` (prefijo, útil para `KPI_MC:{period}:`)

## 4. Endpoints KPI MC (Nuevos)

### `GET /api/ci/kpis/mc/catalog`
Devuelve catálogo KPI MC activo.

### `POST /api/ci/kpis/mc/catalog/seed`
Siembra/reconcilia catálogo oficial KPI MC.

### `POST /api/ci/kpis/mc/catalog/close-pending-weights`
Normaliza pesos KPI MC con matriz oficial 2026 y marca definiciones como cerradas.

### `PATCH /api/ci/kpis/mc/catalog/{id}`
Actualiza pesos/metadata del KPI.

### `PUT /api/ci/kpis/mc/measurements`
Upsert de medición mensual.

Body:

```json
{
  "kpi_definition_id": "uuid",
  "period": "2026-03",
  "target_value": 100,
  "actual_value": 93,
  "compliance_pct": 93
}
```

### `GET /api/ci/kpis/mc/measurements?period=2026-03`
Lista mediciones del periodo.

### `DELETE /api/ci/kpis/mc/measurements/{id}`
Elimina medición.

### `GET /api/ci/kpis/mc/scorecard?period=2026-03`
Retorna scorecard ponderado por KPI/categoría/totales.

### `GET /api/ci/kpis/mc/trend?months=6&end_period=2026-03`
Retorna serie mensual KPI MC para tablero ejecutivo:

- `points[].period`
- `points[].completion_rate_pct`
- `points[].weighted_kpi_result_pct`
- `points[].red_items`
- `delta_vs_previous`
- `trend_alert.level`
- `trend_alert.message`
- `trend_alert.recommended_action`

### `GET /api/meetings/dashboard`
Incluye resumen KPI MC para conexión con comité semanal:

- `kpi_mc_period`
- `kpi_mc_completion_rate_pct`
- `kpi_mc_weighted_kpi_result_pct`
- `kpi_mc_red_items`
- `kpi_mc_previous_period`
- `kpi_mc_previous_weighted_kpi_result_pct`
- `kpi_mc_weighted_kpi_result_delta_pct`
- `kpi_mc_completion_rate_delta_pct`
- `kpi_mc_red_items_delta`
- `kpi_mc_target_pct`
- `kpi_mc_gap_to_target_pct`
- `kpi_mc_trend_alert_level`
- `kpi_mc_trend_alert_message`
- `kpi_mc_trend_recommended_action`

## 4.1 Endpoints SPC (S04)

### `GET /api/quality/weight-specs/{id}/spc/chart?limit=300&include_rules=true`
Devuelve carta I-MR contextual para muestreo de peso con:

- límites de control (`lcl`, `center_line`, `ucl`),
- serie de puntos con trazabilidad (`sample_id`, `measured_by`, `batch_code`, `shift`),
- evaluación de reglas Western Electric (`WE1..WE4`),
- `alert_level` consolidado.

### `GET /api/quality/weight-specs/{id}/spc/capability?limit=300`
Devuelve capacidad de proceso sobre la ventana:

- `cp`, `cpk`, `pp`, `ppk`,
- `sigma_within`, `sigma_overall`,
- estado de capacidad (`capable|marginal|not_capable|insufficient_data`).

### `POST /api/quality/weight-specs/{id}/spc/capability/runs`
Ejecuta corrida de capacidad on-demand y persiste snapshot histórico.

### `POST /api/quality/spc/capability/runs/batch`
Ejecuta corridas masivas por especificaciones activas (con filtro opcional `asset_id`).

### `GET /api/quality/weight-specs/{id}/spc/capability/runs?limit=60`
Lista histórico de corridas por especificación.

### `GET /api/quality/weight-specs/{id}/spc/capability/trend?bucket=month&points=12`
Devuelve tendencia agregada (`day|week|month`) con promedios `cp/cpk/pp/ppk`.

### `GET /api/quality/weight-specs/{id}/spc/export/csv?limit=300`
Exporta serie SPC en CSV para análisis externo.

## 4.2 Endpoints No Conformidades y CAPA (S06 base)

### `POST /api/quality/non-conformities/from-spc/{spec_id}`
Genera no conformidad desde alerta SPC activa (evita duplicar NC abiertas por especificación).

### `POST /api/quality/non-conformities`
Alta manual de no conformidad con contexto canónico opcional.

### `POST /api/quality/non-conformities/auto-generate`
Evalúa especificaciones SPC y crea NC automáticamente para alertas activas (`warning|critical`).

### `GET /api/quality/non-conformities`
Consulta de NC con filtros por `asset_id`, `source`, `severity`, `status`, `weight_specification_id`.

### `PATCH /api/quality/non-conformities/{id}`
Actualiza severidad/estado y campos de análisis (`root_cause`, `containment`).

Estados de workflow soportados:
- `Open`
- `In Progress`
- `Close Requested`
- `Approved`
- `Rejected`
- `Closed`
- `Verified`

### `DELETE /api/quality/non-conformities/{id}`
Elimina NC y acciones CAPA asociadas.

### `POST /api/quality/non-conformities/{id}/capa-actions`
Crea acción CAPA y puede vincular automáticamente `ImprovementAction` para `Action Tracker`.

### `GET /api/quality/non-conformities/{id}/capa-actions`
Lista acciones CAPA por NC.

### `PATCH /api/quality/capa-actions/{id}`
Actualiza CAPA (incluye sincronización de estado con `ImprovementAction` enlazada).

### `DELETE /api/quality/capa-actions/{id}`
Elimina acción CAPA.

### `GET /api/quality/capa/dashboard`
Resumen de backlog NC/CAPA (abiertas, críticas, vencidas y enlazadas a CI).

## 4.3 Integración Meetings <-> Calidad

### `GET /api/meetings/quality/issues?asset_id={uuid}`
Lista issues abiertos de calidad (`non_conformity`, `capa_action`) para agenda operativa.

### `POST /api/meetings/records/{id}/sync-quality-commitments`
Sincroniza issues NC/CAPA abiertos como compromisos del acta seleccionada.

### `GET /api/meetings/dashboard`
Incluye métricas ejecutivas de calidad:

- `quality_non_conformities_open`
- `quality_non_conformities_critical`
- `quality_capa_open`
- `quality_capa_overdue`

## 5. Respuesta canónica de scorecard (resumen)

```json
{
  "period": "2026-03",
  "totals": {
    "completion_rate_pct": 50,
    "weighted_individual_result_pct": 67.2,
    "weighted_kpi_result_pct": 63.8
  },
  "categories": [],
  "items": []
}
```

## 6. Garantías de Integridad

- Rechazo de referencias inexistentes.
- Cálculo de semáforo por cumplimiento.
- Trazabilidad de actualización por timestamp.
- Catálogo KPI MC idempotente con seed.
- Reglas automáticas de acciones por desvío KPI crítico.
- Reglas automáticas de workflow KPI por recuperación:
  - `compliance_pct >= 95` => transición de acción KPI a `Verified` con metadata de workflow (`system-kpi`).

