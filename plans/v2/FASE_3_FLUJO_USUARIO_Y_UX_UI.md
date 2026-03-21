# FASE 3: Flujo de Usuario y UX/UI

> Objetivo: reducir fricción en tareas críticas y elevar consistencia visual/responsiva en todos los módulos.
> Estado: Implementada (S07-S08-S09 cerrados)

---

## Sprint V2-S07 — Rediseño de Flujos Críticos End-to-End

Referencia detallada: [Journeys S07 por rol](JOURNEYS_S07_POR_ROL.md)

### Journeys prioritarios
- Alta de estándar + documento + muestra + seguimiento.
- Diagnóstico de desvío y apertura de acción.
- Lectura de planta y simulación.
- Seguimiento KPI MC mensual y comité semanal.

### Checklist
- [x] Definir 8-10 journeys por rol.
- [x] Reducir clics/cambio de contexto.
- [x] Acciones rápidas y panel contextual.
- [x] Estados vacíos guiados y ayudas in-line.
- [x] Pruebas de usabilidad por perfil.

---

## Sprint V2-S08 — UX/UI Consistente, Responsive y Accesible

### Checklist
- [x] Design tokens globales.
- [x] Librería base de componentes.
- [x] Consistencia de CRUD y feedback.
- [x] Ajustes responsive de vistas de excelencia/KPI.
- [x] Auditoría inicial de accesibilidad (teclado/ARIA/contraste en shell principal).

### Avance aplicado
- Tabla KPI MC adaptada para anchos reducidos con scroll horizontal controlado.
- Tarjetas de resumen KPI en layout responsive.
- Estado visual de semáforo por cumplimiento.
- Acciones de workflow inline en tabla KPI MC (solicitar/aprobar/verificar).
- Banner de alerta ejecutiva KPI MC en dashboard de Meetings.
- Tokens UI globales agregados en `style.css` (`surface`, `border`, `text`, `focus-ring`, radios y sombras).
- Componentes base CSS agregados (`tk-card`, `tk-input`, `tk-select`, `tk-textarea`, `tk-btn-secondary`, `tk-btn-danger`, `tk-feedback-*`, `tk-empty-state`, `tk-badge`).
- Servicio de feedback unificado (`ui-feedback.service`) instalado globalmente con notificaciones toast.
- Shell principal (`Navbar`/`Sidebar`) con accesibilidad reforzada:
  - textos y labels normalizados en UTF-8,
  - ARIA en navegación y modal de contexto,
  - cierre con `Escape`,
  - trampa de foco en menú lateral móvil y modal de contexto,
  - sincronización `aria-expanded` del toggle lateral.
- `Documentos` y `Actas IP` alineados a componentes base (`tk-input/select/textarea`, `tk-btn-secondary`, `tk-btn-danger`) y feedback consistente.
- `Dashboard` extendido con journeys por rol y acceso directo a flujos críticos.
- `Capacidad` y `Cronómetro` reforzados con feedback unificado y estados vacíos guiados.
- `Activos` migrado parcialmente a componentes base de formulario y feedback CRUD unificado.
- Harmonización visual legacy en formularios/botones CRUD vía `style.css` para módulos aún en migración.
- `Ingeniería`, `Ejecución` y `Excelencia` migrados de `alert(...)` a `uiFeedback` con severidad contextual.
- Limpieza UTF-8 en módulos críticos (`Engineering/Execution/Excellence`) sin caracteres corruptos.
- `Settings` y `Weight Sampling` migrados a feedback no bloqueante, cerrando eliminación de `alert(...)` en páginas activas.
- Router principal con carga diferida por ruta (lazy-loading) y estado visual de carga durante import asíncrono.
- Optimización de bundle por code-splitting (`vendor` + `fabric`) para reducir payload inicial.
- Suite E2E Playwright incorporada para smoke de sidebar responsive y controles PWA.
- Suite E2E Playwright integrada con backend real por rol (`admin`, `ingeniero`, `supervisor`).
- Matriz QA por rol/tenant documentada en `MATRIZ_QA_ROLES_TENANT_V2.md`.

---

## Sprint V2-S09 — PWA Operativa y Offline-First

### Checklist
- [x] Estrategia de cola offline.
- [x] Sync manager y resolución de conflictos.
- [x] Estado online/offline visible por módulo.
- [x] Pruebas de corte/recuperación de red.
- [x] Guía operativa de límites offline.
- [x] Gestión de actualización de service worker desde runtime (`Settings` + eventos PWA).

---

## Alineación KPI MC en UX/UI

- [x] Captura de avance mensual directa desde UI.
- [x] Visualización de puntaje ponderado individual/KPI.
- [x] Identificación de pesos KPI pendientes.
- [x] Dashboard ejecutivo con tendencia temporal.
