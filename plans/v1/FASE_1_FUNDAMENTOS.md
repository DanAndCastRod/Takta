# FASE 1: Fundamentos y Datos Maestros

> **Estado**: Planificada
> **Objetivo**: Establecer la arquitectura base (Back/Front) y la gestión del Árbol de Activos.

---

## 📅 Sprint 1: Backend Core & Activos (Semana 1)

### 🎯 Objetivos
- Inicializar proyecto FastAPI con SQL Server.
- Implementar Modelo de Datos Profundo (Jerarquía Recursiva).
- Exponer API REST para navegación del árbol de planta.

### 📋 Checklist Técnico
- [ ] **Configuración**:
    - [x] Setup `run_local.ps1` y entorno virtual.
    - [ ] Configurar conexión SQL Server en `db.py` (Prod) y SQLite (Test).
    - [ ] Implementar Middlewares (CORS, GZip).
- **Base de Datos (SQLModel)**:
    - [ ] Implementar `Asset` (con `parent_id` recursivo).
    - [ ] Implementar `ProductReference` (SKU) y `StandardActivity`.
    - [ ] Generar script de semillas (Sedes y Plantas base).
- **API (`/api/assets`)**:
    - [ ] `POST /assets/`: Crear nodo (validando ciclo infinito).
    - [ ] `GET /assets/tree`: Retornar JSON anidado optimizado (Lazy Loading).
    - [ ] `GET /assets/{id}/context`: Retornar ruta completa ("Breadcrumbs").

### 🧪 Criterios de Aceptación
1.  El endpoint `/tree` responde en < 200ms para el primer nivel.
2.  Se puede crear una máquina hija de una línea.

---

## 📅 Sprint 2: Frontend Shell & Navegación (Semana 2)

### 🎯 Objetivos
- Implementar Layout Corporativo (Bios Design System).
- Construir el "Asset Navigator" (Sidebar dinámico).

### 📋 Checklist Técnico
- **Infraestructura JS**:
    - [ ] Estructura de carpetas: `/js/components`, `/js/services`, `/js/pages`.
    - [ ] Clase `ApiClient` (Wrapper de fetch con manejo de errores).
- **Layout Principal (`index.html`)**:
    - [ ] Navbar con branding OAC-SEO.
    - [ ] Sidebar colapsable.
    - [ ] Área de contenido dinámica (SPA router simple).
- **Componente `AssetTree`**:
    - [ ] Renderizar nodos colapsables (Folder/File icons).
    - [ ] Evento `onSelect`: Cargar vista detalle en área principal.
    - [ ] Buscador de activos (Filtrado en cliente).

### 🧪 Criterios de Aceptación
1.  Al hacer clic en "Planta Beneficio", se despliegan las áreas.
2.  La navegación no recarga la página (SPA Feeling).
