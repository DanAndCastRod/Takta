# FASE 5: Excelencia Operacional (Lean & Calidad)

> **Estado**: Pendiente
> **Objetivo**: Herramientas visuales y logísticas (Kanban, 5S, VSM).

---

## 📅 Sprint 7: Auditorías y Acción (Semana 7)

### 🎯 Objetivos
- Módulo de Auditorías 5S con Scoring.
- Action Tracker centralizado.

### 📋 Checklist Técnico
- **Auditorías (`/api/audits`)**:
    - [ ] Modelo de Evaluación: Pregunta -> Puntaje (1-5).
    - [ ] Frontend: Wizard de auditoría paso a paso.
    - [ ] Visualización: Gráfico de Radar (Chart.js) comparativo (Mes anterior vs Actual).
- **Action Tracker (`/api/ci`)**:
    - [ ] Tablero Kanban de Tareas (Pendiente -> En Proceso -> Cerrado).
    - [ ] Creación automática desde hallazgos de auditoría ("Crear Acción").

---

## 📅 Sprint 8: Herramientas Visuales y Logística (Semana 8)

### 🎯 Objetivos
- Canvas VSM interactivo.
- Calculadora Kanban.

### 📋 Checklist Técnico
- **VSM Designer**:
    - [ ] Lienzo SVG (D3.js o librería ligera).
    - [ ] Drag & Drop de iconos (Caja Proceso, Triangulo Inventario).
    - [ ] Cálculo automático de Lead Time al conectar nodos.
- **Logística Kanban (`/logistics`)**:
    - [ ] Formulario de Variables (Demanda, Lead Time, Container).
    - [ ] Visualización de la fórmula matemática y resultado.
    - [ ] Generación de Tarjeta PDF para impresión.

### 🧪 Criterios de Aceptación
1.  El gráfico de Radar se renderiza correctamente con los datos de la auditoría.
2.  La calculadora Kanban arroja el número de tarjetas correcto según la fórmula oficial.
