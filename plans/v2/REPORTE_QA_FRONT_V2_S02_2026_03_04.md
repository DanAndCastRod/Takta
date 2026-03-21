# Reporte QA Front V2-S02/S06.2 — 2026-03-06

## Alcance ejecutado

- URL canónica y navegación contextual.
- Enlaces cruzados inter-módulo.
- Integración de KPI MC en Excelencia y Dashboard.
- Integración KPI MC en Actas IP (dashboard + navegación a KPI MC + delta intermensual).
- Integración SPC en Muestreo de Peso (carta I-MR, alertas y capacidad).
- Integración S5 en Muestreo de Peso (corridas on-demand/batch + tendencia histórica).
- Integración S6 completa en Muestreo de Peso (auto-NC + workflow NC + CAPA).
- Integración Meetings <-> Calidad (issues abiertos + sincronización a compromisos).
- Build productivo frontend.

## Evidencia técnica

- `npm test -- --maxWorkers=1` -> OK (5/5).
- `npm run build` -> OK.
- Carga de endpoints KPI MC validada desde frontend:
  - catálogo,
  - scorecard,
  - tendencia mensual,
  - upsert de medición,
  - borrado de medición,
  - ajuste de peso KPI pendiente.
- Carga de endpoints SPC/S5 validada desde frontend:
  - `/spc/chart`,
  - `/spc/capability`,
  - `/spc/capability/runs`,
  - `/spc/capability/runs/batch`,
  - `/spc/capability/trend`,
  - `/spc/export/csv`.
- Carga de endpoints NC/CAPA validada desde frontend:
  - `/non-conformities/from-spc/{spec_id}`,
  - `/non-conformities/auto-generate`,
  - `/non-conformities`,
  - `/capa/dashboard`.
- Carga de endpoints Meetings-Calidad validada desde frontend:
  - `/meetings/quality/issues`,
  - `/meetings/records/{id}/sync-quality-commitments`,
  - métricas de calidad en `/meetings/dashboard`.

## Resultado por bloque

- Smoke base: OK técnico.
- URL canónica: OK.
- Breadcrumbs/back-navigation: OK técnico.
- Enlaces cruzados: OK.
- Responsive sidebar: implementado, validación visual final pendiente.
- KPI MC scorecard: OK funcional.
- KPI MC captura/edición: OK funcional.
- KPI MC tendencia mensual: OK técnico.
- KPI MC en Meetings: OK técnico (campos dashboard + botón de navegación + deltas).
- SPC en Muestreo de Peso: OK técnico.
- S5 Capacidad (corridas + tendencia): OK técnico.
- S6 NC/CAPA (auto + workflow): OK técnico.
- Meetings <-> Calidad: OK técnico.

## Riesgos abiertos

1. Validación visual final de responsive sidebar en dispositivos reales (iOS/Android) pendiente de evidencia.
2. Cobertura de pruebas automáticas frontend aún limitada a capa de servicios (sin pruebas de interacción UI compleja).

## Recomendación de cierre

Ejecutar la guía manual actualizada:
- [GUIA_QA_MANUAL_FRONT_V2_S02.md](GUIA_QA_MANUAL_FRONT_V2_S02.md)

y anexar evidencia visual (capturas o video corto) para cerrar formalmente el sprint.

---

## Addendum 2026-03-07 — Rendimiento y PWA

### Alcance adicional

- Lazy-loading de rutas en shell principal.
- Code-splitting manual (`vendor` + `fabric`) para disminuir payload inicial.
- Hardening de update PWA (detectar, revisar y aplicar desde Settings).

### Evidencia técnica adicional

- `npm --prefix frontend run build` -> OK.
- `npm --prefix frontend test` -> OK (5/5).
- Build con chunks separados por módulo/página:
  - `index` ~63.75 kB,
  - `fabric` ~294.12 kB,
  - resto distribuido por vistas.

### Estado actualizado

- Responsive sidebar: implementado y estable a nivel técnico (sin regresiones de build/test).
- PWA/offline: se agrega gestión explícita de actualización en runtime (`Settings`).

### Riesgo residual

1. Evidencia visual final en dispositivos reales (iOS/Android) sigue pendiente para cierre formal de UX responsive en campo.

## Addendum 2026-03-07 — E2E formal (Playwright)

### Nuevas evidencias

- Suite E2E smoke integrada en repo:
  - `frontend/e2e/smoke-responsive-pwa.spec.js`.
- Resultado ejecución:
  - `npm run test:e2e` -> **2 passed**.

### Cobertura validada

- Sidebar responsive mobile:
  - apertura/cierre por toggle,
  - cierre por `Escape`,
  - cierre por overlay,
  - sin scroll horizontal espurio.
- Settings/PWA:
  - visibilidad de controles de actualización,
  - estabilidad de layout desktop.

### Estado

- Riesgo de ausencia de automatización UI compleja mitigado parcialmente con smoke E2E reproducible.

## Addendum 2026-03-09 — E2E integrado por rol/tenant (backend real)

### Nuevas evidencias

- Suite real incorporada:
  - `frontend/e2e-real/auth-navigation-roles.spec.js`.
- Config dedicada:
  - `frontend/playwright.real.config.js`.
- Resultado ejecución:
  - `npm --prefix frontend run test:e2e:real` -> **4 passed**.

### Cobertura validada

- Sesión real por API contra backend (`/api/auth/login`) para:
  - `admin`, `ingeniero`, `supervisor`.
- Navegación por rol a rutas críticas:
  - admin: `assets`, `settings`,
  - ingeniero: `engineering`, `meetings`,
  - supervisor: `execution`, `weight-sampling`.
- Verificación operativa de `Settings/PWA` y presencia de tenant runtime.

### Ajuste técnico asociado

- `vite.config.js` actualiza proxy backend a `http://127.0.0.1:9003` para evitar `ECONNREFUSED` intermitente en Windows con `localhost`.
