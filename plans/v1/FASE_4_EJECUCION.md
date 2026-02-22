# FASE 4: Control de Piso y Captura Móvil

> **Estado**: Pendiente (Depende de Fase 3)
> **Objetivo**: "La Tablet del Analista" y Bitácora de Producción. Registrar lo que sucede en tiempo real.

---

## 🗄️ Modelos de Datos Requeridos (Agregar a `models.py`)

> [!IMPORTANT]
> Antes de iniciar Sprint 7, se deben implementar los siguientes modelos en `backend/app/models.py`.
> Estos modelos NO existen actualmente en el codebase.

```python
# --- Execution: Production Logs ---

class ProductionLog(SQLModel, table=True):
    """Registro de eventos de producción por turno."""
    id: UUID (PK)
    asset_id: UUID (FK -> Asset)
    shift: str                    # "Mañana", "Tarde", "Noche"
    event_type: str               # "start", "end", "pause", "changeover"
    event_time: datetime
    quantity_produced: Optional[int]
    notes: Optional[str]
    operator_id: Optional[UUID] (FK -> Operator)
    created_by: str

class DowntimeEvent(SQLModel, table=True):
    """Registro de paros y novedades."""
    id: UUID (PK)
    asset_id: UUID (FK -> Asset)
    downtime_type: str            # "Mecánico", "Eléctrico", "Calidad", "Cambio de Ref", "Programado"
    start_time: datetime
    end_time: Optional[datetime]
    duration_minutes: Optional[float]
    root_cause: Optional[str]
    diagnosis: Optional[str]      # Campo llenado por Voice-to-Text
    reported_by: str

# --- Execution: Staff Management ---

class Operator(SQLModel, table=True):
    """Hoja de vida operativa del personal."""
    id: UUID (PK)
    employee_code: str (unique)
    full_name: str
    default_area_id: Optional[UUID] (FK -> Asset)  # Área asignada por defecto
    shift: str                    # "Mañana", "Tarde", "Noche", "Rotativo"
    is_active: bool = True
    hire_date: Optional[date]
    restrictions: Optional[str]   # Restricciones médicas/ergonómicas

class OperatorSkill(SQLModel, table=True):
    """Matriz de polivalencia: qué sabe hacer cada operario."""
    id: UUID (PK)
    operator_id: UUID (FK -> Operator)
    activity_id: UUID (FK -> StandardActivity)
    skill_level: int              # 1=Aprendiz, 2=Competente, 3=Experto, 4=Puede enseñar
    certified_date: Optional[date]
```

---

## 📅 Sprint 7: Captura Móvil & Bitácora (Semana 7)

### 🎯 Objetivos
- Interfaz Touch-First para tablets.
- Registro de Novedades (Paros, Inicios, Cambios).
- Funcionalidad de Voz-a-Texto para Mantenimiento.

### 📋 Checklist Técnico

| Tarea | Alcance |
|-------|---------|
| Implementar modelos `ProductionLog` y `DowntimeEvent` | **MVP** |
| Layout móvil simplificado (botones > 48px) | **MVP** |
| Bitácora de Producción (Timeline de turno) | **MVP** |
| Formulario de Novedad (Tipo Paro, Tiempo, Comentario) | **MVP** |
| Dictado por Voz (Web Speech API) | Full |
| Contexto Automático (inferir Área por usuario) | Full |

- **Backend Modelos** (Requisito previo):
    - [ ] Implementar `ProductionLog` en `models.py`. (**MVP**)
    - [ ] Implementar `DowntimeEvent` en `models.py`. (**MVP**)
    - [ ] Agregar relaciones a `Asset` model. (**MVP**)
- **Frontend Móvil (`/mobile`)**:
    - [ ] Layout simplificado (Botones grandes, contraste alto). (**MVP**)
    - [ ] **Bitácora de Producción**: Timeline de eventos del turno. (**MVP**)
    - [ ] **Reporte de Novedad**: Formulario rápido (Tipo de Paro, Tiempo, Comentario). (**MVP**)
    - [ ] **Dictado por Voz**: Integración de Web Speech API para llenar el campo "Diagnóstico/Comentario" automáticamente. (Full)
- **Backend Ejecución (`/api/execution`)**:
    - [ ] CRUD `ProductionLog` (POST, GET por turno/fecha). (**MVP**)
    - [ ] CRUD `DowntimeEvent` (POST, GET, PATCH para cerrar evento). (**MVP**)
    - [ ] Contexto Automático: Endpoint que infiere el Área según el usuario logueado. (Full)

---

## 📅 Sprint 8: Gestión de Personal Operativo (Semana 8)

### 🎯 Objetivos
- Hoja de Vida Operativa.
- Matriz de Polivalencia (Skills).

### 📋 Checklist Técnico

| Tarea | Alcance |
|-------|---------|
| Implementar modelos `Operator` y `OperatorSkill` | **MVP** |
| API CRUD de Personal y Habilidades | **MVP** |
| Selector de Operarios en inicio de turno | **MVP** |
| Visualización de disponibilidad | Full |
| Asignación de Turno (Operador ↔ Puesto) | Full |

- **Backend Modelos** (Requisito previo):
    - [ ] Implementar `Operator` en `models.py`. (**MVP**)
    - [ ] Implementar `OperatorSkill` en `models.py`. (**MVP**)
- **Gestión de Personal (`/api/execution/staff`)**:
    - [ ] CRUD `Operator` (POST, GET, PATCH). (**MVP**)
    - [ ] CRUD `OperatorSkill` — Asignar/actualizar habilidades de un operario. (**MVP**)
    - [ ] Asignación de Turno: Relación `Operator` <-> `Workstation`. (Full)
- **Frontend**:
    - [ ] Selector de Operarios en inicio de turno. (**MVP**)
    - [ ] Visualización de disponibilidad (Quién está en planta). (Full)
    - [ ] Matriz de Polivalencia: Tabla cruzada Operario × Actividad con niveles de color. (Full)

### 🧪 Criterios de Aceptación
1.  Se puede registrar un evento de paro y cerrarlo con duración calculada automáticamente. (**MVP**)
2.  El dictado por voz transcribe correctamente un diagnóstico técnico de al menos 20 palabras. (Full)
3.  El sistema sugiere automáticamente el Área correcta cuando un supervisor se loguea. (Full)
4.  La interfaz móvil es navegable con guantes (botones > 48px). (**MVP**)
