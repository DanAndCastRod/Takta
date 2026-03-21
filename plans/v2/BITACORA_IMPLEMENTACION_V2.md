# Bitácora de Implementación V2

## 2026-03-04 — Sprint V2-S01 (inicio + hardening)

### Backend

- Implementados endpoints de integración contextual:
  - `GET /api/integration/context/options`
  - `GET /api/integration/context/summary`
- Guard canónico de integridad referencial (`asset_id`, `product_reference_id`, `process_standard_id`).
- Refuerzo en módulos `integration`, `quality`, `meetings` y validaciones Kanban.

### Frontend

- Servicios de contexto global y navegación contextual.
- Integración de contexto en Navbar, Sidebar y módulos principales.

### Validación

- Pruebas backend de integración: OK.
- Build frontend: OK.

---

## 2026-03-04 — Sprint V2-S02 (navegación contextual)

### Frontend

- `RouteContextBar` (breadcrumbs + volver + chips de contexto).
- Canonicalización de URL/query para claves canónicas.
- Hardening documental (`DocumentsPage`, `DocumentEditorPage`).
- Mejoras responsive del sidebar en móvil.

### Validación

- Build frontend: OK.
- QA técnico parcial documentado.

---

## 2026-03-05 — Sprint V2-S06.1 (KPI MC)

### Backend

- Implementado módulo KPI MC en `api/ci.py`:
  - Catálogo semilla editable.
  - Medición mensual (`YYYY-MM`) con upsert.
  - Scorecard ponderado (individual + KPI).
  - Semaforización por cumplimiento.
- Nuevos modelos:
  - `ContinuousImprovementKpiDefinition`
  - `ContinuousImprovementKpiMeasurement`

### Frontend

- Nueva pestaña `KPI MC` en `#/excellence`.
- Captura de meta/actual/cumplimiento por KPI.
- Resumen por categoría + scorecard total.
- Edición de pesos KPI pendientes.
- Dashboard conectado al scorecard KPI MC.

### Testing

- `python -m pytest -q backend/tests` -> **90 passed**.
- `npm test -- --maxWorkers=1` -> **5 passed**.
- `npm run build` -> **OK**.

### Pendientes

- Cerrar pesos KPI faltantes con negocio.
- Conectar acciones KPI al workflow avanzado de cierre/aprobación/verificación.
- Exponer tendencia intermensual KPI MC en `Actas IP`.

---

## 2026-03-05 — Continuación (automatización + meetings)

### Backend

- Se implementó automatización de acciones KPI:
  - Si `compliance_pct < 80`, crea/reabre acción `source_document=KPI_MC:{period}:{code}`.
  - Si `compliance_pct >= 95`, la acción KPI ahora avanza automáticamente a `Verified` mediante workflow.
- Se integró resumen KPI MC en `GET /api/meetings/dashboard`:
  - `kpi_mc_period`
  - `kpi_mc_completion_rate_pct`
  - `kpi_mc_weighted_kpi_result_pct`
  - `kpi_mc_red_items`

### Frontend

- `MeetingsPage` ahora muestra tarjetas KPI MC en dashboard de actas.
- Se agregó botón `Ver KPI MC` para abrir `#/excellence?tab=kpi-mc` con contexto.

### Testing

- Nuevas pruebas:
  - `test_mc_kpi_critical_deviation_creates_and_verifies_action_workflow`
  - `test_meeting_dashboard_includes_kpi_mc_summary`

---

## 2026-03-05 — Continuación (tendencia KPI MC + comparación intermensual)

### Backend

- Nuevo endpoint de tendencia mensual KPI MC:
  - `GET /api/ci/kpis/mc/trend?months=6&end_period=YYYY-MM`
- Refactor de scorecard para reutilizar cálculo por período.
- Extensión de `GET /api/meetings/dashboard` con:
  - `kpi_mc_previous_period`
  - `kpi_mc_previous_weighted_kpi_result_pct`
  - `kpi_mc_weighted_kpi_result_delta_pct`
  - `kpi_mc_completion_rate_delta_pct`
  - `kpi_mc_red_items_delta`

### Frontend

- `Excellence > KPI MC` ahora incluye tablero ejecutivo de tendencia mensual con selector 3/6/9/12 meses.
- `Meetings` ahora muestra tarjetas de delta intermensual KPI MC.

### Testing

- `python -m pytest -q backend/tests/test_excellence.py backend/tests/test_meetings.py` -> **19 passed**.
- `python -m pytest -q backend/tests` -> **93 passed**.
- `npm test -- --maxWorkers=1` -> **5 passed**.
- `npm run build` -> **OK**.

---

## 2026-03-05 — Continuación (workflow automático KPI MC)

### Backend

- Integrado `ActionWorkflow` en automatización KPI de `api/ci.py`:
  - desvío crítico (<80%): acción y workflow en `Open`.
  - recuperación (>=95%): transición automática a `Verified` con trazabilidad de actor `system-kpi`.
  - recidiva en rojo: reapertura automática de acción y workflow.

### Testing

- `python -m pytest -q backend/tests/test_excellence.py::test_mc_kpi_critical_deviation_creates_and_verifies_action_workflow` -> **1 passed**.
- `python -m pytest -q backend/tests/test_excellence.py backend/tests/test_meetings.py` -> **19 passed**.
- `python -m pytest -q backend/tests` -> **93 passed**.

---

## 2026-03-05 — Continuación (trazabilidad KPI -> acción -> workflow en UI)

### Backend

- Extensión de `GET /api/ci/actions` con filtros:
  - `source_document` (match exacto)
  - `source_prefix` (match por prefijo)
- Soporte para obtener acciones automáticas KPI por período.

### Frontend

- En `Excellence > KPI MC`, cada KPI muestra:
  - estado de acción asociada,
  - estado de workflow asociado,
  - fuente `KPI_MC:{period}:{code}`.
- Nuevo botón `Ver en Action Tracker` desde cada fila KPI.
- Salto automático al tab `Action Tracker` con foco y scroll a la acción vinculada.

### Testing

- `python -m pytest -q backend/tests/test_excellence.py::test_ci_actions_filter_by_source_prefix` -> **1 passed**.
- `python -m pytest -q backend/tests/test_excellence.py backend/tests/test_meetings.py` -> **20 passed**.
- `npm test -- --maxWorkers=1` -> **5 passed**.
- `npm run build` -> **OK**.

---

## 2026-03-06 — Continuación (cierre pesos KPI + alertas dashboard + workflow inline)

### Backend

- Cierre de pesos KPI MC pendientes con matriz oficial MC 2026:
  - actualización de seed oficial para pesos 100% definidos,
  - normalización automática opcional en catálogo/scorecard/tendencia,
  - nuevo endpoint `POST /api/ci/kpis/mc/catalog/close-pending-weights`.
- Extensión de tendencia KPI MC (`/api/ci/kpis/mc/trend`) con `trend_alert` (nivel, mensaje y acción sugerida).
- Extensión de `GET /api/meetings/dashboard` con alerta ejecutiva KPI MC:
  - `kpi_mc_target_pct`
  - `kpi_mc_gap_to_target_pct`
  - `kpi_mc_trend_alert_level`
  - `kpi_mc_trend_alert_message`
  - `kpi_mc_trend_recommended_action`

### Frontend

- `Excellence > KPI MC`:
  - botón `Cerrar pesos pendientes`,
  - bloque visual de alerta de tendencia,
  - acciones inline de workflow (`Solicitar`, `Aprobar`, `Verificar`) por KPI con traza activa.
- `Meetings`:
  - banner de alerta KPI MC en dashboard,
  - tarjetas adicionales de `Meta KPI MC` y `Brecha a meta`.

### Testing

- `python -m pytest -q backend/tests/test_excellence.py backend/tests/test_meetings.py` -> **21 passed**.
- `python -m pytest -q backend/tests` -> **95 passed**.
- `npm test -- --maxWorkers=1` -> **5 passed**.
- `npm run build` -> **OK**.

---

## 2026-03-06 — Continuación (SPC S04 + base S05 capacidad)

### Backend

- Implementado bloque SPC sobre muestreo de peso en `api/quality.py`:
  - `GET /api/quality/weight-specs/{id}/spc/chart`
  - `GET /api/quality/weight-specs/{id}/spc/capability`
  - `GET /api/quality/weight-specs/{id}/spc/export/csv`
- Cálculo I-MR (center line, sigma within, LCL/UCL) con ventana configurable.
- Detección de reglas Western Electric:
  - WE1 (1 punto fuera de 3 sigma),
  - WE2 (2 de 3 sobre 2 sigma),
  - WE3 (4 de 5 sobre 1 sigma),
  - WE4 (8 del mismo lado de la media).
- Cálculo de capacidad de proceso:
  - `Cp/Cpk/Pp/Ppk` + clasificación de capacidad.

### Frontend

- `WeightSamplingPage` extendida con:
  - panel SPC (carta I-MR en SVG),
  - alertas de reglas activas,
  - tarjetas de capacidad (`Cp/Cpk/Pp/Ppk`),
  - exportación `SPC CSV` por especificación.
- Limpieza de textos mojibake en el módulo para mantener codificación UTF-8.

### Testing

- `python -m pytest -q backend/tests/test_quality.py` -> **7 passed**.
- `python -m pytest -q backend/tests` -> **99 passed**.
- `npm test -- --maxWorkers=1` -> **5 passed**.
- `npm run build` -> **OK**.

---

## 2026-03-06 — Continuación (S06 base: No Conformidades + CAPA)

### Backend

- Nuevas entidades de dominio:
  - `NonConformity`
  - `CapaAction`
- API NC/CAPA implementada en `api/quality.py`:
  - CRUD de no conformidades,
  - creación de NC desde alerta SPC (`from-spc`),
  - CRUD de acciones CAPA,
  - dashboard de backlog CAPA.
- Integración con Action Tracker:
  - CAPA puede crear `ImprovementAction` vinculada automáticamente,
  - sincronización de estado CAPA <-> acción CI.

### Frontend

- `WeightSamplingPage` extendida con bloque de seguimiento NC/CAPA:
  - creación rápida de NC desde SPC,
  - listado de NC por especificación,
  - transición rápida a `In Progress` / `Closed`.

### Testing

- Nuevas pruebas de calidad:
  - `test_create_non_conformity_from_spc`
  - `test_non_conformity_and_capa_flow`
- `python -m pytest -q backend/tests/test_quality.py` -> **9 passed**.
- `python -m pytest -q backend/tests` -> **99 passed**.
- `npm run build` -> **OK**.

---

## 2026-03-06 — Continuación (S05/S06 completo + integración Meetings)

### Backend

- `Quality`:
  - nueva entidad `WeightCapabilityRun` para histórico de capacidad,
  - corridas on-demand y batch:
    - `POST /api/quality/weight-specs/{id}/spc/capability/runs`
    - `POST /api/quality/spc/capability/runs/batch`
  - historial y tendencia:
    - `GET /api/quality/weight-specs/{id}/spc/capability/runs`
    - `GET /api/quality/weight-specs/{id}/spc/capability/trend`
  - auto-integración con `Action Tracker` para procesos `marginal/not_capable`.
- `NC/CAPA`:
  - disparo automático de NC desde evento de muestreo,
  - endpoint masivo `POST /api/quality/non-conformities/auto-generate`,
  - workflow formal multi-rol (`Open -> In Progress -> Close Requested -> Approved -> Verified`, con `Rejected`),
  - metadata de workflow (`close_requested_*`, `approved_*`, `verified_*`, `rejected_*`).
- `Meetings`:
  - `GET /api/meetings/quality/issues` (backlog abierto NC/CAPA),
  - `POST /api/meetings/records/{id}/sync-quality-commitments`,
  - `GET /api/meetings/dashboard` ampliado con métricas NC/CAPA.

### Frontend

- `WeightSamplingPage`:
  - ejecución de corridas de capacidad (on-demand/batch),
  - visualización de tendencia mensual (`Cp/Cpk`),
  - acciones S06 ampliadas (`Auto NC`, workflow NC, salto a `Actas`).
- `MeetingsPage`:
  - tarjetas de calidad en dashboard (`NC abiertas/críticas`, `CAPA abiertas/vencidas`),
  - panel de issues NC/CAPA abiertas,
  - botón `Sincronizar NC/CAPA` a compromisos del acta.

### Testing

- Nuevas pruebas backend:
  - `test_weight_spc_capability_math_consistency`
  - `test_auto_non_conformity_trigger_on_sample_event`
  - `test_capability_runs_batch_trend_and_ci_integration`
  - `test_capa_workflow_multirole_restrictions`
  - `test_meeting_quality_issues_and_sync_commitments`
- `python -m pytest -q backend/tests/test_quality.py backend/tests/test_meetings.py` -> **21 passed**.
- `python -m pytest -q backend/tests` -> **104 passed**.
- `npm test -- --maxWorkers=1` -> **5 passed**.
- `npm run build` -> **OK**.

---

## 2026-03-06 — Ajuste UX S6 (CAPA CRUD en Muestreo)

### Frontend

- `WeightSamplingPage`:
  - selección explícita de NC activa en panel S6,
  - subpanel `Acciones CAPA` con CRUD completo:
    - crear/editar,
    - transiciones de estado (`In Progress`, `Close Requested`, `Approved`, `Verified`),
    - eliminar acción,
  - limpieza de selección/edición al cambiar contexto de especificación o NC.

### QA/Docs

- Guía manual extendida con caso `TC-CAPA-06` (CRUD CAPA end-to-end desde UI).

### Validación

- `npm run build` -> **OK**.
- `npm test -- --maxWorkers=1` -> **5 passed**.

---

## 2026-03-06 — Fase 3 (UX/UI shell + accesibilidad + UTF-8)

### Frontend

- `style.css`:
  - incorporación de tokens globales de interfaz (`surface`, `border`, `text`, `focus-ring`, radios/sombras),
  - incorporación de librería base de componentes (`tk-card`, `tk-input`, `tk-select`, `tk-textarea`, `tk-btn-secondary`, `tk-btn-danger`, `tk-feedback-*`, `tk-empty-state`, `tk-badge`),
  - mejora de foco visible global para navegación por teclado.
- `Navbar`:
  - normalización completa de textos/labels a UTF-8,
  - modal de contexto con `role="dialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`,
  - cierre por `Escape` y trampa de foco en modal,
  - corrección de logout a hash routing `#/login`.
- `Sidebar`:
  - normalización completa de textos/labels a UTF-8,
  - cierre por `Escape`,
  - trampa de foco para sidebar móvil,
  - sincronización de estado abierto/cerrado para `aria-expanded` del botón de navbar.
- `main.js`:
  - corrección de redirecciones de login a `#/login` para consistencia de router hash.

### Validación

- verificación de caracteres corruptos de codificación en shell principal: **sin hallazgos**.
- `npm run build` -> **OK**.
- `npm test -- --maxWorkers=1` -> **5 passed**.

---

## 2026-03-06 — Fase 3 (S07 journeys + feedback unificado + vacíos guiados)

### Frontend

- Nuevo servicio `ui-feedback.service`:
  - notificaciones tipo toast para éxito/error/aviso,
  - instalación global en `main.js`,
  - bridge de `alert()` hacia feedback no bloqueante.
- `DocumentsPage`:
  - estados vacíos guiados con CTA (`Nuevo documento`, `Limpiar filtros`),
  - alineación de controles a componentes base (`tk-input/select`, `tk-btn-secondary`, `tk-btn-danger`),
  - feedback de errores y eliminación con toast.
- `MeetingsPage`:
  - estado vacío guiado para primera acta,
  - alineación de formularios/botones a componentes base,
  - feedback centralizado con helper `setNotice` + toast.
- `DashboardPage`:
  - sección `Journeys sugeridos por rol` con 10 flujos críticos y acceso directo.
- `Navbar`:
  - badge de conectividad `Online/Offline` visible en shell.
- `main.js`:
  - ajuste final de redirección autenticada `#/login -> #/`.

### Documentación V2

- Nuevo archivo `JOURNEYS_S07_POR_ROL.md` con 10 journeys por perfil.
- Actualización de `FASE_3_FLUJO_USUARIO_Y_UX_UI.md`:
  - S07 marcado como implementado en definición, acciones rápidas y estados vacíos.
  - S09 con estado de conectividad visible como base implementada.
- Actualización de `PLAN_MAESTRO_V2.md` a versión `1.11`.

### Validación

- `python -m pytest -q backend/tests` -> **104 passed**.
- `npm test -- --maxWorkers=1` -> **5 passed**.
- `npm run build` -> **OK**.

---

## 2026-03-06 — Fase 3 (S08 continuidad: Activos + Capacidad + Cronómetro + CSS legacy)

### Frontend

- `CapacityPage`:
  - estado vacío guiado cuando no existen activos,
  - migración de controles a `tk-input`/`tk-select`,
  - feedback contextual con `ui-feedback` (warnings/errors/success).
- `TimingPage`:
  - ajuste de textos UTF-8 visibles (`Cronómetro`, `Estándar`),
  - estado vacío guiado para crear primer estudio,
  - migración parcial de controles a `tk-*`,
  - feedback unificado para validaciones y eliminación.
- `AssetsPage`:
  - normalización de formulario modal CRUD con `tk-input/select/textarea`,
  - feedback unificado de guardado de activo.
- `style.css`:
  - harmonización visual de botones/formularios legacy (`border-slate-200` / `border-red-200`) para módulos aún no migrados completamente.

### Validación

- `npm run build` -> **OK**.
- `npm test -- --maxWorkers=1` -> **5 passed**.

---

## 2026-03-06 — Fase 3 (S08 cierre técnico: Ingeniería + Ejecución + Excelencia)

### Frontend

- `EngineeringPage`:
  - limpieza de textos corruptos de codificación,
  - reemplazo de `alert(...)` por `uiFeedback` (`warning/error/success`),
  - saneamiento de placeholders y separadores dañados.
- `ExecutionPage`:
  - reemplazo de `alert(...)` por `uiFeedback` en errores operativos (logs, paros, staff, planes, reglas, catálogo),
  - normalización de texto de ayuda en carga masiva.
- `ExcellencePage`:
  - reemplazo de validación por `uiFeedback`,
  - limpieza de texto base de checklist 5S con UTF-8 correcto.

### Validación

- `npm run build` -> **OK**.
- `npm test -- --maxWorkers=1` -> **5 passed**.
- escaneo de codificación (patrones de mojibake) en módulos intervenidos -> **sin hallazgos**.

---

## 2026-03-06 — Fase 3 (S08 hardening final: Settings + Weight Sampling + limpieza global alert)

### Frontend

- Eliminación completa de `alert(...)` en páginas del front:
  - migración a `uiFeedback` en `Settings`, `Weight Sampling`, `Engineering`, `Execution`, `Excellence`, `Assets`, `Capacity`, `Timing`.
- `SettingsPage`:
  - ingestión de plantillas y limpieza de token con feedback toast.
- `WeightSamplingPage`:
  - validaciones de formularios clave (spec, muestra, CAPA) con `uiFeedback.warning`.

### Validación

- `npm run build` -> **OK**.
- `npm test -- --maxWorkers=1` -> **5 passed**.
- verificación de codificación UTF-8 en módulos intervenidos -> **sin caracteres corruptos**.

---

## 2026-03-06 — Fase 5 (S13 inicio: trazabilidad cruzada en Diagram Studio)

### Frontend

- `PlantEditorPage` restaurada y conectada al router (`#/plant-editor`) con render estable.
- Nuevo panel superior de trazabilidad en Diagram Studio:
  - KPI MC ponderado/cobertura/ítems rojos,
  - acciones abiertas y vencidas,
  - no conformidades abiertas/críticas,
  - CAPA abiertas/vencidas,
  - actas y compromisos abiertos.
- Selector de activo integrado con `module-context` para sincronizar contexto entre módulos.
- Enlaces contextuales rápidos desde Diagram Studio a:
  - `#/excellence?tab=kpi-mc`,
  - `#/weight-sampling`,
  - `#/meetings`.
- Escucha de `context:changed` para mantener sincronía de activo sin recargar la vista.

### Validación

- `npm run build` -> **OK**.
- `npm test -- --maxWorkers=1` -> **5 passed**.
- verificación UTF-8 en archivos intervenidos -> **sin caracteres corruptos**.

---

## 2026-03-06 — Fase 5/6 (S13 + S16/S17: overlay semaforizado + señales SPC/CAPA en simulación)

### Frontend

- `PlantEditor`:
  - nuevo botón `Señales` (`ON/OFF`) en toolbar.
  - polling periódico (`15s`) de señales operativas por activo usando:
    - `GET /api/meetings/quality/issues`,
    - `GET /api/quality/weight-specs`,
    - `GET /api/ci/actions`.
  - cálculo de presión operativa por activo (SPC + NC/CAPA + acciones abiertas/vencidas).
  - overlay semaforizado por nodo/zona sobre canvas (`V/A/R`, `NC`, `CAPA`).
  - nota en panel de flujo sobre estado de señales y timestamp de actualización.
- Simulación de flujo:
  - conectores ahora incorporan `fromAssetId/toAssetId` (vivo o inferido por proximidad en JSON cargado),
  - capacidad efectiva del conector ajustada por factor de señal SPC/CAPA,
  - densidad global reporta operación `con señales` cuando aplica.
- `ArrowConnector`:
  - persistencia inicial de `flowData.fromAssetId/toAssetId` al crear flechas.

### Validación

- `npm run build` -> **OK**.
- `npm test -- --maxWorkers=1` -> **5 passed**.
- verificación UTF-8 en componentes intervenidos -> **sin caracteres corruptos**.

---

## 2026-03-06 — QA técnico DS/SIM + hardening de montaje PlantEditor

### Frontend

- `PlantEditorPage`:
  - hardening de inicialización del editor para evitar pantalla vacía cuando `requestAnimationFrame` es throttled:
    - espera activa de `#plant-editor-root` en DOM,
    - render al montar + refuerzo en `requestAnimationFrame`.

### Validación ejecutada

- Smoke runtime en navegador headless (Playwright ad-hoc):
  - login,
  - navegación a `#/plant-editor`,
  - carga de panel de trazabilidad,
  - activación/desactivación de señales,
  - carga de caso de ejemplo y arranque de simulación de flujo.
- Build/test regresión:
  - `npm run build` -> **OK**.
  - `npm test -- --maxWorkers=1` -> **5 passed**.
  - `python -m pytest -q backend/tests/test_quality.py backend/tests/test_meetings.py backend/tests/test_excellence.py` -> **35 passed**.

---

## 2026-03-06 — Cierre integral V2 (S03/S09/S10-S18)

### Diagram Studio / Simulación (frontend)

- `PlantEditor` integrado con `platform.service`:
  - catálogo de librerías por dominio con búsqueda, favoritos y guías,
  - inserción directa de elementos/plantillas al canvas,
  - panel de simulación avanzada (escenarios, runs, comparación, sync de acciones, export ejecutivo y decisiones),
  - persistencia de árbol de capas (`layer_tree`) y estado UI.
- `LayerManager` refactorizado a árbol jerárquico:
  - crear/mover/anidar/clonar/bloquear/eliminar capas,
  - consistencia de z-index y visibilidad/bloqueo en cascada.
- `PropertiesPanel` migrado a esquema dinámico:
  - carga de `property-schemas` por tipo de elemento,
  - validaciones/defaults por campo,
  - trazabilidad de cambios (`diagram/change-log`).

### Plataforma / Observabilidad / UX

- `SettingsPage` extendido con observabilidad S03:
  - catálogo de eventos por módulo,
  - listado de eventos estructurados recientes,
  - creación de evento de prueba para validación operativa.
- Consolidación de operación offline (cola/sync/conflictos) con controles en `Settings`.

### Validación técnica final

- `python -m pytest -q backend/tests` -> **109 passed**.
- `npm --prefix frontend test -- --maxWorkers=1` -> **5 passed**.
- `npm --prefix frontend run build` -> **OK**.

---

## 2026-03-07 - Hardening de estabilidad de QA automatizada

### Mejoras aplicadas

- `frontend/package.json`:
  - ajuste de script de pruebas a `vitest run --pool=forks --maxWorkers=1` para evitar timeouts de workers en Windows.
- `backend/tests/conftest.py`:
  - insercion explicita del `repo root` en `sys.path` para ejecutar `pytest` tanto desde la raiz como desde `backend/`.
- `backend/app/models.py` + `backend/app/api/platform.py`:
  - eliminacion de warnings por shadowing en Pydantic/SQLModel:
    - `DiagramPropertySchema.schema_payload_json` (manteniendo columna DB `schema_json`),
    - `PropertySchemaUpsert.schema_definition` con alias API `schema` (compatibilidad de contrato).
- `backend/tests/*`:
  - migracion de `session.query(...)` a `session.exec(select(...))` en pruebas de documentos, templates y plataforma.

### Validacion

- `npm --prefix frontend test` -> **5 passed**.
- `npm --prefix frontend run build` -> **OK**.
- `pytest -q backend/tests` -> **109 passed**.
- `pytest -q` ejecutado desde `backend/` -> **109 passed**.
- warnings de pruebas backend reducidos de **12** a **2** (solo deprecaciones externas de FastAPI).

---

## 2026-03-07 - Optimización de bundle + hardening PWA (siguiente elemento)

### Frontend

- `main.js`:
  - migración de rutas a lazy-loading (import dinámico por módulo/página),
  - precarga ligera post-login de rutas frecuentes,
  - registro robusto de service worker con:
    - detección de update (`pwa:update-available`),
    - aplicación controlada (`pwa:apply-update`),
    - `controllerchange` para recarga segura.
- `router.js`:
  - estado visual de carga mientras se importa un módulo de ruta asíncrona.
- `vite.config.js`:
  - chunking manual por dependencias (`vendor` + `fabric`) y ajuste de umbral de warning.
- `public/sw.js`:
  - soporte de mensaje `SKIP_WAITING` para aplicar actualización sin esperar ciclo completo.
- `SettingsPage.js`:
  - controles operativos PWA en UI:
    - `Buscar actualización PWA`,
    - `Aplicar actualización`,
    - estado actual de registro/update/modo standalone-browser.

### Resultado técnico

- Antes: bundle principal ~`915 kB` (warning de chunk grande).
- Después: carga dividida en chunks por página + `vendor`/`fabric`:
  - `index` ~`63.75 kB`,
  - `fabric` ~`294.12 kB`,
  - páginas en chunks independientes.

### Validación

- `npm --prefix frontend run build` -> **OK**.
- `npm --prefix frontend test` -> **5 passed**.
- Nota QA responsive visual en dispositivo real: pendiente de evidencia física (iOS/Android), sin bloqueo técnico en build/tests.

---

## 2026-03-07 - Automatización E2E frontend (responsive + PWA)

### Implementación

- Integración de Playwright en `frontend`:
  - `playwright.config.js` con `webServer` sobre Vite (`4173`),
  - scripts npm: `test:e2e`, `test:e2e:headed`, `test:e2e:install`.
- Suite smoke E2E agregada:
  - `e2e/smoke-responsive-pwa.spec.js`.
- Cobertura incluida en smoke:
  - sidebar mobile (`toggle`, `Escape`, overlay, sin scroll horizontal),
  - `Settings` con controles PWA y estabilidad layout desktop.
- Mock de API en E2E para validar UX shell sin dependencia de backend real.
- Ajuste de `vite.config.js` en `test.exclude` para separar Vitest unitario de specs E2E.
- Documentación de ejecución E2E:
  - `frontend/e2e/README.md`.

### Validación

- `npm run test` -> **5 passed**.
- `npm run test:e2e` -> **2 passed**.
- `npm run build` -> **OK**.

---

## 2026-03-09 - E2E integrado por rol/tenant (backend real)

### Frontend

- Nueva configuración Playwright para integración real:
  - `frontend/playwright.real.config.js`
  - backend webServer: `uvicorn` en `127.0.0.1:9003`
  - frontend webServer: Vite en `127.0.0.1:4175` con `VITE_API_URL=http://127.0.0.1:9003/api`
- Nueva suite E2E real:
  - `frontend/e2e-real/auth-navigation-roles.spec.js`
  - cobertura por roles seed (`admin`, `ingeniero`, `supervisor`)
  - validación de rutas clave por rol y estado `Settings/PWA`.
- Scripts npm agregados:
  - `test:e2e:real`
  - `test:e2e:real:headed`
- Hardening de proxy Vite para entornos Windows:
  - `frontend/vite.config.js` actualizado a `http://127.0.0.1:9003` (evita `ECONNREFUSED` por `localhost`/IPv6).

### Documentación V2

- Nueva matriz QA por rol/tenant:
  - `plans/v2/MATRIZ_QA_ROLES_TENANT_V2.md`.
- `frontend/e2e/README.md` actualizado con ejecución `mock` vs `real`.

### Validación

- `npm --prefix frontend run test:e2e` -> **2 passed**.
- `npm --prefix frontend run test:e2e:real` -> **4 passed**.

---

## 2026-03-09 - Preparación de despliegue URiT/EC&F y migración Grupo Bios

### Entregables técnicos

- Pipeline Azure DevOps base creado en `example.pipeline.yml` para:
  - backend en `C:\Analitica\python\API_takta` via PM2 (`takta-api`, puerto `8105`),
  - frontend en `C:\Users\iot.td\.node-red\public\Takta`.
- Guía operativa de despliegue y migración:
  - `plans/v2/GUIA_DESPLIEGUE_URIT_ECF_Y_MIGRACION_BIOS.md`.
- Plantilla de túnel Cloudflare para backend:
  - `backend/cloudflared.config.example.yml`.
- Frontend ajustado a paleta URiT (cian) y tipografía corporativa:
  - `frontend/src/style.css`,
  - `frontend/index.html`.
- CORS backend parametrizable por entorno:
  - `CORS_ORIGINS` en `backend/app/main.py`.

### Validación técnica

- `npm --prefix frontend run build` -> **OK**.
- `npm --prefix frontend test` -> **5 passed**.
- `npm --prefix frontend run test:e2e` -> **2 passed**.
- `npm --prefix frontend run test:e2e:real` -> **4 passed**.

### Notas de hardening

- Normalización UTF-8 en documentación de `plans/v2` para eliminar mojibake residual.
- Guía de despliegue ampliada con criterios de costo cero y ruta recomendada `Pages + Tunnel + PM2`.

---

## 2026-03-09 - Ajuste de arquitectura dual (URiT/EC&F externo + Grupo Bios interno)

### Entregables técnicos

- Guía de despliegue actualizada a esquema dual real:
  - externo: `takta.urit.services` + `back.takta.ejecomercial.co` (cPanel Python App),
  - interno: IIS `biosapps.grupobios.co/api_takta/` + PM2 local `8105`.
- Nuevo anexo IIS con regla de reverse proxy:
  - `plans/v2/ANEXO_IIS_PROXY_BIOSAPPS_API_TAKTA.md`.
- Variables por entorno separadas:
  - `frontend/.env.production.urit.example`,
  - `frontend/.env.production.bios.example`,
  - `backend/.env.production.urit.example`,
  - `backend/.env.production.bios.example`.
- Soporte cPanel para FastAPI:
  - `backend/passenger_wsgi.py`,
  - dependencia `a2wsgi` en `backend/requirements.txt`.
- Pipeline privado fortalecido con separación de DB interna:
  - `example.pipeline.yml` ahora define `SQLITE_PATH` y `CORS_ORIGINS` de Bios.

---

## 2026-03-09 - Canal público GitHub Actions + Sidebar iconografía + seed masivo

### Entregables técnicos

- Workflow de referencia corregido para despliegue público URiT/EC&F:
  - `example.workflow.EC&F.yml`
  - build frontend + deploy SSH frontend/backend + restart Passenger.
- Guía V2 actualizada con sección de workflow público y secrets requeridos:
  - `plans/v2/GUIA_DESPLIEGUE_URIT_ECF_Y_MIGRACION_BIOS.md`.
- Sidebar actualizado con iconografía más clara por módulo y estado activo consistente:
  - `frontend/src/components/layout/Sidebar.js`.
- Seeder masivo multi-módulo agregado:
  - `backend/app/seeds/seed_demo_bulk.py`.
- Soporte cPanel ASGI->WSGI:
  - `backend/passenger_wsgi.py`,
  - `backend/requirements.txt` (`a2wsgi`).

### Ejecución de seed

- Ejecutado: `py -m backend.app.seeds.seed_demo_bulk --scale medium`
- Motor reportado por script: `sqlite:///./takta.db`
- Resultado: se pobló `takta.db` (raíz repo), no `backend/takta.db`.

