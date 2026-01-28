# T01 - Solicitud de Desarrollo

## Información General

| Campo | Valor |
|-------|-------|
| **Título** | Sistema de Estandarización Operativa (OAC-SEO) |
| **Fecha** | 2026-01-22 |
| **Solicitante** | Daniel Castaneda (Ingeniería de Procesos / TD) |
| **Área** | Transformación Digital / Operaciones Avícola |
| **Email** | daniel.castaneda@grupobios.co |
| **Prioridad** | ⬜ Crítica ✅ Alta ⬜ Media ⬜ Baja |

---

## 1. Descripción de la Necesidad

> Describa el problema o necesidad que desea resolver con este desarrollo.

Existe una brecha significativa entre la **Ingeniería de Procesos** (piso de planta) y la **Transformación Digital** (estrategia de datos) en Operadora Avícola Colombia. La documentación técnica actual es estática ("letra muerta") y no permite una gestión dinámica de los estándares operativos. Se requiere un sistema que digitalice el "Deber Ser" técnico, permitiendo la gestión estructurada de:
1.  Jerarquía de Activos (Asset Hierarchy).
2.  Procedimientos Operativos Estándar (SOPs).
3.  Estudios de Tiempos y Movimientos (Cálculo de Tiempo Estándar).
4.  Balanceo de Líneas y detección de cuellos de botella.
5.  Visualización de Flujos de Valor (VSM) y desperdicios.

---

## 2. Justificación de Negocio

> ¿Por qué es importante este desarrollo? ¿Qué beneficios traerá?

Este desarrollo es crítico para la recuperación financiera y la optimización operativa. Sus beneficios incluyen:
*   **Reducción de Variabilidad:** Al definir y monitorear el estándar técnico, se estabilizan los procesos.
*   **Optimización de Costos:** Cálculo automático de costos de mano de obra por unidad y optimización de balanceo de líneas.
*   **Visibilidad Financiera:** Detección clara de "Mudas" (desperdicios) a través de VSM digitales.
*   **Base para el Futuro:** Estructura los datos necesarios para implementar Gemelos Digitales y simulaciones de escenarios ("¿Qué pasa si...?").
*   **Cultura de Mejora:** Facilita la adopción de Kaizen y 5S mediante herramientas digitales de auditoría.

---

## 3. Usuarios Impactados

- **Áreas beneficiadas**: Ingeniería de Procesos, Producción (Plantas de Beneficio), Calidad, Mantenimiento.
- **Número estimado de usuarios**: 50+ (Ingenieros, Supervisores, Gerentes de Planta).
- **Perfil de usuarios**: Personal técnico y administrativo con necesidad de acceso a información de estándares en piso y oficina.

---

## 4. Alcance Esperado

### Incluye:
### Incluye:
- **Gestión de Activos:** Modelado de árbol de dependencias (Sede > Área > Línea > Máquina).
- **Gestión de Actividades y Referencias:** Catálogo centralizado de SKUs y Actividades Estándar interrelacionadas.
- **Ingeniería de Métodos (Work Measurement):** Cronometraje digital, Cálculo de Estándares, Balanceo de Líneas.
- **Excelencia Operacional (Lean):** Gestión de VSM, Planes A3, Kaizen Newspaper y Action Tracker centralizado.
- **Calidad y Cultura (Auditorías):** Módulo de auditorías 5S con scoring, Radares y gestión de hallazgos.
- **Logística de Planta (Kanban):** Calculadora de Loops, Dimensionamiento de Supermercados y Tableros Heijunka.
- **Gestión Documental:** Motor de renderizado de plantillas Markdown/JSON (SOPs, Lecciones de un Punto).

### No incluye:
- Control automático de maquinaria (SCADA/PLC) en esta primera etapa (solo integración de lectura de contadores).
- Funcionalidades completas de ERP transacciónal (foco en ingeniería y operaciones).

---

## 5. Información Adicional

### ¿Existe algún sistema similar actualmente?
No centralizado. Actualmente se maneja en archivos dispersos (Excel, PDF) sin interconexión ni trazabilidad.

### ¿Hay fecha límite específica?
Definido por el cronograma del Plan Maestro de Implementación (Fases 1 a 5).

### Adjuntos
- [x] Mockups / Bocetos (Ver `plan.md`)
- [x] Documentos de referencia (Plan Maestro OAC-SEO)
- [ ] Datos de prueba

---

## Para uso interno TD

| Campo | Valor |
|-------|-------|
| **ID Solicitud** | SOL-2026-001 |
| **Recibido por** | |
| **Fecha recepción** | |
| **Equipo asignado** | ✅ Analítica ✅ IoT |
