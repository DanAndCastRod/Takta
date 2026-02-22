# FASE 2: Motor Documental (Gestión del Conocimiento)

> **Estado**: Pendiente (Depende de Fase 1)
> **Objetivo**: Digitalizar la creación de documentación (SOPs, LUPs) usando Editor.js.

---

## 📅 Sprint 3: Backend Documental (Semana 3)

### 🎯 Objetivos
- Sistema de Plantillas (Ingesta de `ie_formats`).
- Almacenamiento de Documentos (JSON Blob).

### 📋 Checklist Técnico

| Tarea | Alcance |
|-------|---------|
| Modelo `FormatTemplate` + `FormatInstance` | **MVP** |
| API Ingesta de templates (`/templates/ingest`) | **MVP** |
| API Listar templates por categoría | **MVP** |
| API Guardar/Leer documentos JSON | **MVP** |
| API Render HTML/Markdown | Full |

- **Modelos**:
    - [ ] `FormatTemplate`: Estructura base (Markdown/Config). (**MVP**)
    - [ ] `FormatInstance`: Instancia diligenciada (Vinculada a Activo). (**MVP**)
- **API (`/api/documents`)**:
    - [ ] `POST /templates/ingest`: Leer carpeta `ie_formats` y actualizar BD. (**MVP**)
    - [ ] `GET /templates/`: Listar formatos disponibles por categoría (Lean, BPM...). (**MVP**)
    - [ ] `POST /documents/`: Guardar JSON de Editor.js. (**MVP**)
    - [ ] `GET /documents/{id}/render`: Retornar HTML/Markdown para visualización. (Full)

---

## 📅 Sprint 4: Frontend Editor (Semana 4)

### 🎯 Objetivos
- Integración de Editor.js V2.
- Interfaz de "Nuevo Documento".

### 📋 Checklist Técnico

| Tarea | Alcance |
|-------|---------|
| Editor.js con plugins core (Header, List, Table) | **MVP** |
| Modo Lectura vs Escritura | **MVP** |
| Modal "Seleccionar Tipo de Formato" | **MVP** |
| Inyección de Template pre-cargado | **MVP** |
| Inyección de Variables (`{{asset_name}}`) | Full |
| Auto-save | Full |
| Subida de imágenes (Base64 o endpoint) | Full |

- **Componente `DocumentEditor`**:
    - [ ] Inicializar Editor.js con plugins: Header, List, Table, Image, Warning. (**MVP**)
    - [ ] Modo Lectura (Read-only) vs Modo Escritura. (**MVP**)
- **Flujo de Creación**:
    - [ ] Modal "Seleccionar Tipo de Formato" (Card Grid). (**MVP**)
    - [ ] Inyección de Template: Al elegir "Kaizen", precargar la estructura de bloques. (**MVP**)
    - [ ] Inyección de Variables: Reemplazar `{{asset_name}}` con el activo seleccionado. (Full)
- **Persistencia**:
    - [ ] Botón "Guardar" flotante (Auto-save deseable). (**MVP** guardar, Full auto-save)
    - [ ] Manejo de subida de imágenes (Base64 o Endpoint separado). (Full)

### 🧪 Criterios de Aceptación
1.  Usuario puede crear un SOP desde una plantilla en blanco. (**MVP**)
2.  El documento guarda el ID del activo correctamente. (**MVP**)
3.  Al reabrir un documento guardado, el contenido se restaura completamente. (**MVP**)
