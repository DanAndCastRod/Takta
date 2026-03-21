# Journeys por Rol — Sprint V2-S07

> Fecha: 2026-03-06  
> Estado: Definidos e implementados en acceso rápido de `Dashboard` + `RouteContextBar`

## 1. Ingeniería de Procesos

### J1. Definir estándar nuevo
- Objetivo: crear referencia y estándar operativo en contexto.
- Flujo: `Árbol de Activos -> Ingeniería -> Cronómetro`.
- Resultado esperado: estándar trazable a activo/SKU y tiempo base validado.

### J2. Cerrar brecha de capacidad
- Objetivo: validar carga vs capacidad y generar decisiones de ajuste.
- Flujo: `Árbol de Activos -> Capacidad -> Excelencia`.
- Resultado esperado: decisión documentada y acción de mejora si aplica.

## 2. Calidad

### J3. Muestreo + SPC + No Conformidad
- Objetivo: capturar muestra, detectar señal SPC y abrir NC/CAPA.
- Flujo: `Muestreo de peso -> Actas IP -> Excelencia`.
- Resultado esperado: NC/CAPA registrada y compromiso en acta.

### J4. Seguimiento de CAPA
- Objetivo: controlar cierre de acciones correctivas/preventivas.
- Flujo: `Muestreo de peso -> Actas IP`.
- Resultado esperado: acciones vencidas visibilizadas y plan de cierre acordado.

## 3. Mejora Continua

### J5. Comité KPI MC
- Objetivo: actualizar cumplimiento y tomar decisiones semanales.
- Flujo: `Excelencia (KPI MC) -> Actas IP -> Documentos`.
- Resultado esperado: deltas mensuales explicados y acciones vinculadas.

### J6. Auditoría 5S con plan
- Objetivo: registrar hallazgos y convertirlos en acciones.
- Flujo: `Excelencia (Auditorías) -> Actas IP`.
- Resultado esperado: auditoría con cierre y seguimiento de compromisos.

## 4. Operación

### J7. Bitácora de turno
- Objetivo: registrar eventos/paros y su impacto operativo.
- Flujo: `Ejecución -> Excelencia`.
- Resultado esperado: evento trazable con acción o causa raíz asociada.

### J8. Matriz de habilidades
- Objetivo: actualizar skills y revisar cobertura de turno.
- Flujo: `Ejecución -> Capacidad`.
- Resultado esperado: brechas de habilidades visibles para planeación.

## 5. Documentación y Diseño

### J9. Documento técnico contextual
- Objetivo: crear documento vinculado a activo/proceso.
- Flujo: `Editor docs -> Documentos`.
- Resultado esperado: documento consultable, editable y eliminable desde bandeja.

### J10. Diagrama operativo
- Objetivo: diseñar layout/diagrama y enlazar entidades del proceso.
- Flujo: `Diagram Studio -> Activos -> Actas IP`.
- Resultado esperado: diseño publicado con continuidad en seguimiento semanal.

## 6. Criterios UX incluidos en S07

- Reducción de clics con botones de acción rápida por ruta.
- Ayudas in-line por módulo en `RouteContextBar`.
- Estados vacíos guiados en `Documentos` y `Actas IP`.
- Accesos de inicio rápido por rol en `Dashboard`.

## 7. Validación recomendada

- Ejecutar 1 recorrido completo por cada rol (10 journeys).
- Medir:
  - clics para completar objetivo,
  - tiempo de finalización,
  - errores de navegación,
  - necesidad de salir del contexto canónico.
