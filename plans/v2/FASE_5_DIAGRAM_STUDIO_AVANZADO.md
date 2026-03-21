# FASE 5: Diagram Studio Avanzado

> Objetivo: convertir Diagram Studio en un editor industrial completo para vectorial, planta, proceso y VSM con semántica de datos.
> Estado: Implementada (S13-S15 cerrados)

---

## Sprint V2-S13 — Librerías de Elementos Industriales

### Checklist
- [x] Panel de trazabilidad cruzada KPI/Acción/NC/CAPA/Actas en `#/plant-editor`.
- [x] Selector de contexto por activo con navegación inter-módulo contextual.
- [x] Resumen operativo en vivo para priorización en sesión de diseño.
- [x] Semaforización visual por nodo/zona sobre canvas (overlay de señales).
- [x] Catálogo JSON de librerías por dominio.
- [x] Búsqueda y favoritos de elementos.
- [x] Plantillas por industria/cliente.
- [x] Versionado de librerías.
- [x] Guías de uso por librería.

---

## Sprint V2-S14 — Capas, Anidación y Jerarquías

### Checklist
- [x] Modelo de árbol de capas (`layer_tree`).
- [x] Operaciones crear/mover/anidar/clonar/bloquear.
- [x] Consistencia de z-index y render.
- [x] Persistencia de expansión/colapso.
- [x] Pruebas con árboles profundos.

---

## Sprint V2-S15 — Propiedades Dinámicas por Tipo

### Checklist
- [x] Schemas de propiedades por tipo de elemento.
- [x] Panel de propiedades schema-driven.
- [x] Validaciones y defaults por schema.
- [x] Extensiones por tenant.
- [x] Historial de cambios.

---

## Casos de ejemplo comprometidos

1. Plano de planta con zonas de seguridad y activos vinculados.
2. Mapa de proceso con tiempos y cuellos de botella.
3. VSM completo material + información.
4. Diagrama híbrido para comité semanal.

---

## Alineación KPI MC con Diagram Studio

La relación objetivo es visualizar KPI sobre layout/proceso:

- overlay de desempeño por celda/zona,
- semaforización por estación,
- drill-down desde elemento gráfico a scorecard KPI.

Estado actual:
- [x] Integración visual KPI->Diagram Studio base implementada (panel contextual con scorecard y backlog).
- [x] Base de semaforización y heatmap ya disponible en editor.
- [x] Overlay gráfico por estación/zona directamente sobre elementos del canvas.
