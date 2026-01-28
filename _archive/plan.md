Este es un Plan Maestro de Implementación diseñado para cerrar la brecha entre la **Ingeniería de Procesos** (piso de planta) y la **Transformación Digital** (estrategia de datos), enfocado en la recuperación financiera de **Operadora Avícola Colombia**.

El plan se divide en 5 fases lógicas, desde la estructuración de datos hasta la optimización avanzada.

---

# Plan Maestro de Implementación: Sistema de Estandarización Operativa (OAC-SEO)

## Fase 1: Arquitectura de la Información y "Esqueleto Digital"

**Objetivo:** Crear la estructura de datos relacional que servirá de base para la aplicación y futuros gemelos digitales. Sin esto, la documentación será "letra muerta".

1. **Levantamiento de la Jerarquía de Activos (Asset Hierarchy):**
* Definición del árbol de dependencias:
`Sede (Granja/Planta/Logística) > Área/Zona > Línea de Producción > Máquina/Activo > Puesto de Trabajo`.
* **Acción Digital:** Crear los modelos en la base de datos (Django) que soporten relaciones recursivas.


2. **Catalogación de Referencias (SKUs) y Rutas:**
* Asociación de productos (Pollo entero, presas, valor agregado) a las líneas específicas por donde pasan.


3. **Definición de Variables Críticas (KPIs):**
* Estandarizar qué se mide: Tiempo de Ciclo (CT), Tiempo de Takt, OEE, Rendimiento (Yield), Mermas.



## Fase 2: Estandarización "Hard" (Ingeniería de Métodos)

**Objetivo:** Detener la variabilidad del proceso. Definir el "Deber Ser" técnico.

1. **Documentación de Procedimientos (SOPs):**
* Redacción técnica paso a paso de las actividades críticas.
* Integración de matriz de riesgos (Seguridad) y puntos críticos de control (Calidad/Inocuidad).


2. **Estudio de Tiempos y Movimientos (Medición):**
* Toma de tiempos con cronómetro (o video).
* Cálculo del **Tiempo Normal** y **Tiempo Estándar** (aplicando factores de valoración y suplementos por fatiga/necesidades personales).
* **Acción Digital:** El sistema debe calcular automáticamente el costo de mano de obra por unidad basado en este tiempo y el salario del puesto.


3. **Balanceo de Líneas Inicial:**
* Identificación de Cuellos de Botella actuales en las plantas de beneficio.



## Fase 3: Visualización y Diagnóstico (Lean & VSM)

**Objetivo:** Diagnosticar el flujo de valor para encontrar las pérdidas financieras (Mudas).

1. **Generación de VSM (Value Stream Mapping):**
* **VSM Estado Actual:** Mapeo de flujo de materiales e información. Identificación de inventarios en proceso (WIP) excesivos entre zonas (ej. entre Eviscerado y Enfriamiento).
* **Cálculo de Lead Time:** Cuánto tarda un pollo desde que entra vivo hasta que sale despachado vs. el tiempo de valor agregado real.


2. **Detección de Desperdicios (Mudas):**
* Marcar digitalmente en el proceso dónde hay: Sobreproducción, Esperas, Transporte innecesario, Sobreprocesamiento, Inventario, Movimientos y Defectos.



## Fase 4: Cultura de Mejora y Control (Kaizen & 5S)

**Objetivo:** Asegurar que el estándar se cumpla y mejorar continuamente.

1. **Implementación de 5S Digitales:**
* Auditorías de zonas (Clasificar, Ordenar, Limpiar, Estandarizar, Disciplina).
* Registro fotográfico "Antes vs. Después" cargado en la App.


2. **Módulo Wiki / Gestión del Conocimiento:**
* Carga de ayudas visuales (LUPs) y videos de operación estándar.
* Sistema de lecciones aprendidas ante fallos recurrentes.


3. **Auditoría Escalonada (LPA):**
* Generación de rutas de inspección para gerencia y supervisores para verificar el cumplimiento del estándar en piso.



## Fase 5: Conexión a Transformación Digital (Hacia el Gemelo Digital)

**Objetivo:** Automatizar la recolección de datos y simular escenarios.

1. **Integración IoT (Preliminar):**
* Conectar contadores de unidades (PLCs) de las líneas principales al sistema para comparar *Tiempo Estándar* vs. *Tiempo Real* en vivo.


2. **Simulación de Escenarios:**
* "¿Qué pasa con el costo si automatizamos el corte de alas?" -> El sistema recalcula el VSM futuro y el balanceo de línea.



---

# Listado de Formatos Estándar Necesarios

Para que la aplicación sea robusta, debe ser capaz de generar (o ingerir) digitalmente los siguientes formatos internacionales de Ingeniería Industrial:

### 1. Formatos de Definición de Proceso (Nivel Macro)

* **Diagrama de Operaciones de Proceso (DOP):** Muestra solo las operaciones e inspecciones principales. Vital para visión general.
* **Diagrama de Análisis de Proceso (DAP / Cursograma Analítico):** Detalla operaciones, transportes, inspecciones, demoras y almacenamientos. Aquí se mide la distancia recorrida (metros) y tiempos.
* **Diagrama de Recorrido (Spaghetti Chart):** Plano de la planta con el dibujo del movimiento del personal/material. Clave para reducir transportes.
* **SIPOC (Supplier, Input, Process, Output, Customer):** Para definir el alcance de cada proceso macro en Granjas y Plantas.

### 2. Formatos de Estandarización de Trabajo (Nivel Micro - Puesto)

* **POE / SOP (Procedimiento Operativo Estándar):** Documento textual detallado con alcance, responsables, EPPs, y paso a paso. Es la base legal y de calidad.
* **HOE (Hoja de Operación Estándar):** Formato visual para el operario. Muestra:
* Diagrama del puesto.
* Secuencia de trabajo.
* Puntos clave de seguridad y calidad.
* Tiempo Takt vs. Tiempo Ciclo.


* **HCE (Hoja de Combinación de Trabajo Estándar):** Gráfico que muestra la interacción entre el Tiempo del Operario y el Tiempo de la Máquina (Auto). Vital para ver tiempos de espera.

### 3. Formatos de Tiempos y Balanceo

* **Hoja de Estudio de Tiempos (Cronometraje):** Tabla para registrar n ciclos, calcular el promedio, aplicar valoración (Ritmo) y suplementos.
* **Gráfico de Balanceo (Yamazumi Chart):** Gráfico de barras apiladas que muestra la carga de trabajo de cada operario comparada con el *Takt Time*. Permite ver visualmente quién está sobrecargado y quién tiene tiempo ocio.

### 4. Formatos de Mejora y Gestión Visual

* **VSM (Value Stream Map):** Iconografía estándar de Lean para flujo de material e información. Debe incluir la "Línea de Tiempo" (Lead Time vs. Value Added Time).
* **LUP (Lección de Un Punto / OPL):** Formato simple (una hoja, 80% imagen, 20% texto) para enseñar algo específico (ej. "Cómo afilar el cuchillo correctamente").
* **Matriz de Habilidades (Ilustración de Polivalencia):** Cuadro para gestionar qué operarios están certificados en qué puestos estandarizados.
* **Formato A3:** Formato de resolución de problemas para proyectos de mejora (Definir, Medir, Analizar, Mejorar, Controlar).

posibles integraciones con el nuevo editor de markdown de documentos en [doc_system](/doc_system/)