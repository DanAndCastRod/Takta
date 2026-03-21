# FASE 3: Motor de Ingeniería (Estándares, Tiempos y Capacidad)

> **Estado**: ✅ Implementada en alcance Full  
> **Última auditoría técnica**: 2026-03-03  
> **Objetivo**: Gestionar la tríada Activo + Actividad + SKU, cronometraje avanzado y capacidad/staffing.

---

## Resumen Ejecutivo

La fase de ingeniería quedó cerrada con backend y frontend conectados.

- CRUD completo de actividades, referencias y estándares.
- Carga masiva XLSX para ingeniería.
- Contexto Activo-Actividad y creación estricta de estándares.
- Cronómetro digital con modo regular y Work Sampling.
- Exportes de reportes y gestión de laps anormales.
- Capacidad con precedencias, staffing avanzado e histórico.
- Embebido de estándares en detalle de activo con alta/eliminación.

---

## Sprint 5: Estándares y Catálogos

### Implementado

- ✅ `POST/GET/PATCH/DELETE /api/engineering/activities`
- ✅ `POST/GET/PATCH/DELETE /api/engineering/references`
- ✅ `POST/GET/PATCH/DELETE /api/engineering/standards`
- ✅ `POST /api/engineering/standards/strict`
- ✅ `GET/POST/DELETE /api/engineering/context/{asset_id}/activities`
- ✅ Unidades SKU: `uom` y `packaging_uom`.
- ✅ Importación/exportación XLSX de actividades, referencias y estándares.
- ✅ Integración contextual desde Activos (`AssetDetail`) con alta rápida de estándar.

---

## Sprint 5.5: Capacidad y Staffing

### Implementado

- ✅ `GET /api/engineering/capacity/{asset_id}`
- ✅ `GET /api/engineering/capacity/{asset_id}/precedence`
- ✅ `POST/GET/DELETE /api/engineering/precedence/dependencies`
- ✅ `POST /api/engineering/capacity/{asset_id}/staffing/advanced`
- ✅ `GET /api/engineering/capacity/{asset_id}/staffing/history`
- ✅ Semaforización de utilización por escenarios en frontend de capacidad.

---

## Sprint 6: Cronómetro Digital

### Implementado

- ✅ Estudios base:
  - `POST/GET/DELETE /api/engineering/studies`
  - `GET /api/engineering/studies/{id}`
  - `POST /api/engineering/studies/{id}/sessions`
  - `POST /api/engineering/studies/{id}/laps`
  - `GET /api/engineering/studies/{id}/results`
  - `POST /api/engineering/studies/{id}/apply-to-standard`
- ✅ Work Sampling:
  - `POST/GET /api/engineering/studies/{id}/work-samples`
  - `GET /api/engineering/studies/{id}/work-sampling/results`
- ✅ Laps avanzados:
  - `GET /api/engineering/studies/{id}/laps`
  - `PATCH /api/engineering/studies/{id}/laps/{lap_id}`
- ✅ Reportes:
  - `GET /api/engineering/studies/{id}/report?output_format=markdown|csv|pdf`

---

## Evidencia Técnica

- Backend:
  - [engineering.py](/D:/Takta/Takta/backend/app/api/engineering.py)
  - [engineering_advanced.py](/D:/Takta/Takta/backend/app/api/engineering_advanced.py)
  - [capacity_engine.py](/D:/Takta/Takta/backend/app/services/capacity_engine.py)
- Frontend:
  - [EngineeringPage.js](/D:/Takta/Takta/frontend/src/pages/EngineeringPage.js)
  - [TimingPage.js](/D:/Takta/Takta/frontend/src/pages/TimingPage.js)
  - [CapacityPage.js](/D:/Takta/Takta/frontend/src/pages/CapacityPage.js)
  - [AssetDetail.js](/D:/Takta/Takta/frontend/src/components/assets/AssetDetail.js)
- Tests:
  - [test_engineering.py](/D:/Takta/Takta/backend/tests/test_engineering.py)

---

## Criterios de Aceptación (Estado)

1. Tríada CRUD con validaciones y autenticación: ✅  
2. Estudios asociados a activo/SKU/proceso estándar: ✅  
3. Work Sampling operativo con resultados estadísticos: ✅  
4. Reportería y manejo de laps anormales: ✅  
5. Capacidad, precedencias y staffing avanzado con histórico: ✅  
6. Integración UX desde activos hacia estándares: ✅
