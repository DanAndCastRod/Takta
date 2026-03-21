# Guía QA Manual Front — V2-S02 + V2-S06.2

> Fecha: 2026-03-06
> Alcance: navegación contextual, interoperabilidad, KPI MC y cierre S5/S6 (SPC, capacidad, NC/CAPA y meetings-calidad).

## 1. Precondiciones

- Backend activo en `http://127.0.0.1:9003`.
- Frontend activo en `http://127.0.0.1:5173`.
- Usuario autenticado (`admin` recomendado).
- Al menos un activo creado.

## 2. Smoke Base

1. Iniciar sesión.
2. Verificar carga de `#/` sin errores bloqueantes.
3. Confirmar Navbar + Sidebar + barra contextual.

Resultado esperado:
- UI navegable y sin pantalla en blanco.

## 3. URL Canónica de Contexto

1. Abrir `#/engineering?assetId=<uuid>`.
2. Validar normalización a `asset_id`.
3. Repetir con `referenceId` y `standardId`.

Resultado esperado:
- Query final en formato canónico.

## 4. Breadcrumbs y Back-Navigation

1. Recorrer `#/assets`, `#/engineering`, `#/execution`, `#/documents`, `#/plant-editor`.
2. Verificar breadcrumbs y botón `Volver`.

Resultado esperado:
- Breadcrumb coherente.
- `Volver` retorna al historial o `#/` si no existe historial.

## 5. Enlaces Cruzados

1. Desde detalle de activo (`#/assets`) abrir:
   - documentos,
   - ingeniería,
   - excelencia.
2. Verificar persistencia de `asset_id`.

Resultado esperado:
- Navegación contextual estable.

## 6. Responsive Sidebar

### Mobile (<768)

1. Abrir sidebar.
2. Cerrar por overlay, botón y `Esc`.
3. Cambiar a desktop con sidebar abierto.

Resultado esperado:
- Comportamiento estable sin doble scroll.

## 7. KPI MC — Scorecard y Captura

### TC-KPI-01 Carga de tablero

1. Ir a `#/excellence`.
2. Abrir pestaña `KPI MC`.

Esperado:
- Tarjetas de resumen visibles.
- Tabla de líneas/indicadores cargada.

### TC-KPI-02 Cambio de periodo

1. Cambiar `Periodo` (input tipo mes).
2. Confirmar recarga de scorecard.

Esperado:
- `GET /api/ci/kpis/mc/scorecard?period=...` exitoso.

### TC-KPI-03 Guardar medición

1. En una fila KPI ingresar Meta/Actual/Cumplimiento.
2. Clic `Guardar`.

Esperado:
- `PUT /api/ci/kpis/mc/measurements` exitoso.
- Semáforo actualizado (`green/yellow/red`).

### TC-KPI-04 Eliminar medición

1. En KPI con medición, clic `Eliminar`.

Esperado:
- `DELETE /api/ci/kpis/mc/measurements/{id}` exitoso.
- Fila vuelve a estado sin medición.

### TC-KPI-05 Definir peso KPI pendiente

1. En fila con peso pendiente, ingresar valor y clic `Definir`.

Esperado:
- `PATCH /api/ci/kpis/mc/catalog/{id}` exitoso.
- Campo pasa a peso definido.

### TC-KPI-06 Dashboard

1. Volver a `#/`.
2. Ver tarjeta `KPI MC`.

Esperado:
- Muestra valor de scorecard KPI (`weighted_kpi_result_pct`).

### TC-KPI-07 Tendencia mensual KPI MC

1. En `#/excellence?tab=kpi-mc`, cambiar selector `3/6/9/12 meses`.
2. Validar que se refresca la tendencia.

Esperado:
- `GET /api/ci/kpis/mc/trend?months=...&end_period=...` exitoso.
- Lista de períodos y barras de tendencia visibles.
- Badge de delta contra período previo visible (si existe histórico).

### TC-KPI-08 Workflow automático por recuperación KPI

1. En `#/excellence?tab=kpi-mc`, cargar un KPI con cumplimiento `<80` y guardar.
2. Ir a `Action Tracker` y validar acción `KPI_MC:...` en `Open`.
3. Volver a KPI MC, actualizar el mismo KPI con cumplimiento `>=95` y guardar.
4. Regresar a `Action Tracker` y validar estado final.

Esperado:
- La acción KPI pasa a `Verified`.
- El workflow de la acción queda en `Verified` (consulta técnica: `GET /api/ci/actions/{id}/workflow`).

### TC-KPI-09 Trazabilidad KPI -> Acción -> Workflow

1. En `#/excellence?tab=kpi-mc`, ubicar KPI con acción automática creada.
2. Validar columna `Traza Acción` (estado acción + estado workflow + fuente).
3. Clic en `Ver en Action Tracker`.

Esperado:
- Navega al tab `Action Tracker`.
- La fila de la acción aparece enfocada/resaltada.
- Scroll posiciona la acción en viewport.

### TC-KPI-10 Cierre de pesos KPI pendientes

1. En `#/excellence?tab=kpi-mc`, clic en `Cerrar pesos pendientes`.
2. Esperar recarga automática de scorecard.
3. Revisar tarjeta `Pesos KPI pendientes`.

Esperado:
- `POST /api/ci/kpis/mc/catalog/close-pending-weights` exitoso.
- `Pesos KPI pendientes` = `0.00%`.
- No quedan filas KPI con estado de peso pendiente.

### TC-KPI-11 Workflow inline desde KPI MC

1. En una fila KPI con acción asociada, usar botones `Solicitar`, `Aprobar`, `Verificar`.
2. Verificar actualización de badges en la misma fila.
3. Confirmar en `Action Tracker` que el workflow coincide.

Esperado:
- Las transiciones de workflow aplican sin salir de `KPI MC`.
- Estado de acción y workflow quedan sincronizados en ambos tabs.

## 8. KPI MC en Actas IP

### TC-MEET-KPI-01 Tarjetas KPI en dashboard de actas

1. Ir a `#/meetings`.
2. Verificar tarjetas `KPI MC período`, `KPI MC cobertura`, `KPI MC ponderado`, `KPI MC rojos`.

Esperado:
- `GET /api/meetings/dashboard` retorna campos KPI MC.
- Tarjetas visibles sin errores.

### TC-MEET-KPI-02 Navegación directa a KPI MC

1. Seleccionar una acta.
2. Clic en `Ver KPI MC`.

Esperado:
- Navega a `#/excellence?tab=kpi-mc` (con `asset_id` si aplica).
- Pestaña KPI MC activa al cargar.

### TC-MEET-KPI-03 Delta intermensual en actas

1. Ir a `#/meetings`.
2. Verificar tarjetas `KPI MC período previo`, `Delta KPI MC`, `Delta cobertura`, `Delta rojos`.

Esperado:
- `GET /api/meetings/dashboard` retorna campos de comparación intermensual.
- Los deltas se muestran sin errores de render.

### TC-MEET-KPI-04 Alerta ejecutiva de tendencia KPI MC

1. Ir a `#/meetings`.
2. Verificar banner `Alerta tendencia KPI MC`.
3. Confirmar tarjetas `Meta KPI MC` y `Brecha a meta`.

Esperado:
- El banner muestra nivel/mensaje/acción recomendada de tendencia.
- El color del banner cambia según severidad (`critical`, `risk`, `watch`, `healthy`).

## 9. Criterios de Aprobación

- 100% de casos críticos (`Smoke`, `Contexto`, `Responsive`, `KPI MC`) en OK.
- Cero errores bloqueantes de JS.
- Cero rutas legacy visibles en navegación.

## 10. SPC en Muestreo de Peso (S04)

### TC-SPC-01 Carta I-MR y límites de control

1. Ir a `#/weight-sampling`.
2. Seleccionar especificación con al menos 20 muestras.
3. Validar panel `SPC y reglas Western Electric`.

Esperado:
- Se renderiza carta I-MR.
- Se muestran `CL`, `LCL` y `UCL`.
- El badge de alerta refleja estado (`Estable/Advertencia/Critico`).

### TC-SPC-02 Reglas Western Electric

1. Registrar una muestra extrema fuera del patrón histórico.
2. Revisar listado de violaciones bajo la carta.

Esperado:
- Aparece al menos una violación (`WE1..WE4`).
- Mensaje describe la regla activada.

### TC-SPC-03 Capacidad de proceso

1. En la misma vista, validar tarjeta `Capacidad proceso`.

Esperado:
- Muestra `Cp`, `Cpk`, `Pp`, `Ppk`.
- Valores numéricos o `-` cuando no hay datos suficientes.

### TC-SPC-04 Exportación CSV SPC

1. Clic en `Export SPC CSV`.
2. Abrir archivo descargado.

Esperado:
- Descarga exitosa con columnas:
  - `sample_id`, `measured_at`, `measured_value`, `moving_range`, `z_score`, `status_color`.

## 11. No Conformidades y CAPA (S06)

### TC-CAPA-01 Crear NC desde SPC

1. En `#/weight-sampling`, seleccionar especificación con alerta SPC activa.
2. Clic en `Crear NC desde SPC`.

Esperado:
- Se crea una no conformidad con fuente `spc`.
- Aparece en listado `No conformidades y CAPA`.

### TC-CAPA-02 Cambiar estado de NC

1. En listado NC, usar `En progreso`, luego `Solicitar cierre`.
2. Desde rol autorizado, usar `Aprobar` y `Verificar`.

Esperado:
- Estado actualiza en UI sin recargar módulo.
- Se refleja en backend (`PATCH /api/quality/non-conformities/{id}`).

### TC-CAPA-03 Dashboard CAPA

1. Ver bloque NC/CAPA en módulo de muestreo.
2. Confirmar contadores de `NC abiertas` y `CAPA abiertas`.

Esperado:
- Se consumen datos de `GET /api/quality/capa/dashboard`.
- Contadores coherentes con las NC/CAPA creadas.

### TC-CAPA-04 Auto NC por evento de muestreo

1. Registrar muestra extrema en una especificación con historial SPC estable.
2. Revisar respuesta de creación de muestra y listado NC.

Esperado:
- La muestra puede incluir `auto_non_conformity_id`.
- Se crea NC `source=spc` sin intervención manual.

### TC-CAPA-05 Auto NC masivo

1. En `#/weight-sampling`, usar botón `Auto NC`.
2. Revisar listado de NC y logs de red.

Esperado:
- Se ejecuta `POST /api/quality/non-conformities/auto-generate`.
- Se crean/reutilizan NC abiertas según alertas activas.

### TC-CAPA-06 CRUD de acciones CAPA en UI

1. En `#/weight-sampling`, seleccionar una NC.
2. En bloque `Acciones CAPA`, crear una acción con título, responsable y fecha.
3. Editar la acción creada (`Editar`) y guardar.
4. Probar transiciones `En progreso` -> `Solicitar cierre` -> `Aprobar` -> `Verificar`.
5. Eliminar acción con `Eliminar`.

Esperado:
- Creación vía `POST /api/quality/non-conformities/{id}/capa-actions`.
- Edición/flujo vía `PATCH /api/quality/capa-actions/{id}`.
- Eliminación vía `DELETE /api/quality/capa-actions/{id}`.
- Contadores de dashboard CAPA se actualizan de forma consistente.

## 12. Capacidad de Proceso S5 (corridas + tendencia)

### TC-S5-01 Corrida on-demand

1. Ir a `#/weight-sampling`.
2. Seleccionar especificación y clic `Ejecutar ahora`.

Esperado:
- Se ejecuta `POST /api/quality/weight-specs/{id}/spc/capability/runs`.
- Se actualiza bloque "Ultima corrida" con estado y timestamp.

### TC-S5-02 Corrida batch por activo

1. En la misma vista, clic `Batch activo`.

Esperado:
- Se ejecuta `POST /api/quality/spc/capability/runs/batch`.
- Se actualiza histórico de corridas.

### TC-S5-03 Tendencia histórica

1. Validar tabla de tendencia mensual (`Bucket`, `Cp`, `Cpk`, `Estado`).

Esperado:
- Se consumen datos de `GET /api/quality/weight-specs/{id}/spc/capability/trend`.
- Los buckets muestran consistencia con corridas ejecutadas.

## 13. Integración Meetings <-> Calidad

### TC-MQ-01 Panel de calidad en Actas

1. Ir a `#/meetings`.
2. Validar tarjetas `NC abiertas`, `NC criticas`, `CAPA abiertas`, `CAPA vencidas`.

Esperado:
- `GET /api/meetings/dashboard` retorna métricas de calidad.
- Los valores son coherentes con backlog NC/CAPA.

### TC-MQ-02 Sincronizar NC/CAPA a compromisos

1. Abrir una acta con activo asociado.
2. Clic `Sincronizar NC/CAPA`.
3. Revisar tabla `Compromisos`.

Esperado:
- Se ejecuta `POST /api/meetings/records/{id}/sync-quality-commitments`.
- Se crean/actualizan compromisos con fuente de issues de calidad.

### TC-MQ-03 Listado de issues de calidad

1. En `#/meetings`, validar panel `Calidad abierta (NC/CAPA)`.

Esperado:
- El panel se alimenta de `GET /api/meetings/quality/issues`.
- Muestra issues abiertos filtrados por activo (si aplica).

## 14. S07 Journeys y estados vacíos guiados

### TC-S07-01 Journeys por rol en Dashboard

1. Ir a `#/`.
2. Revisar sección `Journeys sugeridos por rol`.
3. Abrir al menos 3 tarjetas de flujo con `Iniciar flujo`.

Esperado:
- Se visualizan 10 journeys (ingeniería, calidad, mejora, operación, documentación y diseño).
- Cada botón navega al módulo correcto.
- La navegación mantiene hash routing correcto.

### TC-S07-02 Estado vacío en Documentos

1. Ir a `#/documents` en una base sin documentos o aplicar filtros sin resultados.
2. Verificar bloque de estado vacío.
3. Probar `Nuevo documento` y, si aplica, `Limpiar filtros`.

Esperado:
- Estado vacío presenta guía clara y CTA.
- `Nuevo documento` abre `#/editor`.
- `Limpiar filtros` restablece búsqueda/contexto y recarga tabla.

### TC-S07-03 Estado vacío en Actas

1. Ir a `#/meetings` sin actas en el contexto.
2. Verificar bloque `Sin actas registradas`.
3. Clic en `Crear acta`.

Esperado:
- Se muestra el estado vacío guiado.
- El botón inicializa borrador limpio.
- No se producen errores de render.

## 15. S08 Feedback unificado + conectividad

### TC-S08-01 Toast de feedback en Documentos y Actas

1. En `#/documents`, eliminar un documento (si existe).
2. En `#/meetings`, crear/actualizar una acta.

Esperado:
- Se muestran notificaciones toast de éxito o error.
- Los mensajes son consistentes entre módulos.
- El flujo no queda bloqueado por `alert` modal nativo.

### TC-S08-02 Estado online/offline en navbar

1. Con la app abierta, desconectar red local.
2. Verificar badge en navbar.
3. Restaurar red y validar recuperación visual.

Esperado:
- Badge cambia a `Offline` al perder conectividad.
- Badge vuelve a `Online` al recuperar red.
- La app no pierde estado de navegación por este cambio.

## 16. S08 Continuidad (Capacidad y Cronómetro)

### TC-S08-03 Capacidad sin activos (estado vacío)

1. Probar `#/capacity` en entorno sin activos.

Esperado:
- Se muestra estado vacío guiado.
- CTA `Ir a Activos` navega a `#/assets`.

### TC-S08-04 Validaciones + feedback en Capacidad

1. En `#/capacity`, intentar analizar sin activo.
2. Seleccionar activo, ejecutar escenario con demanda inválida.
3. Ejecutar escenario válido.

Esperado:
- Mensajes de validación aparecen como toast.
- Escenario válido muestra resultados y notificación de éxito.

### TC-S08-05 Cronómetro con lista vacía

1. Probar `#/timing` en entorno sin estudios.
2. Usar CTA de estado vacío `Crear estudio`.

Esperado:
- Estado vacío guiado visible.
- Se abre flujo de `Nuevo Estudio`.

### TC-S08-06 Eliminación de estudio con feedback

1. Crear estudio de prueba.
2. Eliminarlo desde listado.

Esperado:
- Confirmación previa sigue activa.
- Eliminación exitosa muestra toast y refresca listado.

### TC-S08-07 Guardado de activo con feedback

1. Ir a `#/assets`.
2. Crear o editar activo desde modal.

Esperado:
- Formulario usa estilo consistente (`tk-*`) en inputs/select/textarea.
- Al guardar correctamente, aparece toast de éxito.
- Si falla la operación, aparece toast de error.

## 17. S08 Cierre técnico (Ingeniería, Ejecución, Excelencia)

### TC-S08-08 Ingeniería: validaciones y errores

1. Ir a `#/engineering`.
2. Intentar crear referencia/actividad con campos obligatorios vacíos.
3. Forzar error de API (por ejemplo payload inválido).

Esperado:
- Validaciones muestran `toast` de warning.
- Errores de API muestran `toast` de error.

### TC-S08-09 Ejecución: errores operativos

1. Ir a `#/execution`.
2. Ejecutar acciones de eliminación/guardado con datos inconsistentes.

Esperado:
- Los errores se presentan en `toast` (sin `alert` nativo bloqueante).
- El flujo no rompe render y mantiene estado de pantalla.

### TC-S08-10 Excelencia: checklist 5S

1. Ir a `#/excellence`.
2. Intentar guardar checklist con datos incompletos.

Esperado:
- Mensaje de validación vía `toast`.
- Textos visibles en módulo sin caracteres corruptos de codificación.

### TC-S08-11 Settings: ingestión de plantillas

1. Ir a `#/settings`.
2. Ejecutar `Actualizar templates`.

Esperado:
- Resultado de ingestión se muestra en toast de éxito o error.
- No se usa `alert` modal nativo.

### TC-S08-12 Weight Sampling: validaciones de captura

1. Ir a `#/weight-sampling`.
2. Intentar crear spec/muestra/CAPA con campos obligatorios vacíos.

Esperado:
- Cada validación se presenta como `toast` warning.
- El flujo de pantalla permanece estable tras el mensaje.

## 18. Fase 5 (S13) Diagram Studio + trazabilidad cruzada

### TC-DS-01 Carga del panel de trazabilidad

1. Ir a `#/plant-editor`.
2. Esperar carga completa del editor y del panel superior.

Esperado:
- El canvas se renderiza sin pantalla en blanco.
- El panel muestra tarjetas de KPI, Acciones, NC/CAPA y Actas.
- No aparecen errores de JavaScript en consola.

### TC-DS-02 Cambio de contexto por activo

1. En `#/plant-editor`, usar el selector de activo del panel.
2. Elegir un activo con datos y luego volver a `Vista global`.

Esperado:
- Se actualizan tarjetas con datos del contexto seleccionado.
- El hash conserva `asset_id` canónico cuando aplica.
- Navegar a `#/excellence` o `#/weight-sampling` mantiene el mismo contexto.

### TC-DS-03 Enlaces rápidos inter-módulo

1. En el panel de Diagram Studio, usar enlaces:
   - `Excelencia KPI`,
   - `Muestreo Peso`,
   - `Actas IP`.
2. Verificar que cada ruta abre con contexto.

Esperado:
- Rutas cargan sin error y con `asset_id` consistente.
- El retorno a `#/plant-editor` mantiene operativa la pantalla.

### TC-DS-04 Botón actualizar y estados de carga/error

1. En `#/plant-editor`, clic en `Actualizar`.
2. Simular caída temporal de backend y repetir.

Esperado:
- Se muestra mensaje temporal de carga.
- Ante error, se muestra mensaje de fallo no bloqueante.
- Al restaurar backend, el panel vuelve a cargar datos.

## 19. Fase 6 base: simulación con señales SPC/CAPA

### TC-SIM-01 Activación de señales en Diagram Studio

1. Ir a `#/plant-editor`.
2. Clic en botón `Señales`.
3. Esperar actualización automática (máx. 15s).

Esperado:
- Botón cambia a estado `Señales ON`.
- En panel de flujo aparece `Señales SPC/CAPA: ON (...)`.
- Si hay datos, se observan badges semaforizados en nodos/zonas con `NC` y `CAPA`.

### TC-SIM-02 Ajuste de densidad con señales activas

1. En un diagrama con conexiones, abrir panel `Flujo`.
2. Iniciar simulación con `Señales OFF` y registrar densidad.
3. Activar `Señales ON` y comparar densidad global y color de conectores.

Esperado:
- Con señales activas, la densidad refleja `con señales`.
- Conectores de activos en riesgo muestran mayor congestión relativa.
- Al apagar señales, la simulación vuelve al comportamiento base.

### TC-SIM-03 Diagramas cargados desde JSON

1. Cargar un diagrama guardado (`Abrir diseño guardado`) con flechas y activos.
2. Activar `Señales` e iniciar simulación.

Esperado:
- El sistema infiere origen/destino de conectores por proximidad cuando no existe referencia viva.
- La semaforización de flujo sigue operativa sin errores de consola.

### TC-SIM-04 Limpieza y navegación

1. Con señales activas, ejecutar `Limpiar lienzo`.
2. Navegar a otro módulo y volver a `#/plant-editor`.

Esperado:
- No quedan overlays fantasma tras limpiar.
- No quedan timers activos al salir del módulo.
- Al volver, el editor carga estable y permite reactivar señales.

## 20. Diagram Studio avanzado (S13-S15)

### TC-DSA-01 Librería por dominio

1. En `#/plant-editor`, abrir panel `Librería`.
2. Cambiar dominio (`Planta`, `Proceso`, `VSM`, `Vectorial`).
3. Usar búsqueda por texto y `Solo plantillas`.

Esperado:
- Lista cambia según dominio/filtro.
- La búsqueda reduce resultados por nombre/código/tags.

### TC-DSA-02 Favoritos y guía

1. Marcar/desmarcar favorito (`★`) en varios elementos.
2. Activar filtro `Favoritos`.
3. Clic en `Guía` de un elemento.

Esperado:
- Favoritos persisten tras refrescar panel.
- Filtro favoritos muestra solo los marcados.
- Se renderiza texto guía del elemento seleccionado.

### TC-DSA-03 Inserción de elementos/plantillas

1. Insertar un elemento de librería (rect/ellipse/textbox).
2. Insertar plantilla (`VSM básico` o `Línea alimentos`).

Esperado:
- Se crea objeto en canvas y queda seleccionable.
- Plantilla crea estructura base (nodos/conexiones) en el lienzo.

### TC-DSA-04 Árbol de capas anidado

1. En panel `Capas`, crear capa raíz y subcapa.
2. Ejecutar `↑`, `↓`, `↳`, `↰`, `clonar`, `bloquear`, `ocultar`.
3. Guardar diseño y recargarlo.

Esperado:
- Operaciones de jerarquía aplican sin romper render.
- Z-index responde al orden de capas.
- Estado de expansión/colapso y árbol se restauran al recargar.

### TC-DSA-05 Propiedades schema-driven

1. Seleccionar nodo `rect/ellipse` y editar campos de schema (capacidad, ciclo, WIP, etc.).
2. Seleccionar conector y editar `capacity`, `variability`, `share`.

Esperado:
- El panel muestra campos por tipo de elemento.
- Validaciones min/max se aplican.
- Cambios se reflejan en objeto y se conservan al guardar.

## 21. Simulación analítica (S16-S18)

### TC-SIM-05 Escenarios persistentes

1. En panel `Simulación avanzada`, crear escenario (`Guardar`).
2. Ejecutar corrida (`Ejecutar`) con etiqueta.
3. Recargar pantalla y validar escenarios/runs listados.

Esperado:
- Se persiste escenario en backend.
- Resultados históricos aparecen en selector de runs.

### TC-SIM-06 Comparación y ranking crítico

1. Ejecutar al menos 2 corridas para un escenario.
2. Clic `Comparar`.
3. Revisar bloque `Ranking puntos críticos`.

Esperado:
- Se muestran deltas por KPI (`throughput`, `lead time`, `WIP`, `cumplimiento`).
- Ranking presenta nodos críticos ordenados por criticidad.

### TC-SIM-07 Sync de acciones y export ejecutivo

1. Con resultado seleccionado, clic `Sync acciones`.
2. Clic `Export`.

Esperado:
- Se crean/actualizan acciones de mejora por nodos rojos.
- Se descarga resumen ejecutivo de simulación.

### TC-SIM-08 Registro de decisiones

1. Crear decisión (título + nota) en panel `Decisiones`.
2. Validar que aparece en listado de decisiones del escenario.

Esperado:
- La decisión queda persistida y visible tras refresco.

## 22. White label / feature flags / observabilidad (S10-S12 + S03)

### TC-WL-01 Branding por tenant

1. En `#/settings`, cambiar tenant.
2. Actualizar marca/badge/color y guardar.

Esperado:
- Navbar/sidebar aplican branding runtime del tenant seleccionado.

### TC-WL-02 Perfil mínimo/full y menú por features

1. Aplicar `Perfil mínimo`.
2. Validar que rutas no habilitadas muestran pantalla de módulo deshabilitado.
3. Aplicar `Perfil full` y validar recuperación de menú.

Esperado:
- Feature flags impactan navegación y acceso de módulos.

### TC-WL-03 Observabilidad de integración

1. En `Settings`, ejecutar `Refrescar catálogo/eventos`.
2. Crear `evento de prueba`.
3. Ejecutar `validación` y `job nocturno`.

Esperado:
- Catálogo por módulo visible.
- Eventos recientes listados con módulo/severidad/status.
- Historial de salud se actualiza tras validaciones.


## 23. PWA Runtime (actualización de versión)

### TC-PWA-04 Verificar estado y update desde Settings

1. Ir a `#/settings` sección `PWA Offline y Sync Manager`.
2. Clic en `Buscar actualización PWA`.
3. Si aparece `Aplicar actualización`, hacer clic y esperar recarga.

Esperado:
- `Estado PWA` muestra registro activo y modo (`standalone`/`browser`).
- Al detectar nueva versión, se habilita `Aplicar actualización`.
- Tras aplicar update, la app recarga y mantiene navegación/autenticación vigentes.

## 24. Ejecución QA automatizada (smoke)

Comandos:

```bash
npm run test
npm run test:e2e
```

Resultado esperado:
- Unit tests frontend en verde.
- Smoke E2E (`responsive sidebar` + `settings PWA`) en verde.
