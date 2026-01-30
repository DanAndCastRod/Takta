# FASE 4: Control de Piso y Captura Móvil

> **Estado**: Pendiente
> **Objetivo**: "La Tablet del Analista" y Bitácora de Producción. Registrar lo que sucede en tiempo real.

---

## 📅 Sprint 7: Captura Móvil & Bitácora (Semana 7)

### 🎯 Objetivos
- Interfaz Touch-First para tablets.
- Registro de Novedades (Paros, Inicios, Cambios).
- Funcionalidad de Voz-a-Texto para Mantenimiento.

### 📋 Checklist Técnico
- **Frontend Móvil (`/mobile`)**:
    - [ ] Layout simplificado (Botones grandes, contraste alto).
    - [ ] **Bitácora de Producción**: Timeline de eventos del turno.
    - [ ] **Reporte de Novedad**: Formulario rápido (Tipo de Paro, Tiempo, Comentario).
    - [ ] **Dictado por Voz**: Integración de Web Speech API para llenar el campo "Diagnóstico/Comentario" automáticamente.
- **Backend Ejecución (`/api/execution`)**:
    - [ ] Integración de Logs con la "Triada" (Activo + Actividad).
    - [ ] Contexto Automático: Endpoint que infiere el Área según el usuario logueado.

---

## 📅 Sprint 8: Gestión de Personal Operativo (Semana 8)

### 🎯 Objetivos
- Hoja de Vida Operativa.
- Matriz de Polivalencia (Skills).

### 📋 Checklist Técnico
- **Gestión de Personal (`/api/execution/staff`)**:
    - [ ] Modelo `Operator`: Habilidades, Turno, Restricciones.
    - [ ] Asignación de Turno: Relación `Operator` <-> `Workstation`.
- **Frontend**:
    - [ ] Selector de Operarios en inicio de turno.
    - [ ] Visualización de disponibilidad (Quién está en planta).

### 🧪 Criterios de Aceptación
1.  El dictado por voz transcribe correctamente un diagnóstico técnico de al menos 20 palabras.
2.  El sistema sugiere automáticamente el Área correcta cuando un supervisor se loguea.
3.  La interfaz móvil es navegable con guantes (botones > 48px).
