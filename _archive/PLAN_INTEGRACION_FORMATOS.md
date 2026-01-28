# Plan de Integración: Biblioteca de Formatos de Ingeniería Industrial (OAC-SEO)

Este documento detalla la estructura y el plan de integración para la biblioteca de plantillas estándar que soportarán el Sistema de Estandarización Operativa.

**Objetivo**: Centralizar el conocimiento técnico en formatos digitales (`.md` interoperables) que puedan ser ingeridos por la base de datos del sistema Takta.

## Estrategia de Integración de Datos

Todos los formatos deben estar diseñados para capturar datos que alimenten las tablas centrales definidas en `T03 - Especificación de Requerimientos`:

1.  **Encabezado Estándar**: Todos los formatos deben incluir metadatos de `Asset` (Sede, Línea, Máquina), `Activity` (Qué se hace) y `Reference` (Producto).
2.  **Cuerpo Estructurado**: Uso de tablas Markdown para datos tabulares (tiempos, pasos) que puedan ser parseados fácilmente a JSON/SQL.
3.  **Tags de Categoría**: Uso de Frontmatter o metadatos ocultos para clasificar el tipo de documento.

---

## Catálogo de Formatos

A continuación se listan los formatos a generar, organizados por disciplina.

### 1. Procesos y Mapeo (BPM)
*Enfoque: Definición de flujos y responsabilidades.*

1.  **DOP (Diagrama de Operaciones de Proceso)**: Secuencia macro de ensamble/proceso. Solo operaciones e inspecciones.
2.  **DAP (Diagrama de Análisis de Proceso)**: Flujo detallado con simbología ASME (Operación, Transporte, Inspección, Demora, Almacén).
3.  **SIPOC**: Mapa de alto nivel (Supplier, Input, Process, Output, Customer).
4.  **Diagrama de Recorrido (Spaghetti Chart)**: Plantilla para mapear movimiento físico en plano de planta.
5.  **Diagrama de Bloques Funcional**: Visión sistémica de entradas/salidas por módulo.
6.  **Swimlane Diagram (Carriles)**: Flujo de proceso separando responsabilidades por rol/departamento.
7.  **Matriz RACI**: Definición de roles (Responsible, Accountable, Consulted, Informed) por actividad.
8.  **Turtle Diagram (Diagrama de Tortuga)**: Análisis de procesos para ISO (Entradas, Salidas, Con Qué, Con Quién, Cómo, Indicadores).
9.  **Ficha de Caracterización de Proceso**: Documento maestro de calidad para describir un proceso.
10. **Mapa de Interacción de Procesos**: Visión holística de cómo se comunican las áreas.

### 2. Métodos y Tiempos (Work Measurement)
*Enfoque: Estandarización de la tarea y medición del trabajo.*

1.  **Hoja de Cronometraje (Ciclos)**: Formato para registro de n ciclos, valoración y cálculo de tiempo normal.
2.  **SOP (Procedimiento Operativo Estándar)**: Paso a paso textual con imágenes.
3.  **HOE (Hoja de Operación Estándar)**: Visual para el puesto. Muestra diagrama, pasos críticos y seguridad.
4.  **HCE (Hoja de Combinación Estándar)**: Gráfico Hombre-Máquina para identificar tiempos de espera.
5.  **Tabla de Suplementos (Fatiga/Holguras)**: Calculadora de % de concesiones por condiciones de trabajo (Ruido, Postura, Peso).
6.  **Diagrama Bimanual**: Análisis de movimientos mano izquierda vs. mano derecha (Therbligs).
7.  **Estudio de Muestreo del Trabajo**: Formato para registrar observaciones aleatorias (Activo/Inactivo).
8.  **Matriz de Tiempos Predeterminados (MTM/MOST)**: Tabla de referencia para calcular tiempos sin cronómetro.
9.  **Hoja de Balanceo de Línea (Yamazumi)**: Gráfico de cargas de trabajo por operario vs. Takt Time.
10. **Calculadora de Capacidad Instalada**: Formato para determinar el throughput teórico vs. real.
11. **Análisis de Valor Agregado (VA/NVA)**: Tabla para clasificar cada paso del DAP en VA, NVA o NVA-Necesario.

### 3. Lean Manufacturing
*Enfoque: Eliminación de desperdicios y flujo.*

1.  **VSM Current State (Estado Actual)**: Mapa de flujo de valor con línea de tiempo (Lead Time).
2.  **VSM Future State (Estado Futuro)**: Mapa proyectado con mejoras (Supermercados, FIFO).
3.  **Formato A3 de Resolución de Problemas**: Thinking process (Define, Measure, Analyze, Improve, Control).
4.  **Periódico Kaizen (Kaizen Newspaper)**: Lista de pequeñas mejoras rápidas con responsable y fecha.
5.  **Hoja de Trabajo Estándar de Líder (Lsw)**: Rutina de verificación diaria para supervisores/gerentes.
6.  **Tablero de Gestión Visual (Kamishibai)**: Plantilla para auditorías rápidas visuales.
7.  **Matriz de Polivalencia (Cross-Training)**: Cuadro de habilidades del personal (Ilustra quién sabe qué).
8.  **LUP (Lección de Un Punto / OPL)**: Documento de una sola hoja para enseñanza rápida.
9.  **Registro de SMED (Cambio Rápido)**: Formato para analizar y reducir tiempos de setup (Internos vs. Externos).
10. **Reporte de Andon**: Registro de paradas de línea activadas por operarios.
11. **Poka Yoke Log**: Registro de dispositivos a prueba de error y su validación.

### 4. 5S (Orden y Limpieza)
*Enfoque: Disciplina y ambiente de trabajo.*

1.  **Lista de Chequeo de Auditoría 5S**: Criterios de evaluación (1-5) por cada "S".
2.  **Etiqueta Roja (Red Tag)**: Formato digital para marcar elementos innecesarios en zona de "Seiri".
3.  ** inventario de Tarjetas Rojas**: Log para controlar qué se ha etiquetado y su disposición final.
4.  **Cronograma de Limpieza (Seiso)**: Calendario de responsabilidades de limpieza profunda.
5.  **Estándar de Código de Colores**: Guía visual de señalización de pisos y tuberías.
6.  **Foto Antes/Después**: Plantilla para documentar mejoras visuales.
7.  **Mapa de Zonas 5S**: Plano de planta con dueños de cada área.
8.  **Radar Chart 5S**: Gráfico de araña para visualizar puntuación de auditoría.
9.  **Plan de Acción 5S**: Formato para cerrar brechas encontradas en auditorías.
10. **Checklist de Sostenimiento (Shitsuke)**: Evaluación de hábitos y disciplina.

### 5. Six Sigma & Calidad
*Enfoque: Reducción de variabilidad y defectos.*

1.  **Project Charter**: Acta de constitución del proyecto de mejora (Business Case, Alcance).
2.  **Diagrama de Ishikawa (Espina de Pescado)**: Análisis de Causa Raíz (6M).
3.  **5 Porqués**: Formato para profundizar en la causa raíz de un problema.
4.  **AMFE / FMEA (Análisis de Modo y Efecto de Falla)**: Tabla de riesgo (Severidad x Ocurrencia x Detección).
5.  **Plan de Control**: Documento vivo que asegura que las mejoras se mantengan.
6.  **Gráfico de Control (X-Bar R)**: Plantilla para registro de datos de control estadístico de procesos (SPC).
7.  **Diagrama de Pareto**: Tabla para priorizar defectos (80/20).
8.  **Gage R&R**: Formato para estudio de Repetibilidad y Reproducibilidad del sistema de medición.
9.  **Plan de Recolección de Datos**: Definición de qué, cómo, cuándo y quién mide.
10. **CTQ Tree (Critical to Quality)**: Traducción de necesidades del cliente a métricas técnicas.

### 6. Kanban & JIT (Just in Time)
*Enfoque: Flujo y control de inventario.*

1.  **Tarjeta Kanban de Producción**: Diseño de la tarjeta física/digital.
2.  **Tarjeta Kanban de Retiro/Transporte**: Para movimiento entre áreas.
3.  **Tarjeta Kanban de Proveedor**: Para reabastecimiento externo.
4.  **Calculadora de Kanban**: Fórmula para dimensionar el loop (D x L x (1+SS) / C).
5.  **Diseño de Tablero Heijunka**: Plantilla para nivelación de la producción.
6.  **Diseño de Supermercado**: Layout estándar para zonas de stock intermedio.
7.  **Carril FIFO**: Formato para calcular la longitud máxima del carril.
8.  **Registro de Pitch**: Formato para monitorear el cumplimiento del ritmo de producción cada intervalo.
9.  **Auditoría del Sistema Kanban**: Checklist para verificar que las tarjetas se muevan correctamente.
10. **Señal de Reorden (Triángulo)**: Formato visual para puntos de reorden mínimos.

---

## Próximos Pasos

1.  Validar este listado.
2.  Generar los archivos `.md` en `templates/ie_formats`.
3.  Implementar scripts de Python en el backend para parsear estos Markdowns e inyectarlos en la BD SQL Server.
