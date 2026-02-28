# FASE 1: Fundamentos y Datos Maestros

> **Estado**: Completada ✅
> **Objetivo**: Establecer la arquitectura base (Back/Front), gestión del Árbol de Activos, y capa de seguridad.
> **Fecha de Cierre**: 2026-02-23
> **Última Auditoría**: 2026-02-27

---

## 📅 Sprint 1: Backend Core, Activos y Seguridad (Semana 1) ✅

### 🎯 Objetivos
- Inicializar proyecto FastAPI con SQL Server.
- Implementar Modelo de Datos Profundo (Jerarquía Recursiva).
- Exponer API REST para navegación del árbol de planta.
- **Establecer capa de Autenticación y Autorización.**

### 📋 Checklist Técnico

| Tarea | Alcance | Estado |
|-------|---------|--------|
| Setup `run_local.ps1` y entorno virtual | **MVP** | ✅ |
| Conexión SQL Server (Prod) + SQLite (Test/Dev) | **MVP** | ✅ |
| Middlewares (CORS, GZip) | **MVP** | ✅ |
| Modelo `Asset` jerárquico recursivo | **MVP** | ✅ |
| Modelos `ProductReference`, `StandardActivity` | **MVP** | ✅ Implementado Sprint 5 |
| Script de semillas (seed data) | **MVP** | ✅ |
| API CRUD `/api/assets` | **MVP** | ✅ |
| Auth: JWT middleware | **MVP** | ✅ |
| Auth: Role-based access | Full | ✅ |
| Testing: pytest setup + tests mínimos de API | **MVP** | ✅ |

- **Configuración**:
    - [x] Setup `run_local.ps1` y entorno virtual.
    - [x] Configurar conexión SQL Server en `db.py` (Prod) y SQLite (Test/Dev con `FORCE_SQLITE=True`).
    - [x] Implementar Middlewares (CORS, GZip).
- **Base de Datos (SQLModel)**:
    - [x] Implementar `Asset` (con `parent_id` recursivo).
    - [x] Implementar `ProductReference` (SKU) y `StandardActivity`. *(Completado Sprint 5)*
    - [x] Generar script de semillas (`backend/app/seeds/seed_assets.py`). 42 activos insertados.
- **API (`/api/assets`)**:
    - [x] `POST /assets/`: Crear nodo (validando ciclo infinito con `_detect_cycle`).
    - [x] `GET /assets/tree`: Retornar JSON anidado optimizado (`_build_tree_node` recursivo).
    - [x] `GET /assets/{id}/context`: Retornar ruta completa ("Breadcrumbs" con `_get_breadcrumbs`).
    - [x] `GET /assets/{id}`: Obtener activo con hijos directos.
    - [x] `GET /assets/`: Listar activos (flat, paginado, filtro por tipo).
    - [x] `PUT /assets/{id}`: Actualizar activo (con validación de ciclos).
    - [x] `DELETE /assets/{id}`: Eliminar activo (previene huérfanos).
- **🔒 Autenticación y Autorización**:
    - [x] Middleware JWT: Validar token en headers `Authorization: Bearer <token>`.
    - [x] Almacén de usuarios en memoria para MVP (migrará a Azure AD).
    - [x] Decorador `@require_role(roles)` para proteger endpoints por rol.
    - [x] Roles definidos: `admin`, `engineer`, `supervisor`, `viewer`.
    - [x] Endpoint `GET /api/auth/me`: Retorna usuario actual y permisos.
    - [x] Endpoint `POST /api/auth/login`: Autenticación con username/password → JWT.
    - [x] Endpoint `POST /api/auth/register`: Registro de nuevos usuarios (solo admin).
- **🧪 Testing**:
    - [x] Configurar `pytest` + `httpx` para tests de API.
    - [x] Tests: Crear activo, leer árbol, auth rechazada sin token.
    - [x] Fixture de BD SQLite en memoria (`conftest.py`).
    - [x] Tests pasando (cobertura funcional de assets + auth).

### 📁 Archivos Implementados

| Archivo | Ruta | Estado |
|---------|------|--------|
| `main.py` | `backend/app/main.py` | ✅ Verificado |
| `db.py` | `backend/app/db.py` | ✅ Verificado |
| `models.py` | `backend/app/models.py` | ✅ Verificado |
| `auth.py` | `backend/app/core/auth.py` | ✅ Verificado |
| `security.py` | `backend/app/core/security.py` | ✅ Verificado |
| `auth.py` | `backend/app/api/routers/auth.py` | ✅ Verificado |
| `assets.py` | `backend/app/api/routers/assets.py` | ✅ Verificado |
| `conftest.py` | `backend/tests/conftest.py` | ✅ Verificado |
| `test_assets.py` | `backend/tests/test_assets.py` | ✅ Verificado |
| `test_auth.py` | `backend/tests/test_auth.py` | ✅ Verificado |
| `run_local.ps1` | `run_local.ps1` | ✅ Verificado |

### 🧪 Criterios de Aceptación — Resultado

| Criterio | Resultado |
|----------|-----------|
| El endpoint `/tree` responde con árbol jerárquico | ✅ Funcional |
| Se puede crear una máquina hija de una línea | ✅ Validado con tests |
| Request sin token JWT recibe `401 Unauthorized` | ✅ Validado con tests |
| Los tests de API pasan con `pytest` | ✅ 47/47 passed (acumulado) |

---

## 📅 Sprint 2: Frontend Shell & Navegación (Semana 2) ✅

### 🎯 Objetivos
- Implementar Layout Corporativo (Bios Design System).
- Construir el "Asset Navigator" (Sidebar dinámico).
- Implementar SPA Router.

### 📋 Checklist Técnico

| Tarea | Alcance | Estado |
|-------|---------|--------|
| Estructura de carpetas JS (components, services, pages) | **MVP** | ✅ |
| ApiClient (fetch wrapper + auth headers) | **MVP** | ✅ |
| Navbar + Sidebar + SPA Router | **MVP** | ✅ |
| AssetTree con nodos colapsables | **MVP** | ✅ |
| AssetDetail con breadcrumbs e hijos | **MVP** | ✅ |
| Buscador de activos (filtrado en cliente) | Full | ✅ |
| Testing frontend: Vitest setup | **MVP** | ✅ |

- **Infraestructura JS**:
    - [x] Estructura de carpetas: `components/` (assets, editor, layout, plant-editor), `services/`, `pages/`.
    - [x] Clase `ApiClient` (Wrapper de fetch con JWT automático + manejo de errores + 401 auto-logout).
    - [x] SPA Router hash-based con soporte de query parameters.
- **Layout Principal (`index.html`)**:
    - [x] Navbar con branding OAC-SEO (`Navbar.js`).
    - [x] Sidebar colapsable con iconos SVG (`Sidebar.js`).
    - [x] Área de contenido dinámica (renderizado por router).
- **Componente `AssetTree`**:
    - [x] Árbol de activos con nodos colapsables (`AssetTree.js`).
- **Componente `AssetDetail`**:
    - [x] Vista detalle con breadcrumbs y metadata del activo.
    - [x] Tabla de dependencias directas (hijos del activo).
    - [x] Buscador de activos (`AssetTree.js`): Filtrado recursivo en cliente con highlight y debounce.
- **🧪 Testing Frontend**:
    - [x] Configurar Vitest para unit tests de servicios JS.
    - [x] **5 tests pasando (api.client.test.js).**

### 📁 Archivos Implementados

| Archivo | Ruta | Estado |
|---------|------|--------|
| `index.html` | `frontend/index.html` | ✅ Verificado |
| `main.js` | `frontend/src/main.js` | ✅ Verificado |
| `router.js` | `frontend/src/router.js` | ✅ Verificado |
| `api.client.js` | `frontend/src/services/api.client.js` | ✅ Verificado |
| `Navbar.js` | `frontend/src/components/layout/Navbar.js` | ✅ Verificado |
| `Sidebar.js` | `frontend/src/components/layout/Sidebar.js` | ✅ Verificado |
| `Login.js` | `frontend/src/pages/Login.js` | ✅ Verificado |
| `AssetTree.js` | `frontend/src/components/assets/AssetTree.js` | ✅ Verificado |
| `AssetDetail.js` | `frontend/src/components/assets/AssetDetail.js` | ✅ Verificado |
| `AssetsPage.js` | `frontend/src/pages/AssetsPage.js` | ✅ Verificado |
| `vite.config.js` | `frontend/vite.config.js` | ✅ Verificado |
| `package.json` | `frontend/package.json` | ✅ Verificado |
| `api.client.test.js` | `frontend/src/services/__tests__/api.client.test.js` | ✅ Verificado |

### 🧪 Criterios de Aceptación — Resultado

| Criterio | Resultado |
|----------|-----------|
| La navegación no recarga la página (SPA) | ✅ |
| El `ApiClient` adjunta automáticamente el JWT | ✅ |
| Vitest suite pasa | ✅ 5/5 passed |

---

## 📌 Items Pendientes (Full Scope)

No hay items pendientes en Fase 1. Todos los items MVP y Full han sido implementados. ✅

## 📊 Métricas Actuales (Acumulado con Sprints Posteriores)

| Métrica | Valor |
|---------|-------|
| Backend Tests (pytest) | **47 passed** |
| Frontend Tests (Vitest) | **5 passed** |
| Total Tests | **52** |
| Routers registrados | 10 (auth, assets, templates, documents, engineering, ci, audits, logistics, plant_layouts, capacity) |
| Modelos SQLModel | 13+ (Asset, ProductReference, StandardActivity, ProcessStandard, TimeStudy, TimingElement, TimingSession, TimingLap, FormatTemplate, FormatInstance, ImprovementAction, AuditInstance, AuditScore) |
