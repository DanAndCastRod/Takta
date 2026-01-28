# Funcionalidades Clave: Takta Open Source (Community Edition)

Este documento define el núcleo funcional de Takta para su liberación como herramienta Open Source orientada a ingenieros industriales y gerentes de planta.

## 1. Gestión de Activos y Jerarquía (The Factory Twin)
**Definición**: Modelado digital de la estructura productiva.
**Necesidad que cubre**: Elimina la desconexión entre los documentos y la realidad física. Permite organizar la información por su ubicación lógica.
*   **Jerarquía Flexible**: Planta > Área > Puesto de Trabajo (Máquina o Manual).
*   **Ficha de Vida**: Hoja de vida digital del activo (especificaciones, fecha de compra, ubicacion).

## 2. Motor de Estandarización (The Standard Engine)
**Definición**: Sistema para definir CÓMO se hace el trabajo.
**Necesidad que cubre**: Centraliza el conocimiento operativo (SOPs) y los tiempos estándar en una única fuente de verdad.
*   **La Triada**: Relación única `Activo + Actividad + SKU`.
*   **Gestor de Actividades**: Catálogo de operaciones (Transporte, Inspección, Operación, Demora).
*   **Documentación Viva**: Asociación de guías (Markdown/PDF) a la Triada.

## 3. Ingeniería de Métodos y Tiempos
**Definición**: Herramientas para medir y optimizar el trabajo.
**Necesidad que cubre**: Reemplaza el cronómetro físico y las plantillas de Excel dispersas.
*   **Cronómetro Digital**: Toma de tiempos en interfaz web/móvil.
*   **Cálculo de Tiempos**: Algoritmos para `Tiempo Observado -> Tiempo Normal -> Tiempo Estándar` (con Factores de Calificación y Suplementos).
*   **Muestreo de Trabajo**: Herramienta para estudios de frecuencia (Productivo vs Improductivo).

## 4. Gestión de Capacidad y Balanceo
**Definición**: Cálculo de la capacidad instalada y requerida.
**Necesidad que cubre**: Permite responder "¿Cuánto puedo producir?" y "¿Cuánta gente necesito?".
*   **Motor de Capacidad**: Definición de unidades (kg/h, und/h) parametrizables.
*   **Cálculo de Tripulación**: Estimación de personal necesario basado en Demanda vs Takt Time.
*   **Rollup de Capacidad**: Agregación automática desde el puesto de trabajo hasta el área.

## 5. Ejecución y Bitácora (Shop Floor)
**Definición**: Registro de lo que sucede en tiempo real (o casi real).
**Necesidad que cubre**: Trazabilidad de la producción y las paradas.
*   **Bitácora de Producción**: Registro de inicio/fin de órdenes.
*   **Registro de Paros**: Captura de eventos de pérdida de disponibilidad.

## 6. Mejora Continua (Kaizen Loop)
**Definición**: Gestión de hallazgos y acciones correctivas.
**Necesidad que cubre**: Evita que las acciones de mejora se pierdan en correos o actas de reunión.
*   **Action Tracker**: Kanban de tareas de mejora (Pendiente -> En Progreso -> Cerrado).
*   **Auditorías 5S**: Listas de chequeo configurables para Gemba Walks.

---

## Estrategia Técnica Open Source
*   **Stack Frontend**: HTML5 + **TailwindCSS** (Diseño Moderno y Agnóstico).
*   **Stack Backend**: Python (FastAPI) + SQL Model.
*   **Base de Datos**: SQLite (Por defecto) / PostgreSQL.
*   **Infraestructura**: Ejecución local (Script Python).
