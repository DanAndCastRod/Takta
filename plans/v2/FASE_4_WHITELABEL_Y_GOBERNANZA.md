# FASE 4: White Label y Gobernanza

> Objetivo: habilitar Takta como plataforma marca blanca y multi-tenant con aislamiento, configuración y auditoría.
> Estado: Implementada (S10-S12 cerrados)

---

## Sprint V2-S10 — Núcleo White Label

### Checklist
- [x] Modelo `tenant_theme` y `tenant_ui_config`.
- [x] Branding runtime por tenant.
- [x] Menú configurable por módulo/rol.
- [x] Fallback seguro de configuración.
- [x] Validación visual multi-tenant.

---

## Sprint V2-S11 — Feature Flags por Cliente

### Checklist
- [x] Matriz de módulos por tenant.
- [x] Middleware de habilitación por feature.
- [x] UI de administración de flags.
- [x] Auditoría de cambios de configuración.
- [x] Perfiles mínimo/full por cliente.

---

## Sprint V2-S12 — Seguridad y Operación Multi-tenant

### Checklist
- [x] `tenant_id` y reglas de aislamiento.
- [x] Blindaje de consultas backend.
- [x] Bitácora de auditoría consultable.
- [x] Política de backup/restauración.
- [x] Pruebas de permisos y fuga de datos.

---

## Alineación KPI MC para White Label

Para KPI MC se requiere:

- Catálogo KPI parametrizable por tenant.
- Pesos y fórmulas configurables por cliente.
- Dashboards KPI con branding y taxonomía custom.
- Aislamiento total de mediciones por `tenant_id`.

Estado actual:
- [x] Multi-tenant KPI operativo (catálogo, mediciones y scorecard aislados por tenant).
- [x] Base funcional KPI MC single-tenant disponible.
