# FASE 3: Motor de Ingeniería (Estándares y Tiempos)

> **Estado**: Pendiente (Depende de Fase 1)
> **Objetivo**: Implementar la lógica matemática para cálculo de Tiempos Estándar y gestión de la "Triada".

---

## 📅 Sprint 5: Gestión de Estándares (Semana 5)

### 🎯 Objetivos
- CRUD de la "Triada": Activo + Actividad + SKU.
- Catálogos Maestros (Referencias y Actividades).

### 📋 Checklist Técnico
- **API (`/api/engineering/standards`)**:
    - [ ] `POST`: Crear nuevo estándar (Verificar unicidad).
    - [ ] `GET`: Listar estándares por Activo.
    - [ ] `PATCH`: Activar/Desactivar estándar.
- **Frontend Gestión**:
    - [ ] Vista "Catálogo de Referencias": Tabla con búsqueda y creación de SKUs.
    - [ ] Vista "Configuración Activo": Pestaña "Estándares" dentro del detalle de máquina.
    - [ ] Modal "Asignar Actividad": Select dependiente (Tipo Actividad -> Referencia).

---

## 📅 Sprint 6: Cronometraje Digital (Semana 6)

### 🎯 Objetivos
- Interfaz de toma de tiempos en tiempo real.
- Cálculo estadístico de estándar (Eliminación de outliers).

### 📋 Checklist Técnico
- **Frontend Cronómetro**:
    - [ ] Interfaz móvil-friendly (Botones grandes "Lap", "Stop").
    - [ ] Feedback visual de ciclo actual y acumulado.
    - [ ] Tabla de ciclos en vivo (permite marcar "Anormal" manual).
- **Backend Cálculo (`/api/engineering/calculate`)**:
    - [ ] Algoritmo de T. Normal: `Avg(Ciclos) * Rating`.
    - [ ] Algoritmo de T. Estándar: `TN * (1 + Suplementos)`.
    - [ ] Detección automática de desviaciones (Ciclos > 2 * Promedio).
- **Reporte**:
    - [ ] Generación de "Hoja de Cronometraje" (PDF/Vista) con gráfico de ciclos.

### 🧪 Criterios de Aceptación
1.  El cronómetro funciona sin lag en una tablet de planta.
2.  El cálculo del estándar excluye automáticamente ciclos marcados como anormales.
