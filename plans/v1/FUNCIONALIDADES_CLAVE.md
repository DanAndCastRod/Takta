# Funcionalidades Clave: Takta (Open Source)

> Este documento define el núcleo funcional de Takta para su liberación como herramienta Open Source orientada a ingenieros industriales, analistas de procesos y gerentes de planta — transferible a contextos de servucción.

## 1. Gestión de Activos y Jerarquía (The Factory Twin)
**Definición**: Modelado digital de la estructura productiva o de servicio.
**Necesidad que cubre**: Elimina la desconexión entre los documentos y la realidad física/operativa.
*   **Jerarquía Flexible**: Sede > Planta > Área > Puesto de Trabajo (Máquina o Manual).
*   **Ficha de Vida**: Hoja de vida digital del activo (especificaciones, fecha de compra, ubicación).
*   **Mapas Interactivos**: Editor de planos (PlantaEditor — [spec](PLANT_EDITOR.md)) con capas funcionales: semaforización de estándares, mapas de calor, flujos de proceso.

**Sprint**: 1 (Backend) + 2 (Frontend) — **✅ Completado**

## 2. Motor Documental (Knowledge Engine)
**Definición**: Digitalización del "Know-How" operativo.
**Necesidad que cubre**: Centraliza SOPs, LUPs y formatos de ingeniería como datos vivos editables, vinculados al activo.
*   **Ingesta de Plantillas**: 62 templates Markdown organizados por categoría (BPM, Lean, TPM, 6S, Kaizen, Kanban).
*   **Editor.js**: Editor de bloques con plugins (Header, List, Table, Warning, Delimiter, Quote, Marker, Image).
*   **Vinculación**: Cada documento queda asociado a un Activo y a un Template.

**Sprint**: 3 (Backend) + 4 (Frontend) — **✅ Completado**

## 3. Motor de Estandarización (The Standard Engine)
**Definición**: Sistema para definir CÓMO se hace el trabajo.
**Necesidad que cubre**: Centraliza los tiempos estándar en una única fuente de verdad.
*   **La Triada**: Relación única `Activo + Actividad + SKU`.
*   **Gestor de Actividades**: Catálogo de operaciones (Transporte, Inspección, Operación, Demora, Almacenamiento).
*   **Documentación Viva**: Asociación de guías (Editor.js) a la Triada.

**Sprint**: 5

## 4. Ingeniería de Métodos y Tiempos (Cronómetro Preconfigurable)
**Definición**: Herramientas para medir y optimizar el trabajo.
**Necesidad que cubre**: Reemplaza el cronómetro físico y las plantillas de Excel dispersas.
*   **Referencia Metodológica**: Basado en formatos de **Benjamin Nievel** (Métodos, Estándares y Diseño del Trabajo).
*   **Cronómetro Preconfigurable**: Estudios con elementos pre-mapeados. Captura de Splits (re-observar) y Laps (avanzar al siguiente elemento). Contador de unidades integrado.
*   **Cálculo de Tiempos**: Algoritmos para `Tiempo Observado -> Tiempo Normal -> Tiempo Estándar` (con Factores de Calificación y Suplementos).
*   **Muestreo de Trabajo**: Estudios de frecuencia (Productivo vs Improductivo).

**Sprint**: 6

## 5. Gestión de Capacidad y Balanceo
**Definición**: Cálculo de la capacidad instalada y requerida.
**Necesidad que cubre**: Permite responder "¿Cuánto puedo producir?" y "¿Cuánta gente necesito?".
*   **Motor de Capacidad**: Definición de unidades (kg/h, und/h) parametrizables. Rollup automático por bottleneck.
*   **Cálculo de Tripulación (Staffing)**: Estimación de personal necesario basado en Demanda vs Takt Time.
*   **Rollup de Capacidad**: Agregación automática desde el puesto de trabajo hasta el área.

**Sprint**: 5.5 (parcialmente implementado — `CapacityEngine` ✅)

## 6. Ejecución y Bitácora (Shop Floor / Service Floor)
**Definición**: Registro de lo que sucede en tiempo real (o casi real).
**Necesidad que cubre**: Trazabilidad de la producción/servicio y las paradas.
*   **Bitácora de Producción**: Registro de inicio/fin de órdenes.
*   **Registro de Paros**: Captura de eventos de pérdida de disponibilidad.
*   **Dictado por Voz**: Funcionalidad de voz-a-texto para registrar diagnósticos sin escribir.
*   **Contexto Automático**: Inferencia de Área/Puesto basado en el usuario logueado.

**Sprint**: 7-8

## 7. Mejora Continua (Kaizen Loop)
**Definición**: Gestión de hallazgos y acciones correctivas.
**Necesidad que cubre**: Evita que las acciones de mejora se pierdan en correos o actas de reunión.
*   **Action Tracker**: Kanban de tareas de mejora (Pendiente -> En Progreso -> Cerrado).
*   **Auditorías 5S**: Listas de chequeo configurables para Gemba Walks.
*   **VSM Designer**: Lienzo visual para mapeo de flujo de valor.
*   **Calculadora Kanban**: Fórmula parametrizable + generación de tarjetas.

**Sprint**: 9-10

## 8. Visualización de Planta (PlantaEditor)
**Definición**: Editor interactivo de planos de planta industrial con capas funcionales.
**Necesidad que cubre**: Proporciona contexto espacial y visual a los datos operativos.
*   **Canvas Fabric.js**: Importación SVG/Draw.io, zoom/pan, serialización JSON.
*   **Capas Funcionales**: Base (plano fondo), Zonas (polígonos), Assets (vinculados a IDs), Connections (flujos), Heatmaps (D3.js).
*   **Vinculación**: Click en máquina → Ficha técnica del activo. Click en zona → KPIs del área.

**Sprint**: Transversal (desarrollo incremental) — ver [spec completa](PLANT_EDITOR.md)

---

## Estrategia Técnica
*   **Stack Frontend**: HTML5 + **TailwindCSS** + Vanilla JS (Vite). Filosofía "Modern Industrial Glass".
*   **Stack Backend**: Python (FastAPI) + SQLModel.
*   **Base de Datos**: SQLite (por defecto) / PostgreSQL / SQL Server.
*   **Infraestructura**: Ejecución local (Script Python). Sin dependencias cloud obligatorias.
*   **Testing**: pytest (backend) + Vitest (frontend).
*   **Diseño**: [Guía de Diseño](../../frontend/guia_diseno.md)
