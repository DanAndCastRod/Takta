# FASE 5: Excelencia Operacional (Lean & Calidad)

> **Estado**: Pendiente (Depende de Fase 4)
> **Objetivo**: Herramientas visuales y logísticas (Kanban, 5S, VSM).

---

## 📅 Sprint 9: Auditorías y Acción (Semana 9)

### 🎯 Objetivos
- Módulo de Auditorías 5S con Scoring.
- Action Tracker centralizado.

### 📋 Checklist Técnico

| Tarea | Alcance |
|-------|---------|
| Modelo de Evaluación: Pregunta → Puntaje (1-5) | **MVP** |
| Frontend: Wizard de auditoría paso a paso | **MVP** |
| Gráfico de Radar (Chart.js) comparativo | Full |
| Tablero Kanban de Tareas (Pendiente → En Proceso → Cerrado) | **MVP** |
| Creación automática desde hallazgos de auditoría ("Crear Acción") | Full |

- **Auditorías (`/api/audits`)**:
    - [ ] Modelo de Evaluación: Pregunta -> Puntaje (1-5). (**MVP**)
    - [ ] Frontend: Wizard de auditoría paso a paso. (**MVP**)
    - [ ] Visualización: Gráfico de Radar (Chart.js) comparativo (Mes anterior vs Actual). (Full)
- **Action Tracker (`/api/ci`)**:
    - [ ] Tablero Kanban de Tareas (Pendiente -> En Proceso -> Cerrado). (**MVP**)
    - [ ] Creación automática desde hallazgos de auditoría ("Crear Acción"). (Full)

---

## 📅 Sprint 10: Herramientas Visuales y Logística (Semana 10)

### 🎯 Objetivos
- Canvas VSM interactivo.
- Calculadora Kanban.

### 📋 Checklist Técnico

| Tarea | Alcance |
|-------|---------|
| Formulario Kanban (Demanda, Lead Time, Container) | **MVP** |
| Visualización fórmula y resultado Kanban | **MVP** |
| Generación de Tarjeta PDF para impresión | Full |
| Lienzo SVG para VSM (D3.js) | Full |
| Drag & Drop iconos VSM | Full |
| Cálculo automático Lead Time al conectar nodos | Full |

- **Logística Kanban (`/api/logistics`)** (**MVP**):
    - [ ] Formulario de Variables (Demanda, Lead Time, Container).
    - [ ] Visualización de la fórmula matemática y resultado.
    - [ ] Generación de Tarjeta PDF para impresión. (Full)
- **VSM Designer** (Full):
    - [ ] Lienzo SVG (D3.js o librería ligera).
    - [ ] Drag & Drop de iconos (Caja Proceso, Triangulo Inventario).
    - [ ] Cálculo automático de Lead Time al conectar nodos.

### 🧪 Criterios de Aceptación
1.  El gráfico de Radar se renderiza correctamente con los datos de la auditoría.
2.  La calculadora Kanban arroja el número de tarjetas correcto según la fórmula oficial.
3.  El VSM Designer permite crear al menos un flujo simple de 3 nodos conectados. (Full)
