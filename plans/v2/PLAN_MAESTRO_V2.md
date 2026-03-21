# Plan Maestro de Implementación — Takta V2

> Version: 1.20
> Fecha: 2026-03-09
> Estado: Implementación V2 completada (Fases 1-6 cerradas)

## 1. Objetivo de V2

Escalar Takta desde V1 a un ecosistema integrado para operación, ingeniería y excelencia, con:

- Integraciones reales entre módulos y contexto canónico compartido.
- Gestión de KPI estratégicos con scorecards ponderados.
- Flujo UX/UI responsive y PWA robusta.
- Capacidades white label sin forks.
- Diagram Studio avanzado y simulación de flujo con analítica.

---

## 2. Matriz KPI MC Oficial (2026)

Esta matriz se toma como referencia obligatoria para el área de Mejoramiento Continuo.

| Eje | Línea de acción | Iniciativa / KPI | % Participación Individual | % Participación KPI | Estado de mapeo |
|---|---|---|---:|---:|---|
| Generación de Valor al Cliente e Impacto Positivo | Cumplimiento actividades MC por planta - estandarización | Operarios especialistas | 10 | 10 | Mapeado |
| Generación de Valor al Cliente e Impacto Positivo | Cumplimiento actividades MC por planta - estandarización | Inventarios túneles | 5 | 5 | Mapeado |
| Generación de Valor al Cliente e Impacto Positivo | Plan desarrollo Lean por planta | Capacitación 5S y Standard Work | 5 | 5 | Mapeado |
| Generación de Valor al Cliente e Impacto Positivo | Plan desarrollo equipo MC | Plan de formación consolidada equipo MC | 5 | 5 | Mapeado |
| Meta Corporativa SST | Meta corporativa SST | Cumplimiento SST | 10 | 10 | Mapeado |
| Planeación Integral | Estandarización Lean - Valor Agregado | Implementación 5S en VA | 20 | 20 | Mapeado |
| Planeación Integral | Estandarización Lean - Valor Agregado | Estructuración metodología Standard Work | 10 | 10 | Mapeado |
| Excelencia Operacional | Cumplimiento de la merma consolidada | Merma consolidada | 5 | 5 | Mapeado |
| Excelencia Operacional | Proyectos reducción sobrepeso (Filetes/D1/VA) | Plan control de peso referencias críticas | 10 | 10 | Mapeado |
| Excelencia Operacional | Mapeo productivo y merma - rendimiento filetes | Medición variables de proceso | 10 | 10 | Mapeado |
| Eficiencia Financiera | Cumplimiento presupuesto financiero | Presupuesto financiero | 5 | 5 | Mapeado |
| Mejora Continua | Estructuración proyectos ROI | Diseño, implementación y seguimiento | 5 | 5 | Mapeado |

Notas:
- El total de participación individual mapeada es 100%.
- El total de participación KPI explícita mapeada es 100%.
- Pesos KPI pendientes cerrados y normalizados con matriz oficial MC 2026.

---

## 3. Implementación Ejecutada (2026-03-06)

Se ejecutó implementación integral de KPI MC + S04/S05/S06:

1. Backend
- Nuevo catálogo KPI MC semilla y editable.
- Registro de mediciones por período (`YYYY-MM`).
- Cálculo de scorecard ponderado (individual + KPI).
- Endpoints:
  - `GET /api/ci/kpis/mc/catalog`
  - `POST /api/ci/kpis/mc/catalog/seed`
  - `POST /api/ci/kpis/mc/catalog/close-pending-weights`
  - `PATCH /api/ci/kpis/mc/catalog/{id}`
  - `PUT /api/ci/kpis/mc/measurements`
  - `GET /api/ci/kpis/mc/measurements`
  - `DELETE /api/ci/kpis/mc/measurements/{id}`
  - `GET /api/ci/kpis/mc/scorecard`
  - `GET /api/ci/kpis/mc/trend`
  - `GET /api/meetings/dashboard` (extendido con alerta de tendencia KPI MC)
  - `GET /api/quality/weight-specs/{id}/spc/chart`
  - `GET /api/quality/weight-specs/{id}/spc/capability`
  - `POST /api/quality/weight-specs/{id}/spc/capability/runs`
  - `POST /api/quality/spc/capability/runs/batch`
  - `GET /api/quality/weight-specs/{id}/spc/capability/runs`
  - `GET /api/quality/weight-specs/{id}/spc/capability/trend`
  - `GET /api/quality/weight-specs/{id}/spc/export/csv`
  - `POST /api/quality/non-conformities/from-spc/{id}`
  - `POST /api/quality/non-conformities/auto-generate`
  - `POST|GET|PATCH|DELETE /api/quality/non-conformities`
  - `POST|GET /api/quality/non-conformities/{id}/capa-actions`
  - `PATCH|DELETE /api/quality/capa-actions/{id}`
  - `GET /api/quality/capa/dashboard`
  - `GET /api/meetings/quality/issues`
  - `POST /api/meetings/records/{id}/sync-quality-commitments`
  - `GET /api/meetings/dashboard` (extendido con métricas NC/CAPA)

2. Frontend
- Nueva pestaña `KPI MC` en `#/excellence`.
- Carga de cumplimiento por KPI y período.
- Vista de scorecard por categorías y tabla de captura.
- Ajuste de pesos KPI pendientes desde interfaz.
- Tablero ejecutivo de tendencia mensual KPI MC (3/6/9/12 meses).
- Trazabilidad visual KPI -> Acción -> Workflow en tabla KPI MC.
- Transiciones de workflow inline (`Solicitar`, `Aprobar`, `Verificar`) desde tabla KPI MC.
- Dashboard conectado al scorecard KPI MC.
- Integración de `Actas IP` con navegación directa a `KPI MC` y delta intermensual.
- `Weight Sampling` con panel SPC (carta I-MR, alertas Western Electric y métricas de capacidad).
- `Weight Sampling` con ejecución de corridas de capacidad on-demand/batch e histórico de tendencia.
- `Weight Sampling` con NC/CAPA ampliado (auto-NC, workflow formal y navegación a Actas).
- `Meetings` con panel de calidad abierta y sincronización NC/CAPA a compromisos.
- Shell de navegación (`Navbar`/`Sidebar`) reforzado con accesibilidad base (ARIA + teclado) y normalización UTF-8.
- Design tokens y librería base CSS incorporados para estandarización visual transversal.
- Servicio global de feedback (`toast`) para unificar mensajes en módulos con CRUD.
- `Documentos` y `Actas IP` actualizados con estados vacíos guiados y feedback homogéneo.
- `Dashboard` ampliado con journeys por rol para inicio rápido de flujos end-to-end.
- Indicador de conectividad online/offline visible en shell principal.
- `Capacidad` y `Cronómetro` con migración parcial a componentes base (`tk-*`) y feedback contextual.
- `Activos` con endurecimiento de formulario modal y feedback de guardado consistente.
- Harmonización transversal de estilos CRUD legacy para módulos en transición.
- Migración de `alert(...)` a `uiFeedback` en `Ingeniería`, `Ejecución` y `Excelencia`.
- Normalización UTF-8 en módulos operativos y de mejora (sin mojibake en vistas principales).
- Hardening final: eliminación de `alert(...)` en páginas activas y adopción transversal de feedback no bloqueante.
- `Diagram Studio` restaurado con `PlantEditorPage` + panel de trazabilidad cruzada:
  - scorecard KPI MC, acciones abiertas, NC/CAPA y actas abiertas,
  - selector de activo con contexto canónico compartido,
  - enlaces directos contextualizados a `Excellence`, `Weight Sampling` y `Meetings`.
- `PlantEditor` extendido con señales operativas SPC/CAPA:
  - botón `Señales` con polling periódico de calidad y acciones por activo,
  - overlay semaforizado por nodo/zona (`NC`, `CAPA`, presión),
  - ajuste dinámico de capacidad efectiva de conectores durante simulación de flujo.
- Optimización de rendimiento frontend:
  - lazy-loading por ruta en `main.js` para reducir payload inicial,
  - chunking manual de dependencias (`vendor` + `fabric`) en `vite.config.js`,
  - estado de carga de módulo en router durante import asíncrono.
- Hardening PWA:
  - detección de actualización de service worker y evento `pwa:update-available`,
  - aplicación de update con `pwa:apply-update` + `SKIP_WAITING`,
  - controles UI en `Settings` para revisar/aplicar actualización PWA.

3. Automatización
- Creación automática de acción de mejora cuando un KPI MC cae en rojo (<80%).
- Avance automático de workflow KPI a `Verified` cuando recupera nivel objetivo (>=95%).
- Creación automática de no conformidad SPC desde evento de muestreo (o ejecución masiva).
- Integración de corridas de capacidad con `Action Tracker` para procesos marginales/no capaces.
- Resumen KPI MC incorporado en `GET /api/meetings/dashboard`.
- Comparación intermensual KPI MC en `meetings/dashboard` (período previo + deltas).
- Alerta ejecutiva de tendencia KPI MC (nivel, mensaje y acción recomendada).
- Métricas de backlog NC/CAPA en `meetings/dashboard`.

4. Pruebas
- Backend: 109 tests passing.
- Frontend: 5 tests passing.
- Frontend E2E (Playwright smoke): 2 tests passing.
- Frontend E2E (Playwright real backend): 4 tests passing.
- Build frontend: OK.

---

## 4. Roadmap por Fases

1. [FASE 1: Plataforma e Integración Base](FASE_1_PLATAFORMA_E_INTEGRACION.md)
2. [FASE 2: Calidad Estadística y Nuevos Módulos](FASE_2_CALIDAD_ESTADISTICA_Y_SPC.md)
3. [FASE 3: Flujo de Usuario y UX/UI](FASE_3_FLUJO_USUARIO_Y_UX_UI.md)
4. [FASE 4: White Label y Gobernanza](FASE_4_WHITELABEL_Y_GOBERNANZA.md)
5. [FASE 5: Diagram Studio Avanzado](FASE_5_DIAGRAM_STUDIO_AVANZADO.md)
6. [FASE 6: Simulación de Flujo y Analítica](FASE_6_SIMULACION_Y_ANALITICA.md)

---

## 5. Criterios Globales de Éxito V2

- Trazabilidad cruzada entre Activo, SKU, Estándar, Documento, KPI, Acción y Simulación.
- Scorecard KPI MC operativo con cálculo ponderado confiable.
- UX responsive y flujos inter-módulo con contexto persistente.
- White label configurable sin bifurcar el core.
- Diagram Studio con librerías, capas anidadas y propiedades dinámicas.
- Simulación con semaforización y recomendaciones accionables.

---

## 6. Próximo Bloque de Ejecución

1. Ejecutar piloto en planta con tenant de negocio y branding final.
2. Medir adopción de journeys por rol y tiempos de tarea (post go-live).
3. Planificar backlog V3 (integraciones externas, BI y asistentes operativos).


