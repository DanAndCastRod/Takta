# FASE 3: Motor de Ingeniería (Estándares, Tiempos y Capacidad)

> **Estado**: Pendiente (Depende de Fase 1)
> **Objetivo**: Implementar la lógica matemática para cálculo de Tiempos Estándar (Basado en **Benjamin Nievel**), gestión de la "Triada", y Motor de Capacidad Jerárquica.

---

## 📅 Sprint 5: Gestión de Estándares (Semana 5)

### 🎯 Objetivos
- CRUD de la "Triada": Activo + Actividad + SKU.
- Catálogos Maestros (Referencias y Actividades).

### 📋 Checklist Técnico

| Tarea | Alcance |
|-------|---------|
| API CRUD de Estándares (POST/GET/PATCH) | **MVP** |
| Vista Catálogo de Referencias | **MVP** |
| Vista Configuración Activo + pestaña Estándares | **MVP** |
| Modal Asignar Actividad (select dependiente) | **MVP** |

- **API (`/api/engineering/standards`)**:
    - [ ] `POST`: Crear nuevo estándar (Verificar unicidad). (**MVP**)
    - [ ] `GET`: Listar estándares por Activo. (**MVP**)
    - [ ] `PATCH`: Activar/Desactivar estándar. (**MVP**)
- **Frontend Gestión**:
    - [ ] Vista "Catálogo de Referencias": Tabla con búsqueda y creación de SKUs. (**MVP**)
    - [ ] Vista "Configuración Activo": Pestaña "Estándares" dentro del detalle de máquina. (**MVP**)
    - [ ] Modal "Asignar Actividad": Select dependiente (Tipo Actividad -> Referencia). (**MVP**)

---

## 📅 Sprint 5.5: Motor de Capacidad y Staffing (Semana 5-6)

> **Nota**: Este sprint se ejecuta en paralelo con Sprint 6 (Cronometraje) dado que
> el `CapacityEngine` ya tiene una implementación base en `backend/app/services/capacity_engine.py`.

### 🎯 Objetivos
- Modelado de Puestos de Trabajo (Manuales/Mecánicos) con capacidad parametrizable.
- Cálculo de Tripulación (Staffing) basado en Demanda vs Takt Time.
- Rollup jerárquico de Capacidad (Máquina → Línea → Área → Planta).

### 📋 Checklist Técnico

| Tarea | Alcance |
|-------|---------|
| Motor de Capacidad (`CapacityEngine`) recursivo | **MVP** ✅ (Implementado) |
| API `/api/capacity/{asset_id}` | **MVP** ✅ (Implementado) |
| Configuración de Puestos (Manual/Mecánico, velocidad, turnos) | **MVP** |
| Frontend: Calculadora de Tripulación (Staffing) | **MVP** |
| Grafos de Precedencia (NetworkX) — Restricciones de secuencia | Full |
| Frontend: Visualización de cuello de botella por línea | Full |

- **Backend Capacidad (`/api/capacity`)**:
    - [x] `CapacityEngine.calculate_asset_capacity()` — Rollup recursivo por Bottleneck. (**MVP** ✅)
    - [x] Endpoint `GET /api/capacity/{asset_id}`. (**MVP** ✅)
    - [ ] Endpoint `GET /api/capacity/{asset_id}/staffing` — Cálculo de personal requerido dado un volumen de demanda. (**MVP**)
    - [ ] Soporte para unidades parametrizables (kg/h, und/h, cajas/h). (**MVP**)
    - [ ] Grafos de Precedencia (`networkx`) para modelar restricciones de secuencia entre puestos. (Full)
- **Frontend Capacidad**:
    - [ ] Vista "Configuración de Puesto": Tipo (Manual/Mecánico), Velocidad, Turnos. (**MVP**)
    - [ ] Calculadora de Tripulación: Input (Demanda diaria, Horas turno) → Output (# Personas). (**MVP**)
    - [ ] Visualización de cuello de botella con semaforización por línea. (Full)

### 🧪 Criterios de Aceptación (Sprint 5.5)
1.  El rollup de capacidad calcula correctamente el bottleneck de una línea con 3+ máquinas.
2.  La calculadora de staffing sugiere un número coherente de operarios dado un volumen de demanda.

---

## 📅 Sprint 6: Cronometraje Digital y Muestreo (Semana 6)

### 🎯 Objetivos
- Interfaz de toma de tiempos en tiempo real.
- Cálculo estadístico de estándar (Eliminación de outliers).
- Herramienta de Muestreo de Trabajo (Work Sampling).

### 📋 Checklist Técnico

| Tarea | Alcance |
|-------|---------|
| Interfaz cronómetro (Lap/Stop) móvil-friendly | **MVP** |
| Contador de Unidades integrado | **MVP** |
| Tabla de ciclos en vivo + marcar Anormal | **MVP** |
| Algoritmo T. Normal y T. Estándar | **MVP** |
| Detección automática outliers | **MVP** |
| Hoja de Cronometraje (PDF/Vista) | Full |
| Muestreo de Trabajo (Productivo vs Improductivo) | Full |

- **Frontend Cronómetro**:
    - [ ] Interfaz móvil-friendly (Botones grandes "Lap", "Stop"). (**MVP**)
    - [ ] **Contador de Unidades**: Funcionalidad para conteo de ítems integrados al tiempo. (**MVP**)
    - [ ] Feedback visual de ciclo actual y acumulado. (**MVP**)
    - [ ] Tabla de ciclos en vivo (permite marcar "Anormal" manual). (**MVP**)
- **Backend Cálculo (`/api/engineering/calculate`)**:
    - [ ] Algoritmo de T. Normal: `Avg(Ciclos) * Rating`. (**MVP**)
    - [ ] Algoritmo de T. Estándar: `TN * (1 + Suplementos)`. (**MVP**)
    - [ ] Detección automática de desviaciones (Ciclos > 2 * Promedio). (**MVP**)
- **Muestreo de Trabajo** (Full):
    - [ ] Interfaz para estudios de frecuencia (Productivo vs Improductivo).
    - [ ] Configuración de intervalos aleatorios de observación.
    - [ ] Cálculo de % de ocupación con intervalo de confianza.
- **Reporte**:
    - [ ] Generación de "Hoja de Cronometraje" (PDF/Vista) con gráfico de ciclos. (Full)

### 🧪 Criterios de Aceptación
1.  El cronómetro funciona sin lag en una tablet de planta.
2.  El cálculo del estándar excluye automáticamente ciclos marcados como anormales.
3.  El muestreo genera un reporte con % productivo/improductivo y tamaño de muestra requerido. (Full)
