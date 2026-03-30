# Claude Context -- Takta

**Proyecto**: Takta / Sistema de Estandarizacion Operativa (SEO)
**Empresa**: Grupo BIOS / Operadora Avicola Colombia (OAC)
**Version plataforma**: V2 (fases 1-6 cerradas al 2026-03-09)
**Plan de referencia**: `plans/v2/PLAN_MAESTRO_V2.md`
**Bitacora**: `plans/v2/BITACORA_IMPLEMENTACION_V2.md`

---

## Arquitectura

Monolito desacoplado. Backend API + Frontend SPA independientes.

```
backend/   FastAPI + SQLModel + Uvicorn   :9003
frontend/  Vanilla JS + Vite + Tailwind   :5173  (proxy /api -> 9003)
```

### Backend

- **Framework**: FastAPI (async) + SQLModel (ORM)
- **Auth**: JWT con `python-jose` + `passlib[bcrypt]`
- **DB dev**: SQLite en `backend/takta.db`
- **DB prod Bios**: SQL Server via `pymssql` (`DB_MODE=mssql` en `.env`)
- **DB prod URiT**: SQLite via cPanel + `backend/passenger_wsgi.py` (a2wsgi)
- **Entry point**: `backend/app/main.py`
- **Modelos**: `backend/app/models.py`
- **Seeds**: `backend/app/seeds/`
- **Servicios**: `backend/app/services/`

#### Routers registrados (`main.py`)

| Router               | Prefijo API         | Dominio                               |
|----------------------|---------------------|---------------------------------------|
| `auth`               | `/api/auth`         | Autenticacion y tokens                |
| `assets`             | `/api/assets`       | Arbol jerarquico Sede->Linea->Maquina |
| `templates`          | `/api/templates`    | Plantillas de documentos              |
| `documents`          | `/api/documents`    | Instancias de documentos              |
| `documents_advanced` | `/api/documents`    | Flujos avanzados documental           |
| `engineering`        | `/api/engineering`  | Estandares, actividades, SKUs         |
| `engineering_advanced` | `/api/engineering` | Cronometraje, hojas de estudio       |
| `integration`        | `/api/integration`  | Contexto canonico compartido          |
| `execution`          | `/api/execution`    | Logs produccion, paros, dotacion      |
| `execution_advanced` | `/api/execution`    | Planes, Kanban, reglas, catalogo      |
| `ci`                 | `/api/ci`           | Mejora continua + KPI MC scorecard    |
| `audits`             | `/api/audits`       | Auditorias 5S y calidad               |
| `excellence_advanced`| `/api/excellence`   | Workflows, acciones de mejora         |
| `quality`            | `/api/quality`      | SPC, NC/CAPA, muestreo de peso        |
| `logistics`          | `/api/logistics`    | Kanban loops, supermercados           |
| `logistics_vsm`      | `/api/vsm`          | VSM (estado actual/futuro)            |
| `plant_layouts`      | `/api/plant-layouts`| Layouts guardados del Diagram Studio  |
| `capacity`           | `/api/capacity`     | Capacidad instalada y efectiva        |
| `meetings`           | `/api/meetings`     | Actas IP, compromisos, calidad        |
| `platform`           | `/api/platform`     | Librerias, eventos, property schemas  |

### Frontend

- **Stack**: Vanilla JS ES6+, sin framework reactivo
- **Build**: Vite 7 con chunking manual (`vendor` + `fabric`)
- **CSS**: Tailwind 4 + tokens propios (`tk-*`) en `src/style.css`
- **Canvas/Diagramas**: Fabric.js 7
- **Iconos**: Lucide
- **Testing unitario**: Vitest
- **Testing E2E**: Playwright (smoke mock + backend real)

#### Paginas (`frontend/src/pages/`)

| Archivo                | Ruta hash         | Modulo                           |
|------------------------|-------------------|----------------------------------|
| `LandingPage.js`       | `#/`              | Dashboard / journeys por rol     |
| `DashboardPage.js`     | `#/dashboard`     | Metricas y accesos rapidos       |
| `AssetsPage.js`        | `#/assets`        | Arbol de activos                 |
| `EngineeringPage.js`   | `#/engineering`   | Estandares e ingenieria          |
| `CapacityPage.js`      | `#/capacity`      | Capacidad instalada              |
| `TimingPage.js`        | `#/timing`        | Cronometraje y estudios          |
| `ExecutionPage.js`     | `#/execution`     | Ejecucion y control produccion   |
| `ExcellencePage.js`    | `#/excellence`    | Excelencia operacional + KPI MC  |
| `WeightSamplingPage.js`| `#/weight-sampling`| Muestreo de peso + SPC + NC/CAPA|
| `MeetingsPage.js`      | `#/meetings`      | Actas IP y compromisos           |
| `DocumentsPage.js`     | `#/documents`     | Repositorio documental           |
| `DocumentEditorPage.js`| `#/documents/:id` | Editor.js de documentos          |
| `PlantEditorPage.js`   | `#/plant-editor`  | Diagram Studio + simulacion      |
| `SettingsPage.js`      | `#/settings`      | Config tenant, eventos, PWA      |
| `Login.js`             | `#/login`         | Autenticacion                    |

#### Servicios clave (`frontend/src/services/`)

| Servicio                  | Proposito                                                       |
|---------------------------|-----------------------------------------------------------------|
| `api.client.js`           | Wrapper fetch centralizado con JWT y manejo de errores          |
| `module-context.service.js` | Contexto canonico global (asset_id, product_reference_id, ...) |
| `ui-feedback.service.js`  | Toasts unificados -- unico mecanismo de feedback al usuario     |
| `offline-sync.service.js` | Cola offline y resolucion de conflictos                         |
| `tenant-ui.service.js`    | Branding y feature flags por tenant                             |
| `platform.service.js`     | Librerias del Diagram Studio                                    |
| `quality.service.js`      | SPC, NC/CAPA                                                    |
| `meeting.service.js`      | Actas y compromisos                                             |

---

## Modelo de Datos Central

La triada canonica une todos los modulos:

```
Asset  +  StandardActivity  +  ProductReference  =  ProcessStandard
```

Entidades adicionales clave:

- `ImprovementAction` / `ActionWorkflow` -- acciones y flujo multi-rol
- `NonConformity` / `CapaAction` -- NC/CAPA desde SPC o manual
- `ContinuousImprovementKpiDefinition` / `ContinuousImprovementKpiMeasurement` -- KPI MC
- `WeightSample` / `WeightSpec` / `WeightCapabilityRun` -- SPC de peso
- `MeetingRecord` / `MeetingCommitment` -- actas IP
- `DiagramLayout` / `DiagramLibrary` / `DiagramPropertySchema` -- Diagram Studio

---

## Comandos de Desarrollo

```powershell
# Backend (desde raiz del repo)
.\run_local.ps1                           # uvicorn :9003 con hot-reload

# Frontend
cd frontend && npm run dev                # Vite :5173 con proxy a :9003

# Tests backend
python -m pytest -q backend/tests

# Tests frontend
npm --prefix frontend test                # Vitest unitario
npm --prefix frontend run test:e2e        # Playwright smoke (mock)
npm --prefix frontend run test:e2e:real   # Playwright con backend real

# Build frontend
npm --prefix frontend run build

# Seed demo
python -m backend.app.seeds.seed_demo_bulk --scale medium
```

---

## Variables de Entorno (`.env` en raiz)

```ini
DB_MODE=sqlite          # o mssql para SQL Server
SQLITE_PATH=./backend/takta.db
MSSQL_SERVER=...
MSSQL_DATABASE=...
MSSQL_USER=...
MSSQL_PASSWORD=...
CORS_ORIGINS=*          # o lista separada por comas en produccion
SECRET_KEY=...          # JWT signing key
```

---

## Despliegue

| Entorno             | Frontend                               | Backend                                    |
|---------------------|----------------------------------------|--------------------------------------------|
| **Bios (interno)**  | IIS static en `biosapps.grupobios.co`  | IIS reverse proxy -> PM2 -> uvicorn :8105  |
| **URiT/EC&F**       | Cloudflare Pages en `takta.urit.services` | cPanel Python App (`passenger_wsgi.py`) |

Guia completa: `plans/v2/GUIA_DESPLIEGUE_URIT_ECF_Y_MIGRACION_BIOS.md`

---

## Convenciones Obligatorias

### Backend
- Todos los endpoints deben ser `async def`.
- Usar `session.exec(select(...))` -- nunca `session.query(...)`.
- No romper definiciones de tabla SQLModel sin plan de migracion explicito.
- No usar `model_config` con nombre `schema` -- usar alias para evitar shadowing con Pydantic.
- El guard de integridad referencial esta en `services/reference_guard.py`.
  Usarlo en endpoints que reciben `asset_id`, `product_reference_id` o `process_standard_id`.

### Frontend
- Nunca usar `alert()` -- toda notificacion va por `uiFeedback` (toast).
- Componentes CSS con prefijo `tk-*` (`tk-card`, `tk-input`, `tk-btn-secondary`, etc.).
- Navegacion con hash routing (`#/ruta`). No usar `window.location.href` para rutas internas.
- El contexto canonico se gestiona exclusivamente por `module-context.service.js`.
- Las paginas se importan con lazy-loading desde `router.js` -- mantener ese patron al agregar rutas.
- UTF-8 siempre. Verificar mojibake al editar textos en espanol.

### General
- No proponer migracion a React, Next.js ni ningun framework SPA. El stack actual es intencional.
- No ejecutar builds ni tests para validar estado del proyecto -- leer la documentacion.
- Al agregar un router nuevo, registrarlo en `backend/app/main.py`.
- Al agregar una pagina nueva, registrarla en `frontend/src/router.js`.

---

## Workflows Definidos

Procedimientos que el agente sigue cuando se invocan explicitamente por nombre.

### `status` -- Reporte de estado de implementacion
1. Leer `plans/v2/PLAN_MAESTRO_V2.md`.
2. Leer `plans/v2/BITACORA_IMPLEMENTACION_V2.md`.
3. Leer los archivos `FASE_*.md` relevantes.
4. Producir tabla de fases, metricas de calidad y proximo bloque.
5. No ejecutar tests ni builds.

### `new-endpoint` -- Agregar endpoint al backend
1. Identificar el router destino en `backend/app/api/`.
2. Verificar si el modelo existe en `models.py`; si no, agregarlo al final.
3. Escribir el endpoint async con tipado completo.
4. Agregar prueba en `backend/tests/` siguiendo el patron de `conftest.py`.
5. Verificar que el router este registrado en `main.py`.

### `new-page` -- Agregar pagina al frontend
1. Crear `frontend/src/pages/NombrePage.js` siguiendo el patron de paginas existentes.
2. Registrar la ruta en `frontend/src/router.js` con import dinamico.
3. Agregar entrada al sidebar en `frontend/src/components/layout/Sidebar.js`.
4. Usar `uiFeedback` para notificaciones y `tk-*` para componentes visuales.

### `debug` -- Diagnosticar un problema
1. Leer el archivo relevante con Read antes de cualquier accion.
2. Usar Grep para buscar el sintoma en el codebase.
3. Formular hipotesis antes de editar.
4. Editar con Edit (no reescribir archivos completos salvo necesidad justificada).
5. Describir el cambio realizado y su razon.

### `notion-sync` -- Sincronizar con Notion
Seguir el contrato definido en `../AGENTS.md` (raiz del Ecosistema TD).
Leer primero: `plans/notion/` y `tools/bios-cli/notion-project-registry.json`.
Ejecutar siempre dry-run antes de cualquier escritura.
