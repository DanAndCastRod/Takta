# FASE 1: Fundamentos y Datos Maestros

> **Estado**: Planificada
> **Objetivo**: Establecer la arquitectura base (Back/Front), gestión del Árbol de Activos, y capa de seguridad.

---

## 📅 Sprint 1: Backend Core, Activos y Seguridad (Semana 1)

### 🎯 Objetivos
- Inicializar proyecto FastAPI con SQL Server.
- Implementar Modelo de Datos Profundo (Jerarquía Recursiva).
- Exponer API REST para navegación del árbol de planta.
- **Establecer capa de Autenticación y Autorización.**

### 📋 Checklist Técnico

| Tarea | Alcance |
|-------|---------|
| Setup `run_local.ps1` y entorno virtual | **MVP** ✅ |
| Conexión SQL Server (Prod) + SQLite (Test) | **MVP** |
| Middlewares (CORS, GZip) | **MVP** |
| Modelo `Asset` jerárquico recursivo | **MVP** |
| Modelos `ProductReference`, `StandardActivity` | **MVP** |
| Script de semillas (seed data) | **MVP** |
| API CRUD `/api/assets` | **MVP** |
| Auth: JWT middleware | **MVP** |
| Auth: Role-based access | Full |
| Testing: pytest setup + tests mínimos de API | **MVP** |

- [ ] **Configuración**:
    - [x] Setup `run_local.ps1` y entorno virtual. (**MVP** ✅)
    - [ ] Configurar conexión SQL Server en `db.py` (Prod) y SQLite (Test). (**MVP**)
    - [ ] Implementar Middlewares (CORS, GZip). (**MVP**)
- **Base de Datos (SQLModel)**:
    - [ ] Implementar `Asset` (con `parent_id` recursivo). (**MVP**)
    - [ ] Implementar `ProductReference` (SKU) y `StandardActivity`. (**MVP**)
    - [ ] Generar script de semillas (Sedes y Plantas base). (**MVP**)
- **API (`/api/assets`)**:
    - [ ] `POST /assets/`: Crear nodo (validando ciclo infinito). (**MVP**)
    - [ ] `GET /assets/tree`: Retornar JSON anidado optimizado (Lazy Loading). (**MVP**)
    - [ ] `GET /assets/{id}/context`: Retornar ruta completa ("Breadcrumbs"). (**MVP**)
- **🔒 Autenticación y Autorización**:
    - [ ] Middleware JWT: Validar token en headers `Authorization: Bearer <token>`. (**MVP**)
    - [ ] Modelo `UserSession` o integración con Azure AD / LDAP (Enterprise). (**MVP**)
    - [ ] Decorador `@require_role(roles)` para proteger endpoints por rol. (Full)
    - [ ] Roles definidos: `admin`, `engineer` (editor), `supervisor` (auditor), `viewer` (gerencia). (Full)
    - [ ] Endpoint `GET /api/auth/me`: Retorna usuario actual y permisos. (**MVP**)
- **🧪 Testing**:
    - [ ] Configurar `pytest` + `httpx` (AsyncClient) para tests de API. (**MVP**)
    - [ ] Tests mínimos: Crear activo, leer árbol, auth rechazada sin token. (**MVP**)
    - [ ] Actualizar `test_backend_api.py` existente para usar fixture de BD SQLite en memoria. (**MVP**)

### 🧪 Criterios de Aceptación
1.  El endpoint `/tree` responde en < 200ms para el primer nivel.
2.  Se puede crear una máquina hija de una línea.
3.  Un request sin token JWT recibe `401 Unauthorized`. (**MVP**)
4.  Los tests de API pasan con `pytest` en CI. (**MVP**)

---

## 📅 Sprint 2: Frontend Shell & Navegación (Semana 2)

### 🎯 Objetivos
- Implementar Layout Corporativo (Bios Design System).
- Construir el "Asset Navigator" (Sidebar dinámico).
- Implementar SPA Router.

### 📋 Checklist Técnico

| Tarea | Alcance |
|-------|---------|
| Estructura de carpetas JS (components, services, pages) | **MVP** |
| ApiClient (fetch wrapper + auth headers) | **MVP** |
| Navbar + Sidebar + SPA Router | **MVP** |
| AssetTree con nodos colapsables | **MVP** |
| Buscador de activos (filtrado en cliente) | Full |
| Testing frontend: Vitest setup | **MVP** |

- **Infraestructura JS**:
    - [ ] Estructura de carpetas: `/js/components`, `/js/services`, `/js/pages`. (**MVP**)
    - [ ] Clase `ApiClient` (Wrapper de fetch con manejo de errores y envío automático del JWT). (**MVP**)
    - [ ] SPA Router simple (hash-based o History API). (**MVP**)
- **Layout Principal (`index.html`)**:
    - [ ] Navbar con branding OAC-SEO. (**MVP**)
    - [ ] Sidebar colapsable. (**MVP**)
    - [ ] Área de contenido dinámica (renderizado por router). (**MVP**)
- **Componente `AssetTree`**:
    - [ ] Renderizar nodos colapsables (Folder/File icons). (**MVP**)
    - [ ] Evento `onSelect`: Cargar vista detalle en área principal. (**MVP**)
    - [ ] Buscador de activos (Filtrado en cliente). (Full)
- **🧪 Testing Frontend**:
    - [ ] Configurar Vitest para unit tests de servicios JS. (**MVP**)
    - [ ] Test mínimo: `ApiClient` maneja errores correctamente. (**MVP**)

### 🧪 Criterios de Aceptación
1.  Al hacer clic en "Planta Beneficio", se despliegan las áreas.
2.  La navegación no recarga la página (SPA Feeling).
3.  El `ApiClient` adjunta automáticamente el JWT a cada request.
