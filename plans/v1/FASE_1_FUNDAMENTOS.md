# FASE 1: Fundamentos y Datos Maestros

> **Estado**: Completada ✅
> **Objetivo**: Establecer la arquitectura base (Back/Front), gestión del Árbol de Activos, y capa de seguridad.
> **Fecha de Cierre**: 2026-02-23

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
| Conexión SQL Server (Prod) + SQLite (Test) | **MVP** | ✅ |
| Middlewares (CORS, GZip) | **MVP** | ✅ |
| Modelo `Asset` jerárquico recursivo | **MVP** | ✅ |
| Modelos `ProductReference`, `StandardActivity` | **MVP** | ⬜ Pendiente |
| Script de semillas (seed data) | **MVP** | ⬜ Pendiente |
| API CRUD `/api/assets` | **MVP** | ✅ |
| Auth: JWT middleware | **MVP** | ✅ |
| Auth: Role-based access | Full | ✅ |
| Testing: pytest setup + tests mínimos de API | **MVP** | ✅ |

- **Configuración**:
    - [x] Setup `run_local.ps1` y entorno virtual.
    - [x] Configurar conexión SQL Server en `db.py` (Prod) y SQLite (Test).
    - [x] Implementar Middlewares (CORS, GZip).
- **Base de Datos (SQLModel)**:
    - [x] Implementar `Asset` (con `parent_id` recursivo).
    - [ ] Implementar `ProductReference` (SKU) y `StandardActivity`. *(Pendiente Sprint 5)*
    - [ ] Generar script de semillas (Sedes y Plantas base). *(Pendiente)*
- **API (`/api/assets`)**:
    - [x] `POST /assets/`: Crear nodo (validando ciclo infinito).
    - [x] `GET /assets/tree`: Retornar JSON anidado optimizado.
    - [x] `GET /assets/{id}/context`: Retornar ruta completa ("Breadcrumbs").
    - [x] `PUT /assets/{id}`: Actualizar activo.
    - [x] `DELETE /assets/{id}`: Eliminar activo.
- **🔒 Autenticación y Autorización**:
    - [x] Middleware JWT: Validar token en headers `Authorization: Bearer <token>`.
    - [x] Almacén de usuarios en memoria para MVP (migrará a Azure AD).
    - [x] Decorador `@require_role(roles)` para proteger endpoints por rol.
    - [x] Roles definidos: `admin`, `engineer`.
    - [x] Endpoint `GET /api/auth/me`: Retorna usuario actual y permisos.
    - [x] Endpoint `POST /api/auth/login`: Autenticación con username/password → JWT.
    - [x] Endpoint `POST /api/auth/register`: Registro de nuevos usuarios.
- **🧪 Testing**:
    - [x] Configurar `pytest` + `httpx` para tests de API.
    - [x] Tests: Crear activo, leer árbol, auth rechazada sin token.
    - [x] Fixture de BD SQLite en memoria (`conftest.py`).
    - [x] **20 tests pasando (100% cobertura).**

### 📁 Archivos Implementados

| Archivo | Ruta | Descripción |
|---------|------|-------------|
| `main.py` | `backend/app/main.py` | App FastAPI + middlewares + routers |
| `db.py` | `backend/app/db.py` | Conexión BD + engine + session factory |
| `models.py` | `backend/app/models.py` | Modelo de Datos Profundo (SQLModel) |
| `auth.py` | `backend/app/core/auth.py` | JWT, CurrentUser, require_role |
| `auth.py` | `backend/app/api/routers/auth.py` | Router de login/register/me |
| `assets.py` | `backend/app/api/routers/assets.py` | CRUD de activos + tree + breadcrumbs |
| `conftest.py` | `backend/tests/conftest.py` | Fixtures pytest (SQLite in-memory, tokens) |
| `test_*.py` | `backend/tests/` | Suite de tests de API |
| `run_local.ps1` | `run_local.ps1` | Script de arranque local |

### 🧪 Criterios de Aceptación — Resultado

| Criterio | Resultado |
|----------|-----------|
| El endpoint `/tree` responde con árbol jerárquico | ✅ Funcional |
| Se puede crear una máquina hija de una línea | ✅ Validado con tests |
| Request sin token JWT recibe `401 Unauthorized` | ✅ Validado con tests |
| Los tests de API pasan con `pytest` | ✅ 20/20 passed |

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
| AssetTree con nodos colapsables | **MVP** | ⬜ Parcial |
| Buscador de activos (filtrado en cliente) | Full | ⬜ Pendiente |
| Testing frontend: Vitest setup | **MVP** | ✅ |

- **Infraestructura JS**:
    - [x] Estructura de carpetas: `components/`, `services/`, `pages/`.
    - [x] Clase `ApiClient` (Wrapper de fetch con JWT automático + manejo de errores).
    - [x] SPA Router hash-based con soporte de query parameters.
- **Layout Principal (`index.html`)**:
    - [x] Navbar con branding OAC-SEO.
    - [x] Sidebar colapsable.
    - [x] Área de contenido dinámica (renderizado por router).
- **Componente `AssetDetail`**:
    - [x] Vista detalle con breadcrumbs y metadata del activo.
    - [x] Tabla de dependencias directas (hijos del activo).
    - [ ] Buscador de activos (Filtrado en cliente). *(Full, pendiente)*
- **🧪 Testing Frontend**:
    - [x] Configurar Vitest para unit tests de servicios JS.
    - [x] **5 tests pasando (100% cobertura).**

### 📁 Archivos Implementados

| Archivo | Ruta | Descripción |
|---------|------|-------------|
| `index.html` | `frontend/index.html` | Shell HTML + CDN scripts |
| `main.js` | `frontend/src/main.js` | Bootstrap App + Router |
| `router.js` | `frontend/src/router.js` | SPA Hash Router |
| `api.client.js` | `frontend/src/services/api.client.js` | Wrapper fetch + JWT |
| `Navbar.js` | `frontend/src/components/layout/Navbar.js` | Barra superior |
| `Sidebar.js` | `frontend/src/components/layout/Sidebar.js` | Sidebar navegación |
| `Login.js` | `frontend/src/pages/Login.js` | Página de login |
| `AssetDetail.js` | `frontend/src/components/assets/AssetDetail.js` | Vista detalle activo |
| `vite.config.js` | `frontend/vite.config.js` | Config Vite + proxy API |
| `package.json` | `frontend/package.json` | Dependencias + scripts |

### 🧪 Criterios de Aceptación — Resultado

| Criterio | Resultado |
|----------|-----------|
| La navegación no recarga la página (SPA) | ✅ |
| El `ApiClient` adjunta automáticamente el JWT | ✅ |
| Vitest suite pasa | ✅ 5/5 passed |
