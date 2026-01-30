# Plan Maestro de Implementación OAC-SEO

> **Versión**: 2.2 (Estructura Modular)
> **Fecha**: 2026-01-23
> **Estado**: Planificación Definitiva

Este documento es el **Índice Estratégico**. Para los detalles de ejecución sprint por sprint, consultar los planes de fase específicos vinculados abajo.

---

---

## 🌍 O. Estrategia Dual (Open Source & Enterprise)
Takta se desarrolla bajo un modelo "Open Core":
1.  **Takta Community (Open Source)**:
    *   **Público**: Ingenieros Industriales, PyMEs, Consultores.
    *   **Diseño**: **TailwindCSS** (Estética moderna, agnóstica de marca).
    *   **Infraestructura**: Local / On-Premise (SQLite/Postgres). Sin dependencias complejas.
2.  **Takta Enterprise (Grupo Bios)**:
    *   **Público**: Plantas de Operadora Avícola / Grupo Bios.
    *   **Diseño**: **Bios Design System** (Bootstrap 5 + Variables Corporativas).
    *   **Infraestructura**: Windows Server IIS + SQL Server + Azure AD.

## 🏛️ 1. Visión y Alcance (Business Core)

**Objetivo**: Transformar la ingeniería de planta de Operadora Avícola, pasando de "Papel Muerto" a "Datos Vivos".

### 1.1 El Problema
Hoy, un estudio de tiempos o un SOP vive en un Excel o PDF aislado. Si el proceso cambia (ej. nueva máquina), el documento queda obsoleto y desconectado de la realidad productiva.

### 1.2 La Solución Takta
Un ecosistema digital donde:
1.  **El Activo (Máquina/Línea)** es el centro del universo.
2.  **El Estándar** es un dato viviente (Triada: Activo + Actividad + SKU) que "sabe" cuánto debe tardar y cómo debe hacerse.
3.  **La Mejora (Kaizen)** es trazable desde el hallazgo hasta el cierre.
4.  **La Ejecución (Trazabilidad)**: Registro digital en tiempo real de qué pasó, cuándo y quién lo hizo.
5.  **La Inteligencia (Capacidad)**: Modelado flexible de planta (Puestos con/sin máquina) y cálculo dinámico de tripulaciones óptimas.

---

## 🧩 2. Estructura del Proyecto (Roadmap de Fases)

El desarrollo se ha dividido en 5 fases secuenciales para asegurar entregables de valor incremental.

### [FASE 1: Fundamentos y Datos Maestros](FASE_1_FUNDAMENTOS.md)
> **Semana 1-2**
> Establecimiento del "Sistema Nervioso" del proyecto.
- **Backend**: Configuración FastAPI, SQLModel Recursivo (Árbol de Activos).
- **Frontend**: Layout Corporativo, Navegador de Planta (Sidebar), **Visor de Planos Interactivos (Draw.io/SVG Integration)**.

### [FASE 2: Motor Documental](FASE_2_DOCUMENTAL.md)
> **Semana 3-4**
> Digitalización del "Know-How" (SOPs, LUPs).
- **Backend**: Ingesta de Templates Markdown, Almacenamiento JSON.
- **Frontend**: Integración de **Editor.js**, Renderizado dinámico de formatos.

### [FASE 3: Motor de Ingeniería Avanzada](FASE_3_INGENIERIA.md)
> **Semana 5-6**
> Medición, Estandarización (Metodología Nievel) y Modelado de Restricciones (Capacidad y Flujo).
- **Backend**: Lógica de "Triada", Grafos de Precedencia (NetworkX), Motor de Capacidad Jerárquica (Rollup Automático).
- **Frontend**: Cronómetro Digital (con conteo de unidades), Configuración de Puestos (Manuales/Mecánicos), Calculadora de Tripulación (Staffing).

### [FASE 4: Control de Piso y Captura Móvil](FASE_4_EJECUCION.md)
> **Semana 7-8**
> "La Tablet del Analista" y Bitácora de Producción.
- **Backend**: API de Registros (Logs), Gestión de Personal Operativo (Skills/Turnos).
- **Frontend**: Interfaz Móvil (Touch-First), Captura de Muestreos y Paros, **Dictado por Voz (Voice-to-Text)** para bitácora de mantenimiento.

### [FASE 5: Excelencia Operacional](FASE_5_EXCELENCIA.md)
> **Semana 9-10**
> Herramientas de Mejora Continua y Calidad.
- **Backend**: Action Tracker, Scoring de Auditorías, Calculadora Kanban.
- **Frontend**: Canvas VSM interactivo, Gráficos Radar 5S, Tableros Kanban.

---

## 🛠️ 3. Arquitectura Técnica (Referencia)

### Backend (Puerto 9003)
*   **Framework**: FastAPI.
*   **BD**: SQL Server (`Takta`).
*   **API Modules**: `assets`, `engineering` (Time/Capacity), `execution` (Staff/Logs), `ci`, `audits`.

### Frontend
### Frontend (Dual Strategy)
*   **Open Source**: TailwindCSS + Vanilla JS (Moderno, Ligero).
*   **Enterprise**: Bios Design System (Bootstrap) (Corporativo).
*   **Common Core**: La lógica de negocio JS se comparte donde es posible.
*   **Mobile**: PWA / Touch-optimized views for Analysts.
*   **Integraciones Visuales**: Renderizado de Mapas `draw.io` con Capas (Layers) de información (Calor, Estado).
*   Componentes Clave: `AssetTree`, `DocumentEditor`, `VSMCanvas`, `StaffingCalculator`, `PlantMapViewer`.

---

## ✅ Checklist Global de Éxito
1.  **Centralización**: Todo formato vive en la App, vinculado a un Activo.
2.  **Interconexión**: Auditoría 5S -> Crea Tarea -> Tarea se cierra -> Actualiza KPI.
3.  **Usabilidad**: Carga del Árbol < 1s.
