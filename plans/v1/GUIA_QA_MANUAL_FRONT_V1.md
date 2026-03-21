# Guía QA Manual Frontend V1

Fecha: 2026-03-03  
Ambiente objetivo: local/dev  
Alcance: validación manual end-to-end del frontend para Dashboard, Assets, Ingeniería, Cronómetro, Capacidad, Ejecución, Mobile Piso, Excelencia, Editor Docs y Diagram Studio (antes PlantaEditor).

---

## 1. Objetivo

Validar que:

1. El dashboard (`#/`) carga correctamente y mantiene visibilidad del esquema CRUD por módulo.
2. Ingeniería cubre flujo operativo completo con SKU (incluyendo `unidad de medida` y `unidad de embalaje`).
3. Cronómetro permite asociar estudio a activo/SKU/proceso estándar y alimentar estándar desde resultados.
4. La carga masiva por `.xlsx` (descarga plantilla + importación) funciona en Ingeniería y Activos.
5. Sidebar y vistas principales mantienen usabilidad responsive.
6. Desde Activos se puede navegar de forma contextual a Estándares del activo en Ingeniería.
7. Excelencia cubre flujo de acciones, auditorías, Kanban y VSM.
8. Editor Docs y Diagram Studio funcionan con flujo UX/UI consistente.
9. Los textos visuales se renderizan en UTF-8 correcto.
10. La app puede instalarse como PWA en navegador compatible.
11. Actas IP permite registrar objetivos/alcances, seguimiento intersemanal y generar acciones en Excelencia.

---

## 2. Precondiciones

1. Backend levantado:  
   `py -m uvicorn app.main:app --port 9003 --reload`
2. Frontend levantado:  
   `npm run dev`
3. Navegador recomendado: Chrome o Edge actualizado.
4. Limpiar sesión antes de iniciar:
   - eliminar `localStorage` del dominio frontend.
5. Credenciales base:
   - `admin / admin123`

---

## 3. Criterios de Aprobación

1. Casos críticos (`AUTH`, `ASSET`, `ENG`, `TIME`, `XLSX`, `RESP`, `EXEC`, `EXC`, `VSM`, `PLANT`, `UTF8`, `PWA`, `ED-HOLDER`, `ACTA`) con 100% `PASS`.
2. Sin `500` para flujos MVP.
3. Sin `401` inesperados con sesión activa.
4. Sin caracteres corruptos (`Ã`, `Â`, `�`) en labels, botones y mensajes.

---

## 4. Matriz CRUD Esperada por Módulo

Validar en `#/` existencia de esquema CRUD para:

1. Activos
2. Ingeniería
3. Cronómetro
4. Capacidad
5. Ejecución
6. Mobile Piso
7. Excelencia
8. Editor Docs
9. Actas IP
10. Diagram Studio

Resultado esperado:

1. Cada módulo aparece con columnas `Create`, `Read`, `Update`, `Delete`.
2. Para operaciones no implementadas se muestra `N/A`.
3. El enlace `Abrir módulo` navega al hash correcto.

---

## 5. Casos de Prueba

### 5.1 Smoke y Auth

#### TC-AUTH-01 Login base

- Ruta: `#/login`
- Pasos:
  1. Ingresar `admin / admin123`.
  2. Confirmar redirección a `#/`.
- Esperado:
  1. `POST /api/auth/login` = 200.
  2. `GET /api/auth/me` = 200.
  3. Navbar y sidebar visibles.

#### TC-AUTH-02 Navegación protegida

- Pasos:
  1. Navegar a `#/assets`, `#/engineering`, `#/timing`, `#/excellence`.
- Esperado:
  1. No redirección a login.
  2. Sin `401` inesperados con token válido.

### 5.2 Dashboard

#### TC-DASH-01 Carga tablero

- Ruta: `#/`
- Esperado:
  1. Hero y KPIs visibles.
  2. Tabla esquema CRUD visible.
  3. Accesos rápidos (`Gestionar Activos`, `Gestionar Ingeniería`, `Abrir Actas IP`, `Crear Documento`) operativos.

#### TC-DASH-02 Flujo visible hacia Actas IP

- Ruta: `#/`
- Pasos:
  1. Desde el hero, clic en `Abrir Actas IP`.
  2. Confirmar navegación a `#/meetings`.
- Esperado:
  1. El módulo abre sin recargar aplicación.
  2. Se visualiza formulario de acta + panel de actas registradas.

### 5.3 Activos (Árbol + XLSX)

#### TC-ASSET-01 CRUD del árbol

- Ruta: `#/assets`
- Pasos:
  1. Crear un activo raíz.
  2. Crear un activo hijo desde el detalle del activo raíz.
  3. Editar nombre/tipo/descripcion de un activo.
  4. Eliminar un activo hoja.
  5. Intentar eliminar un activo con hijos.
- Esperado:
  1. `POST /api/assets` = 201.
  2. `PATCH /api/assets/{id}` = 200.
  3. `DELETE /api/assets/{id}` = 204 para nodos hoja.
  4. `DELETE /api/assets/{id}` = 400 para nodos con hijos.
  5. Árbol refresca sin recargar página.

#### TC-ASSET-02 XLSX plantilla/export/import del árbol

- Ruta: `#/assets` y `#/settings`
- Pasos:
  1. Descargar `Plantilla Árbol`.
  2. Completar al menos 2 filas con relación `code` / `parent_code`.
  3. Importar archivo `.xlsx`.
  4. Exportar árbol actual a `.xlsx`.
- Esperado:
  1. `GET /api/assets/xlsx/template` = 200.
  2. `POST /api/assets/xlsx/import` = 200.
  3. `GET /api/assets/xlsx/export` = 200.
  4. Mensaje de resumen de importación visible con creados/actualizados/errores.
  5. Jerarquía importada visible en el árbol de activos.

### 5.4 Ingeniería (SKU + Actividades + Estándares)

#### TC-ENG-01 SKU con unidades

- Ruta: `#/engineering` → pestaña `Referencias (SKU)`
- Pasos:
  1. Crear SKU con:
     - `Código`
     - `Descripción`
     - `Familia`
     - `Unidad de medida`
     - `Unidad de embalaje`
  2. Editar el SKU creado.
- Esperado:
  1. `POST /api/engineering/references` = 200.
  2. `PATCH /api/engineering/references/{id}` = 200.
  3. Tabla muestra ambas unidades.

#### TC-ENG-02 Actividades y estándares

- Ruta: `#/engineering`
- Pasos:
  1. Crear actividad.
  2. Editar actividad y validar cambio.
  3. Eliminar actividad no referenciada.
  4. Crear estándar (activo + actividad + SKU opcional + tiempo/frecuencia/unidad capacidad).
  5. Editar estándar (tiempo/frecuencia/unidad/estado).
  6. Eliminar estándar.
- Esperado:
  1. `POST /api/engineering/activities` = 200.
  2. `PATCH /api/engineering/activities/{id}` = 200.
  3. `DELETE /api/engineering/activities/{id}` = 204.
  4. `POST /api/engineering/standards` = 200.
  5. `PATCH /api/engineering/standards/{id}` = 200.
  6. `DELETE /api/engineering/standards/{id}` = 204.

#### TC-ENG-03 XLSX plantilla/export/import

- Ruta: `#/engineering`
- Pasos:
  1. Descargar `Plantilla XLSX` para `Referencias`.
  2. Importar archivo `.xlsx` con 2 filas válidas.
  3. Exportar datos a `.xlsx`.
- Esperado:
  1. `GET /api/engineering/xlsx/template?entity=references` = 200.
  2. `POST /api/engineering/xlsx/import?entity=references` = 200.
  3. `GET /api/engineering/xlsx/export?entity=references` = 200.
  4. Mensaje de resumen de importación visible.

#### TC-ENG-04 Flujo contextual desde Activos

- Ruta: `#/assets` → seleccionar activo
- Pasos:
  1. Confirmar bloque `Estándares Asociados` en el detalle.
  2. Clic en `Gestionar Estándares` o `Abrir Ingeniería`.
  3. Verificar apertura de `#/engineering?tab=standards&assetId=...`.
  4. Confirmar filtro de activo preseleccionado en pestaña de estándares.
- Esperado:
  1. Navegación contextual funcional.
  2. Lista de estándares cargada para el activo seleccionado.

#### TC-ENG-05 Alta rápida de estándar en detalle de activo

- Ruta: `#/assets` → detalle de activo
- Pasos:
  1. En bloque `Estándares Asociados`, clic en `Asignar Estándar`.
  2. Seleccionar actividad.
  3. (Opcional) seleccionar SKU.
  4. Registrar tiempo estándar y guardar.
- Esperado:
  1. `POST /api/engineering/standards/strict` = 200.
  2. El estándar aparece en la tabla del mismo detalle de activo.
  3. Eliminar desde la tabla ejecuta `DELETE /api/engineering/standards/{id}`.

### 5.5 Cronómetro

#### TC-TIME-01 Estudio asociado

- Ruta: `#/timing`
- Pasos:
  1. Crear estudio vinculándolo a:
     - activo (opcional)
     - SKU (opcional)
     - proceso estándar (opcional)
  2. Verificar detalle del estudio.
- Esperado:
  1. `POST /api/engineering/studies` = 200.
  2. `GET /api/engineering/studies/{id}` = 200.
  3. El detalle refleja asociación seleccionada.

#### TC-TIME-02 Alimentar estándar desde resultados

- Ruta: `#/timing`
- Pasos:
  1. Crear estudio con laps.
  2. Abrir resultados.
  3. Ejecutar `Aplicar TE al estándar`.
- Esperado:
  1. `GET /api/engineering/studies/{id}/results` = 200.
  2. `POST /api/engineering/studies/{id}/apply-to-standard` = 200.
  3. `standard_time_minutes` actualizado en estándar.

### 5.6 Editor Docs

#### TC-ED-01 Cargar plantillas y crear documento

- Ruta: `#/editor`
- Pasos:
  1. Clic en `Cargar plantillas base`.
  2. Seleccionar plantilla.
  3. Editar y guardar.
- Esperado:
  1. `POST /api/templates/ingest` = 200.
  2. `GET /api/templates` = 200.
  3. `POST /api/documents` = 200.

#### TC-ED-02 Auto-carga de plantillas base

- Ruta: `#/editor`
- Pasos:
  1. Iniciar con BD limpia de `FormatTemplate`.
  2. Abrir `#/editor`.
- Esperado:
  1. Si no existen templates, el frontend dispara ingesta automática.
  2. `GET /api/templates` devuelve registros luego de la auto-carga.
  3. Grid de plantillas visible sin pasos manuales adicionales.

#### TC-ED-HOLDER-03 Apertura de template sin error de holder

- Ruta: `#/editor?templateId=<id>`
- Pasos:
  1. Abrir una plantilla desde el selector.
  2. Refrescar navegador (F5) estando en la ruta del editor con `templateId`.
  3. Revisar consola del navegador.
- Esperado:
  1. El editor carga en primer intento.
  2. No aparece `element with ID editorjs is missing`.
  3. Botón `Guardar Documento` operativo.

### 5.7 Sidebar Responsive

#### TC-RESP-01 Menú móvil

- Viewport: 390x844
- Pasos:
  1. Abrir menú hamburguesa.
  2. Cerrar con overlay y con botón `✕`.
  3. Navegar a un módulo desde el sidebar.
- Esperado:
  1. Sidebar aparece como drawer.
  2. Overlay funcional.
  3. El sidebar se cierra tras navegar.

#### TC-RESP-02 Visibilidad de módulo Meetings

- Viewport: 1366x768 y 390x844
- Pasos:
  1. Validar en sidebar el item `Actas IP`.
  2. Navegar a `Actas IP`.
  3. Abrir `Configuración` y volver a `Actas IP` desde accesos directos.
- Esperado:
  1. `Actas IP` visible en menú principal.
  2. Navegación consistente desktop/móvil.
  3. Botón de `Configuración` del sidebar funcional.

### 5.8 Excelencia (Acciones, Auditorías, Kanban y VSM)

#### TC-EXC-01 Action Tracker por estado

- Ruta: `#/excellence` → pestaña `Action Tracker`
- Pasos:
  1. Crear acción nueva.
  2. Mover la acción por estados: `Open` → `In Progress` → `Closed`.
- Esperado:
  1. `POST /api/ci/actions` = 200.
  2. `PATCH /api/ci/actions/{id}` = 200 (cada transición).
  3. La tarjeta aparece en la columna correspondiente.

#### TC-EXC-02 Auditoría 5S y Kanban

- Ruta: `#/excellence`
- Pasos:
  1. En `Auditorías 5S`, completar wizard y guardar.
  2. Validar que el radar se actualiza.
  3. En `Kanban`, calcular loop con datos válidos.
- Esperado:
  1. `POST /api/audits` = 200.
  2. `GET /api/audits/radar/comparison` = 200.
  3. `POST /api/logistics/kanban/calculate` = 200.
  4. Resultado de tarjetas visible.

#### TC-EXC-03 Workflow de cierre de acciones

- Ruta: `#/excellence` → pestaña `Action Tracker`
- Pasos:
  1. Crear acción.
  2. Cargar nota y (opcional) foto en la fila.
  3. Ejecutar `Solicitar`.
  4. Ejecutar `Aprobar`.
  5. Ejecutar `Verificar`.
- Esperado:
  1. `POST /api/ci/actions/{id}/request-close` = 200.
  2. `POST /api/ci/actions/{id}/approve-close` = 200.
  3. `POST /api/ci/actions/{id}/verify-close` = 200.
  4. Badge de workflow cambia `Open` → `CloseRequested` → `Approved` → `Verified`.

#### TC-EXC-04 Checklist template y evidencia fotográfica

- Ruta: `#/excellence` → pestaña `Auditorías 5S`
- Pasos:
  1. Crear template con `Requerir foto para hallazgos`.
  2. Seleccionar template en el formulario de auditoría.
  3. En al menos un ítem con score ≤ umbral, subir evidencia.
  4. Guardar auditoría.
- Esperado:
  1. `POST /api/audits/checklists` = 200.
  2. `POST /api/audits/advanced` = 200.
  3. Si falta foto en hallazgo crítico, el front bloquea guardado.
  4. Auditoría queda listada en historial.

#### TC-VSM-01 Interacción de nodos

- Ruta: `#/excellence` → pestaña `VSM`
- Pasos:
  1. Arrastrar nodo de proceso e inventario.
  2. Seleccionar nodo y editar `etiqueta`, `lead time`, `tiempo de ciclo`.
  3. Duplicar nodo seleccionado.
  4. Conectar nodos y eliminar una conexión.
  5. Ejecutar `Auto ordenar`.
- Esperado:
  1. Inspector actualiza nodo seleccionado.
  2. Métricas de resumen cambian.
  3. Conexiones listadas y eliminables.

### 5.9 Diagram Studio (antes PlantaEditor)

#### Casos de ejemplo incluidos en UI

Desde `#/plant-editor`, en la barra superior usar:

1. Selector `Casos de ejemplo`.
2. Botón `Cargar`.

Casos disponibles:

1. `Flujo lineal`
2. `Célula en U`
3. `VSM básico`

#### TC-PLANT-01 Flujo principal de edición

- Ruta: `#/plant-editor`
- Pasos:
  1. Seleccionar modo de diagrama (`General`, `Planta`, `Proceso`, `VSM`, `SVG técnico`).
  2. Crear objetos (`Rectángulo`, `Círculo`, `Rombo`, `Texto`, `Marcador`).
  3. Crear al menos 2 conexiones con herramienta `Conexión`.
  4. Guardar en DB y reabrir diseño.
  5. Exportar `JSON`, `PNG` y `SVG`.
- Esperado:
  1. Cambio de modo actualiza estado y lienzo.
  2. Objetos y conexiones se renderizan correctamente.
  3. Persistencia DB funcional.
  4. Exportaciones generan descarga.

#### TC-PLANT-02 Simulador de flujo de producto

- Ruta: `#/plant-editor`
- Pasos:
  1. Abrir panel `Flujo`.
  2. Configurar `Velocidad` y `Unidades simultáneas`.
  3. Clic en `Iniciar`.
  4. Clic en `Pausar` y luego `Detener`.
- Esperado:
  1. Se animan partículas sobre las conexiones.
  2. El estado muestra `Simulando flujo de producto` durante ejecución.
  3. `Pausar` congela la animación y `Detener` limpia partículas.

#### TC-PLANT-03 Responsive del editor

- Viewport: 390x844
- Pasos:
  1. Abrir `#/plant-editor`.
  2. Usar botón de configuración para mostrar/ocultar panel derecho.
  3. Abrir panel `Flujo` y validar que no tapa completamente el canvas.
  4. Probar edición básica (selección, mover lienzo, borrar).
- Esperado:
  1. Herramientas laterales accesibles.
  2. Panel derecho se abre/cierra correctamente en móvil.
  3. Simulador usable en móvil sin romper layout.

#### TC-PLANT-04 Caso de ejemplo: Flujo lineal

- Ruta: `#/plant-editor`
- Pasos:
  1. Seleccionar `Flujo lineal` y clic en `Cargar`.
  2. Validar 4 nodos conectados en serie.
  3. Abrir panel `Flujo` e iniciar simulación.
- Esperado:
  1. Diagrama se genera automáticamente.
  2. Conectores cambian de color según densidad (verde/amarillo/rojo).
  3. Badge `Densidad global` muestra ratio y semáforo.

#### TC-PLANT-05 Caso de ejemplo: Célula en U

- Ruta: `#/plant-editor`
- Pasos:
  1. Seleccionar `Célula en U` y clic en `Cargar`.
  2. Verificar distribución en forma de U.
  3. Editar posición de un nodo y comprobar que las conexiones se reajustan.
- Esperado:
  1. Layout inicial en U consistente.
  2. Flechas mantienen enlace entre nodos al mover objetos.
  3. Se puede guardar y reabrir el caso sin pérdida.

#### TC-PLANT-06 Caso de ejemplo: VSM básico

- Ruta: `#/plant-editor`
- Pasos:
  1. Seleccionar `VSM básico` y clic en `Cargar`.
  2. Confirmar presencia de nodos de proceso e inventario.
  3. Exportar en `JSON` y `SVG`.
- Esperado:
  1. Caso VSM queda precargado y editable.
  2. Conectores incluyen capacidad de referencia para simulación.
  3. Exportaciones disponibles sin error.

### 5.10 UTF-8 visual

#### TC-UTF8-01 Labels críticos

- Revisar textos:
  - `Árbol de Activos`
  - `Ingeniería`
  - `Cronómetro`
  - `Ejecución`
  - `Configuración`
  - `Triángulo Inventario`
- Esperado:
  1. Sin mojibake.
  2. Sin caracteres de reemplazo.

### 5.11 PWA

#### TC-PWA-01 Instalación y modo standalone

- Ruta: cualquier vista autenticada
- Pasos:
  1. Validar `manifest.webmanifest` en DevTools (Application).
  2. Confirmar registro de `service worker` (`/sw.js`).
  3. Instalar la app desde navegador.
  4. Abrir en modo standalone.
- Esperado:
  1. Manifest válido con íconos 192 y 512.
  2. Service worker activo.
  3. App instalable y funcional en modo standalone.

### 5.12 Actas IP

#### TC-ACTA-01 Crear y editar acta estructurada

- Ruta: `#/meetings`
- Pasos:
  1. Crear acta con título, objetivo, alcance, fuera de alcance y riesgos.
  2. Agregar al menos 2 filas en matriz KPI.
  3. Agregar al menos 2 compromisos con responsable y fecha.
  4. Guardar acta.
  5. Reabrir desde panel lateral y editar un campo.
- Esperado:
  1. `POST /api/meetings/records` = 200.
  2. `PATCH /api/meetings/records/{id}` = 200.
  3. Dashboard del módulo muestra conteos de compromisos abiertos/cerrados/vencidos.

#### TC-ACTA-02 Convertir compromisos en acciones de Excelencia

- Ruta: `#/meetings`
- Pasos:
  1. Seleccionar un acta con compromisos.
  2. Clic en `Generar Acciones`.
  3. Abrir `#/excellence` y validar tablero de acciones.
- Esperado:
  1. `POST /api/meetings/records/{id}/materialize-actions` = 200.
  2. Cada compromiso queda con `action_id`.
  3. En Excelencia aparecen acciones con `source_document` iniciando por `MEETING:`.

#### TC-ACTA-03 Seguimiento intersemanal

- Ruta: `#/meetings`
- Pasos:
  1. Crear al menos 2 actas en fechas distintas.
  2. Mantener un compromiso abierto entre ambas y cerrar otro en la segunda.
  3. En la segunda acta, clic en `Comparar`.
- Esperado:
  1. `GET /api/meetings/records/{id}/comparison` = 200.
  2. Se visualizan conteos de `Arrastrados`, `Cerrados`, `Nuevos` y `Vencidos`.

#### TC-ACTA-04 Importación asistida de texto

- Ruta: `#/meetings`
- Pasos:
  1. Pegar texto de un acta (copiado desde PDF o minuta).
  2. Clic en `Generar borrador`.
  3. Revisar campos precargados (título, agenda, compromisos).
- Esperado:
  1. `POST /api/meetings/import/heuristic` = 200.
  2. Formulario se autocompleta con datos detectados.
  3. Se muestran advertencias si alguna sección no fue detectada.

---

## 6. Checklist de Evidencias

Por cada caso:

1. ID (`TC-...`)
2. Estado (`PASS` / `FAIL`)
3. Captura o video
4. Endpoint y status
5. Observaciones

---

## 7. Plantilla de Defecto

```md
ID: BUG-###
Caso relacionado: TC-...
Módulo: Dashboard | Assets | Ingeniería | Cronómetro | Capacidad | Ejecución | Mobile | Excelencia | Actas IP | Editor | Diagram Studio | UTF8 | Responsive
Severidad: Crítica | Alta | Media | Baja
Precondición:
Pasos para reproducir:
Resultado actual:
Resultado esperado:
Evidencia: (screenshot/video/log)
```

---

## 8. Cierre de Ronda

1. Ejecutar todos los casos críticos.
2. Corregir defectos y repetir smoke completo.
3. Confirmar estabilidad de:
   - asociación de estudios
   - carga masiva XLSX
   - navegación contextual Activos → Ingeniería
   - ejecución (bitácora/paros/personal)
   - excelencia (acciones/auditoría/kanban/vsm)
   - actas IP (creación, comparación, materialización a acciones)
   - sidebar responsive
   - editor docs (sin error de holder)
   - diagram studio y simulador de flujo
   - UTF-8

---

## 9. Matriz Rápida de Validación (Eliminación)

Objetivo: validar que cada entidad visible en front tenga acción `Eliminar` funcional, con confirmación y refresco de estado.

| ID | Módulo | Entidad | Ruta Front | Acción | Endpoint esperado | Resultado esperado |
|---|---|---|---|---|---|---|
| `DEL-DOC-01` | Documentos | Documento | `#/documents` | Botón `Eliminar` en tabla | `DELETE /api/documents/{id}` | 204, fila removida sin recargar app |
| `DEL-DOC-02` | Activos | Documento asociado a activo | `#/assets` detalle | Botón `Eliminar` en bloque documentos | `DELETE /api/documents/{id}` | 204, tabla de asociados se refresca |
| `DEL-AST-01` | Activos | Activo hoja | `#/assets` detalle | Botón `Eliminar Activo` | `DELETE /api/assets/{id}` | 204, árbol refresca y selección cambia |
| `DEL-AST-02` | Activos | Activo con hijos | `#/assets` detalle | Botón `Eliminar Activo` | `DELETE /api/assets/{id}` | 400 controlado, mensaje de restricción |
| `DEL-ENG-01` | Ingeniería | Referencia SKU | `#/engineering` | Botón `Eliminar` | `DELETE /api/engineering/references/{id}` | 204, item desaparece |
| `DEL-ENG-02` | Ingeniería | Actividad | `#/engineering` | Botón `Eliminar` | `DELETE /api/engineering/activities/{id}` | 204, item desaparece |
| `DEL-ENG-03` | Ingeniería | Estándar | `#/engineering` y `#/assets` detalle | Botón `Eliminar` | `DELETE /api/engineering/standards/{id}` | 204, item desaparece |
| `DEL-TIME-01` | Cronómetro | Estudio de tiempos | `#/timing` | Botón `Eliminar` | `DELETE /api/engineering/studies/{id}` | 204, estudio removido del listado |
| `DEL-EXE-01` | Ejecución | Evento bitácora | `#/execution` pestaña Bitácora | Botón `Eliminar` | `DELETE /api/execution/logs/{id}` | 204, fila removida |
| `DEL-EXE-02` | Ejecución | Evento de paro | `#/execution` pestaña Paros | Botón `Eliminar` | `DELETE /api/execution/downtimes/{id}` | 204, fila removida |
| `DEL-EXE-03` | Ejecución | Operario | `#/execution` pestaña Personal | Botón `Eliminar` | `DELETE /api/execution/staff/operators/{id}` | 204, fila removida |
| `DEL-EXE-04` | Ejecución | Habilidad (skill) | `#/execution` pestaña Personal | Botón `Eliminar` en tabla skills | `DELETE /api/execution/staff/skills/{id}` | 204, skill removida |
| `DEL-MTG-01` | Actas IP | Acta seleccionada | `#/meetings` | Botón `Eliminar` en formulario | `DELETE /api/meetings/records/{id}` | 204, formulario limpia selección |
| `DEL-MTG-02` | Actas IP | Acta en listado lateral | `#/meetings` | Botón `Eliminar` por fila | `DELETE /api/meetings/records/{id}` | 204, card removida |
| `DEL-CI-01` | Excelencia | Acción CI | `#/excellence` Action Tracker | Botón `Eliminar` | `DELETE /api/ci/actions/{id}` | 204, card removida |
| `DEL-AUD-01` | Excelencia | Auditoría | `#/excellence` Auditorías | Botón `Eliminar` | `DELETE /api/audits/{id}` | 204, fila removida (y acciones ligadas) |
| `DEL-KAN-01` | Excelencia | Loop Kanban | `#/excellence` Kanban | Botón `Eliminar` | `DELETE /api/logistics/kanban/loops/{id}` | 204, fila removida |

### Notas de validación

1. En todos los casos, validar confirmación previa (`confirm`) antes de ejecutar.
2. Validar que no queden errores en consola al eliminar.
3. Validar que, si backend retorna error controlado (por dependencias), el front muestre mensaje claro y no se rompa.
