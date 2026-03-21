# FASE 1: Plataforma e Integración Base

> Objetivo: consolidar el contrato de integración entre módulos para operar V2 con contexto compartido y reglas de integridad.
> Estado: Completada (S01-S02) + hardening activo (S03)

---

## Sprint V2-S01 — Contratos de Integración y Modelo Canónico

### Contexto
V1 tenía capacidades funcionales robustas pero con navegación y relaciones parcialmente desacopladas.

### Entregables
- Contexto canónico (`asset_id`, `product_reference_id`, `process_standard_id`).
- Endpoints de contexto:
  - `GET /api/integration/context/options`
  - `GET /api/integration/context/summary`
- Guard de integridad referencial backend.

### Checklist
- [x] Contrato canónico definido y documentado.
- [x] Integridad referencial reforzada en backend.
- [x] Pruebas de integración para rutas críticas.

---

## Sprint V2-S02 — Navegación Contextual e Interoperabilidad

### Entregables
- Barra contextual y breadcrumbs globales.
- Canonicalización de query params legacy a formato canónico.
- Sincronización de contexto entre módulos clave.

### Checklist
- [x] URL canónica en frontend.
- [x] Enlaces cruzados con contexto persistente.
- [x] Back-navigation consistente.
- [x] Sidebar responsive mejorado.

---

## Sprint V2-S03 — Observabilidad, Eventos y Calidad de Datos

### Contexto
Con mayor integración, se requiere trazabilidad de eventos funcionales y calidad de sincronización.

### Alcance
- Eventos de dominio y telemetría funcional.
- Alertas de integridad y huérfanos.
- Tablero de salud de integración.

### Checklist
- [x] Catálogo de eventos por módulo.
- [x] Registro estructurado de eventos.
- [x] Tablero de salud de integración.
- [x] Job nocturno de validación de datos.

---

## Alineación KPI MC en Fase 1

Esta fase habilita la base técnica para KPI MC mediante:

- Contratos API consistentes para consumo front/back.
- Reglas canónicas para IDs y periodos.
- Compatibilidad de navegación contextual hacia `#/excellence` y `#/meetings`.

Estado KPI MC en Fase 1:
- [x] Soporte de integración listo para scorecard.
- [x] Navegación contextual disponible para seguimiento por activo.
- [x] Observabilidad avanzada de eventos KPI (S03 integrado en plataforma/settings).
