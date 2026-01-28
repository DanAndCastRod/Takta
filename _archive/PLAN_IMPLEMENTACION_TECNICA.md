# Plan de Implementación Técnica: Sistema de Estandarización Operativa (OAC-SEO) FullStack

Este documento sincroniza el Plan Maestro (`plan.md`) y el Plan de Integración de Formatos (`PLAN_INTEGRACION_FORMATOS.md`) en una arquitectura FullStack robusta, segura y escalable.

---

## 🏗️ 1. Arquitectura de Solución High-Level

Se propone una arquitectura de servicios desacoplados para garantizar flexibilidad y mantenibilidad.

### Backend: FastAPI (Python)
*   **Rol**: API RESTful central que orquesta la lógica de negocio y el acceso a datos.
*   **Justificación**: Alto rendimiento (asíncrono), autodocumentación (Swagger/OpenAPI), y excelente integración con librerías de análisis de datos (Pandas/NumPy) necesarias para los cálculos de ingeniería (Tiempos Estándar, VSM).
*   **Estructura**:
    ```
    /backend
      /app
        /api           # Endpoints versionados
        /core          # Configuración y Seguridad (JWT)
        /db            # Modelos SQLModel/SQLAlchemy
        /services      # Lógica de cálculo (Engine de Tiempos, VSM)
        /templates     # Parsers de Markdown -> SQL
    ```

### Frontend: Bios Apps Design System (Vanilla JS + Bootstrap + Utilities)
*   **Rol**: Interfaz de usuario "Pixel Perfect" corporativa.
*   **Estrategia Híbrida**:
    1.  **Vistas "Duras" (Ingeniería)**: Páginas HTML/JS nativas usando el Design System para dashboards, gráficos interactivos (D3.js/GoJS para VSM/Árboles) y tablas de datos.
    2.  **Vistas "Blandas" (Documentación)**: Integración del **Editor de Documentos V2 (Editor.js)** para la redacción y visualización de formatos textuales (.md) como SOPs, Análisis y Lecciones Aprendidas.

### Base de Datos: SQL Server
*   **Modelo de Datos**: Relacional estricto para entidades Core (Activos, Productos) + Almacenamiento JSON/Text para contenido no estructurado (Cuerpos de documentos).

---

## 🗂️ 2. Modelo de Datos Unificado (Schema Core)

Integración de las entidades de `plan.md` con los requerimientos de metadata de `PLAN_INTEGRACION_FORMATOS.md`.

### Entidades Maestras (Backbone)
1.  **`Asset` (Activo)**: Jerarquía recursiva.
    *   *Sede > Planta > Área > Línea > Máquina > Componente*.
2.  **`ProductReference` (SKU)**: Catálogo de productos.
    *   *Familia, Código, Descripción*.
3.  **`StandardActivity` (Actividad)**: Biblioteca de "atomos" de trabajo.
    *   *Nombre, Tipo (VA/NVA), Clasificación estándar*.

### Entidades Transaccionales (Ingeniería)
4.  **`ProcessStandard` (La "Triada")**:
    *   *Asset_ID + Activity_ID + Reference_ID*.
    *   *Atributos*: Tiempo Estándar, Frecuencia, Habilitado.
5.  **`TimeStudy` (Estudio)**:
    *   *Vinculado a `ProcessStandard`*.
    *   *Datos*: Ciclos crudos, Factor Ritmo, Suplementos.

### Entidades Documentales (Formatos)
6.  **`FormatTemplate`**:
    *   *Catálogo definidos en PLAN_INTEGRACION_FORMATOS.md*.
    *   *Structure_Schema*: JSON Schema que valida qué campos requiere este formato específico.
7.  **`FormatInstance`**:
    *   *Instancia diligenciada*.
    *   *Content*: Markdown/JSON del Editor.js.
    *   *Context*: { asset_id, sku_id, user_id, timestamp }.

---

## 🎨 3. Estrategia Frontend: Implementación UX/UI

Siguiendo la **Guía de Diseño de Agentes** y el workflow **Editor de Documentos**.

### A. Layout Principal (`app-main`)
*   **Sidebar**: Dinámico basado en la Jerarquía de Activos. El usuario "navega la planta" y al seleccionar un nodo (ej. "Línea de Eviscerado"), el contenido principal muestra el contexto de ese activo.
*   **Header**: Contexto global (Usuario, Planta, Alertas).

### B. Integración de Editor.js (V2)
Para los 60+ formatos definidos, no crearemos 60 formularios HTML hardcodeados. Usaremos el Editor V2 como motor de renderizado dinámico.

*   **Workflow**:
    1.  Usuario selecciona "Nuevo Formato" > Elije "Kaizen Newspaper".
    2.  El Backend entrega el **Template Markdown** preseteado.
    3.  El Frontend carga el Editor.js e inyecta el contenido del template.
    4.  Usuario edita visualmente (Tablas, Listas, Imágenes).
    5.  Al guardar, se envía el JSON/MD al backend procesado.

### C. Visualizaciones Especializadas ("Apps dentro de la App")
Para herramientas que requieren interacción gráfica compleja, no usaremos el editor de texto.
*   **VSM Designer**: Canvas interactivo (JS nativo sobre SVG) para arrastrar y soltar iconos Lean.
*   **Asset Tree Manager**: Visualizador de árbol colapsable para gestionar la jerarquía.
*   **Yamazumi Chart**: Gráfico de barras apiladas interactivo (Chart.js o D3) alimentado por la API de Tiempos.

---

## 📅 4. Roadmap de Desarrollo Técnico

### Fase 1: Fundamentos (Sprints 1-2)
1.  **Setup Backend**: Inicializar proyecto FastAPI con SQLModel.
2.  **Core Models**: Migraciones para Asset, SKU, Activity.
3.  **API CRUD Base**: Endpoints para gestión de maestros.
4.  **Setup Frontend**: Estructura `navbar/sidebar` según Guía Diseño Bios.

### Fase 2: Motor de Ingeniería (Sprints 3-4)
1.  **Gestor de Tiempos**: Lógica para cálculo de T. Normal y T. Estándar en Python.
2.  **Integración Editor.js**: Implementar workflow `/editor-documentos` para SOPs simples.
3.  **Carga de Templates**: Ingesta de los `.md` de `ie_formats` como semillas en BD.

### Fase 3: Visualización Avanzada (Sprints 5-6)
1.  **VSM Module**: Desarrollo del canvas de mapeo.
2.  **Dashboards**: KPIs de proceso usando componentes `card-gb` y `stats`.

---

## ✅ Checklist de Calidad
*   [ ] **Estilos**: Uso estricto de `--gb-petroleo1` y fuentes `DM Sans`.
*   [ ] **Seguridad**: Validación de JWT en cada endpoint de FastAPI.
*   [ ] **Performance**: Endpoints de lectura de árbol cacheados (Redis o memoria) para evitar latencia en recursividad.
*   [ ] **Interoperabilidad**: Los documentos generados deben poder exportarse a PDF/MD limpio.
