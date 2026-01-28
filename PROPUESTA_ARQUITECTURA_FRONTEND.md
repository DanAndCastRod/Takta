# Propuesta de Arquitectura Frontend: OAC-SEO

Esta propuesta define la estrategia de diseño e implementación del Frontend para el Sistema de Estandarización Operativa, priorizando la usabilidad en planta, la densidad de información para ingenieros y la integración fluida con la arquitectura FullStack (FastAPI).

---

## 🏛️ 1. Filosofía de Diseño: "Engineer-First" UX

El usuario principal es un ingeniero o supervisor técnico que necesita **eficiencia** y **claridad**.

*   **Alta Densidad de Datos**: Preferimos tablas compactas y dashboards ricos en métricas sobre diseños con mucho espacio en blanco excesivo ("Whitespace").
*   **Navegación Contextual**: La navegación principal no es por "Módulos" (Calidad, Tiempos), sino por **Activos** (Planta > Línea > Máquina). El contexto del activo dicta qué herramientas están disponibles.
*   **Feedback Inmediato**: Cada acción (guardar un tiempo, mover un ícono en VSM) debe tener feedback visual instantáneo (Toasts, Spinners), crucial en entornos de planta con conectividad variable.
*   **Estética Corporativa**: Uso estricto del **Bios Design System** (Colores Petróleo, Tipografía DM Sans) para transmitir confianza y oficialidad.

---

## 🛠️ 2. Stack Tecnológico Frontend

Arquitectura "Thin Client" pero rica en interactividad, servida por FastAPI y renderizada en navegador.

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| **Core** | **Vanilla JS (ES6+)** | Ligero, sin build steps complejos, fácil de mantener por cualquier dev. |
| **UI Framework** | **Bootstrap 5 + Bios Design System** | Estándar corporativo, responsive, grid robusto. |
| **Templating** | **Jinja2 (Server-Side)** + **Componentes JS** | Jinja para la estructura base SEO-friendly; JS para la interactividad. |
| **State Mgmt** | **Pub/Sub (Custom Simple Store)** | Patrón de observador ligero para manejar el estado global (Activo Seleccionado, Usuario) sin React/Redux. |
| **Documentación** | **Editor.js (V2)** | Edición de bloques estructurada, salida JSON limpia, fácil integración de plugins (Tablas, Alertas). |
| **Gráficos** | **Chart.js / Apache ECharts** | Visualización de KPIs y series de tiempo (Rendimiento). |
| **Diagramación** | **GoJS / D3.js** | Librerías potentes para renderizar Árboles de Activos y VSMs interactivos (Drag & Drop). |

---

## 🧩 3. Arquitectura de Componentes (Atomic Design)

Mapeo de los componentes del Design System a la lógica de negocio.

### Átomos (Bios Design System)
*   **Botones**: `btn-gb-petroleo1` (Primario), `btn-gb-naranja` (Alerta).
*   **Inputs**: `form-control`, `gb-datepicker`.
*   **Feedback**: `spinner-border`, `toast`, `sweetalert2`.

### Moléculas (Componentes Reutilizables)
*   **`AssetSelector`**: Dropdown o Buscador predictivo para cambiar de máquina/línea rápidamente.
*   **`KPICard`**: Tarjeta con Título, Valor, Delta (%) y mini-sparkline.
*   **`UserAvatar`**: Indicador de usuario logueado con rol.
*   **`StatusBadge`**: Pill de estado (Borrador, Tránsito, Aprobado).

### Organismos (Módulos Funcionales)
*   **`AssetTreeNavigator`**: Sidebar izquierdo colapsable que renderiza la jerarquía completa. Mantiene el estado del nodo activo.
*   **`DocumentEditor`**: Wrapper de Editor.js que maneja la carga/guardado de Templates y Datos.
*   **`TimeStudyTable`**: Tabla interactiva tipo Excel para el ingreso rápido de ciclos de cronometraje.
*   **`VSMCanvas`**: Área de dibujo SVG para el Value Stream Map.

### Plantillas (Layouts)
*   **`MainLayout`**: `Navbar` + `Sidebar` + `ContentArea`.
*   **`FocusMode`**: Layout sin sidebar/header para tares de inmersión (ej. Toma de Tiempos en Tablet).

---

## 🔄 4. Flujos de Usuario Críticos (UX)

### A. La Experiencia "Navegar la Planta"
1.  **Entrada**: Usuario aterriza en el Dashboard General.
2.  **Contexto**: Usa el `AssetTreeNavigator` y selecciona "Línea de Trozado 1".
3.  **Reacción**: El contenido central se actualiza. Muestra KPIs de *esa* línea, documentos asociados y accesos directos a "Toma de Tiempos" o "Ver VSM".
    *   *Toda la data filtrada por `asset_id` automáticamente.*

### B. Creación de un Estándar (Documentación)
1.  **Acción**: Click en "Nuevo Documento" > Selecciona "Lección de Un Punto (LUP)".
2.  **Carga**: Se instancia el `DocumentEditor` con el Template JSON del LUP (Imagen principal + 3 puntos clave).
3.  **Edición**: Usuario arrastra imagen, escribe texto. Autosave cada 30s.
4.  **Vinculación**: Al guardar, el usuario etiqueta la **Actividad** (ej. "Afilado") y la **Referencia** (ej. "Cuchillo Curvo") asociada.

### C. Toma de Tiempos (Mobile/Tablet First)
1.  **Modo**: Se activa layout `FocusMode` para maximizar botones en pantalla táctil.
2.  **Interacción**: Botón GIGANTE "Vuelta" (Lap) para registrar el fin de ciclo sin mirar la pantalla.
3.  **Feedback**: Sonido discreto o vibración al registrar vuelta.
4.  **Cierre**: Al finalizar n ciclos, muestra resumen estadístico inmediato (Promedio, Desviación).

---

## 🔌 5. Integración Frontend-Backend

### API Client Wrapper
Una clase JS estática `TaktaAPI` que centraliza los `fetch` a FastAPI.
*   Manejo automático de Headers (Token JWT).
*   Transformación de respuestas (Snake_case -> CamelCase si es necesario).
*   Manejo unificado de errores (401 -> Redirect Login, 403 -> SweetAlert "No autorizado", 500 -> Toast "Error servidor").

### Server-Side Rendering (SSR) vs. Client-Side Rendering (CSR)
*   **Híbrido Inteligente**: FastAPI sirve el HTML base (SSR) con la data inicial "sembrada" en una variable `window.INITIAL_CONTEXT` (JSON). Esto hace que la carga inicial sea instantánea (FCP bajo).
*   La interactividad posterior (cambiar de activo, filtrar fechas) se hace via AJAX/Fetch (CSR) actualizando solo el DOM necesario.

---

## 📅 Roadmap de Implementación UI

1.  **Semana 1**: Setup de `MainLayout` y `AssetTreeNavigator` (Mock Data). Definición de colores y tipografía CSS base.
2.  **Semana 2**: Implementación de `DocumentEditor` (Editor.js) integrada con el Backend.
3.  **Semana 3**: Implementación de `TimeStudyTable` y lógica de cronómetro JS.
4.  **Semana 4**: Prototipo de `VSMCanvas` (Drag & drop básico).
