# FASE 2: Motor Documental (Gestión del Conocimiento)

> **Estado**: Pendiente (Depende de Fase 1)
> **Objetivo**: Digitalizar la creación de documentación (SOPs, LUPs) usando Editor.js.

---

## 📅 Sprint 3: Backend Documental (Semana 3)

### 🎯 Objetivos
- Sistema de Plantillas (Ingesta de `ie_formats`).
- Almacenamiento de Documentos (JSON Blob).

### 📋 Checklist Técnico
- **Modelos**:
    - [ ] `FormatTemplate`: Estructura base (Markdown/Config).
    - [ ] `FormatInstance`: Instancia diligenciada (Vinculada a Activo).
- **API (`/api/documents`)**:
    - [ ] `POST /templates/ingest`: Leer carpeta `ie_formats` y actualizar BD.
    - [ ] `GET /templates/`: Listar formatos disponibles por categoría (Lean, BPM...).
    - [ ] `POST /documents/`: Guardar JSON de Editor.js.
    - [ ] `GET /documents/{id}/render`: Retornar HTML/Markdown para visualización.

---

## 📅 Sprint 4: Frontend Editor (Semana 4)

### 🎯 Objetivos
- Integración de Editor.js V2.
- Interfaz de "Nuevo Documento".

### 📋 Checklist Técnico
- **Componente `DocumentEditor`**:
    - [ ] Inicializar Editor.js con plugins: Header, List, Table, Image, Warning.
    - [ ] Modo Lectura (Read-only) vs Modo Escritura.
- **Flujo de Creación**:
    - [ ] Modal "Seleccionar Tipo de Formato" (Card Grid).
    - [ ] Inyección de Template: Al elegir "Kaizen", precargar la estructura de bloques.
    - [ ] Inyección de Variables: Reemplazar `{{asset_name}}` con el activo seleccionado.
- **Persistencia**:
    - [ ] Botón "Guardar" flotante (Auto-save deseable).
    - [ ] Manejo de subida de imágenes (Base64 o Endpoint separado).

### 🧪 Criterios de Aceptación
1.  Usuario puede crear un SOP desde una plantilla en blanco.
2.  El documento guarda el ID del activo correctamente.
