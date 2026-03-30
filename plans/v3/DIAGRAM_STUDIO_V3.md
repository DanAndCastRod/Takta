# Diagram Studio V3 -- Plan de Robustecimiento

**Fecha**: 2026-03-30
**Estado**: Propuesta tecnica -- pendiente de priorizacion
**Referencia**: Analisis basado en lectura del codigo real (PlantEditor.js, FabricCanvas.js, platform.py, plant_layouts.py)

---

## Lo que existe hoy (V2 cerrada)

### Canvas base (FabricCanvas.js)
- Fabric.js 7, pan/zoom con scroll, undo/redo (50 estados)
- Teclado completo: Ctrl+C/V/Z/Y, flechas (nudge 1px/10px), Delete, Escape
- Resize responsivo via ResizeObserver
- Historial serializado como JSON del canvas completo

### Herramientas de dibujo (PlantEditor.js)
- Select, Pan, Rect, Circle, Diamond, Text, Marker
- ArrowConnector: lineas rectas con arrowheads (no inteligentes)
- Grupos de color por modo: plant / process / vsm / svg / general

### Sistema de capas (LayerManager.js)
- Arbol jerarquico persistido en backend por diagram_id y tenant_code
- Lock / visibility / move por capa
- Objetos asignados a capa activa al crearlos

### Panel de propiedades (PropertiesPanel.js)
- Schema-driven por tipo de elemento (rect=Zona, ellipse=Estacion, arrowLine=Conector)
- Campos: asset_ref, enum, number, text
- Edicion en vivo con callback onObjectChanged

### Libreria industrial (platform.py + PlantEditor.js)
- CRUD DiagramLibraryItem con dominio (plant/process/vsm/vector)
- Busqueda, favoritos por usuario, plantillas, versiones
- Guias Markdown por elemento
- Seed desde JSON en backend/app/seeds/diagram_libraries.json
- Drag-click insert al canvas con preseed de propiedades shape

### Import / Export (FileManager.js + ImportManager.js)
- Import: .drawio (DrawioParser.js), .json, .svg, imagenes (drag-drop)
- Export: JSON, PNG, SVG
- Autosave en localStorage con clave por layout_id

### Heatmap overlay
- SVG sobre canvas sincronizado con ResizeObserver
- Valores por asset_id, opacidad proporcional a presion (0-1)
- D3 si disponible, fallback SVG puro
- Actualiza con datos de señales SPC/CAPA

### Signal overlay (polling 15s)
- Consulta NC/CAPA, WeightSpec, ImprovementAction por asset_id
- Formula de presion: spcRisk + ncRisk + capaRisk + actionRisk normalizado a [0,1]
- Semaforo (green/yellow/red) pintado como badge sobre objetos del canvas por assetId
- Aplica stroke coloreado sobre el objeto Fabric y actualiza heatmap

### Simulacion visual (flujo de particulas)
- Particulas animadas sobre conectores via requestAnimationFrame
- Speed, tokens (unidades simultaneas), umbrales green/yellow configurables
- Densidad global y semaforo de congestion en tiempo real

### Simulacion avanzada backend (platform.py)
- Modelo: SimulationScenario / SimulationScenarioResult / SimulationDecision
- Motor deterministico (variabilidad como onda de fase, no estocastico)
- KPIs: throughput/h, throughput total, lead time, WIP, cumplimiento %
- Ranking de cuellos de botella por criticality_score
- Recomendaciones genericas por nodo rojo + calidad + paros + SPC
- Comparador de dos resultados (delta y delta %)
- Sincronizacion automatica a ImprovementAction por nodo critico
- Export ejecutivo en texto plano
- Registro de decisiones (proposed/implemented)

### Trazabilidad cruzada (PlantEditorPage.js)
- Panel superior con KPI MC ponderado, acciones, NC, CAPA, actas por activo
- Selector de activo que filtra todo el contexto del editor
- Quick links a Excellence, WeightSampling, Meetings

### WebSocket (plant_layouts.py)
- Endpoint /api/plant-layouts/ws
- Broadcast a todos los clientes conectados del mismo tenant
- Ping/pong para keepalive
- Modo Live ON/OFF en toolbar

### Change log
- Backend: DiagramChangeLog (diagram_id, object_id, change_type, before, after, changed_by)
- Escritura async en batch (750ms debounce) al agregar/eliminar/modificar objetos
- Sin UI de visualizacion ni restauracion aun

---

## Brechas identificadas (lo que falta para ser premium)

### Canvas UX
| Brecha | Impacto |
|---|---|
| Sin snapping a grid ni a objetos | Alto |
| Sin herramientas de alineacion/distribucion multi-seleccion | Alto |
| Sin minimap | Alto |
| Conectores rectos sin routing ortogonal | Alto |
| Sin agrupacion (Group/Ungroup) | Medio |
| Sin modo presentacion / fullscreen | Medio |
| Sin comentarios/anotaciones por objeto | Medio |
| Toolbar overflow en pantallas pequeñas | Bajo |

### Simulacion
| Brecha | Impacto |
|---|---|
| Motor deterministico (no estocastico) | Alto |
| Cuellos de botella no se pintan en el canvas | Alto |
| Sin sliders what-if interactivos | Alto |
| No consume logs reales de Ejecucion como baseline | Alto |
| Sin integracion con Takt Time de Ingenieria | Medio |
| Sin analisis de sensibilidad | Medio |
| Recomendaciones genericas sin accion especifica | Medio |

### Export / Historial
| Brecha | Impacto |
|---|---|
| Sin export PDF | Alto |
| Export ejecutivo solo texto plano | Medio |
| Change log sin UI | Medio |
| Sin versionado de layouts | Medio |

### Tiempo real y colaboracion
| Brecha | Impacto |
|---|---|
| Senales via polling en lugar de WS push | Medio |
| Sin cursores multi-usuario | Medio |
| Sin comentarios colaborativos por objeto | Medio |

---

## Plan de Implementacion V3

### Fase DS-1: Canvas UX Hardening
**Objetivo**: editor de precision, sin friccion para ingenieros de planta.

#### DS-1.1 -- Herramientas de alineacion y distribucion
**Archivos**: `FabricCanvas.js` (metodos), `PlantEditor.js` (toolbar contextual)

Implementar barra contextual flotante al seleccionar 2+ objetos:
- Alinear: left, center-h, right, top, center-v, bottom
- Distribuir: horizontal (espacio igual entre bordes), vertical
- Metodologia: calcular bounding boxes de cada objeto, recalcular `.left`/`.top` en consecuencia
- Metodos en FabricCanvas: `alignObjects(direction)`, `distributeObjects(axis)`
- UI: aparece solo cuando `canvas.getActiveObjects().length >= 2`
- Shortcuts: no asignados inicialmente (evitar conflictos)

```
FabricCanvas.alignObjects(direction)
  directions: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom'
  base: bounding box de la seleccion activa
  
FabricCanvas.distributeObjects(axis)
  axis: 'horizontal' | 'vertical'
  calcula espaciado uniforme entre objetos ordenados por posicion
```

#### DS-1.2 -- Grid visual + snapping
**Archivos**: `FabricCanvas.js`, `PlantEditor.js` (toolbar toggle + select paso)

- Grid dibujado en capa background de Fabric (lineas no exportables, `excludeFromExport: true`)
- Toggle con tecla `G` y boton en toolbar
- Paso configurable: 10 / 20 / 50 px (selector en toolbar)
- Snap en `object:moving`: `obj.left = Math.round(obj.left / gridStep) * gridStep`
- Estado persistido en `this.gridState = { enabled: false, step: 20, visible: true }`
- El grid se redibuja al hacer zoom (escalar con `viewportTransform`)

#### DS-1.3 -- Conectores ortogonales inteligentes
**Archivos**: `tools/ArrowConnector.js` (reemplazar linea recta), `FabricCanvas.js`

Reemplazar `fabric.Line` por `SmartConnector` basado en `fabric.Path`:
- Calcula puntos intermedios para routing en L o Z segun posicion relativa nodo-origen vs nodo-destino
- Algoritmo: si dx > dy => routing horizontal primero, sino vertical primero
- Al mover un nodo: recalcular todos los conectores vinculados via `fromObjectId`/`toObjectId`
- Tipos: recto (actual), ortogonal, curvo (bezier suavizado)
- Selector de tipo en PropertiesPanel para elemento arrowLine

```
SmartConnector.computePath(fromObj, toObj, type='orthogonal')
  -> genera string SVG path 'M x1 y1 L mx my L x2 y2'
  
SmartConnector.updateOnMove(movedObj, canvas)
  -> busca todos los Path con fromObjectId === movedObj.id
  -> recalcula y actualiza path
```

#### DS-1.4 -- Minimap
**Archivos**: `PlantEditor.js` (nuevo componente `Minimap`)

- Canvas `<canvas>` secundario de 180x120px en esquina inferior derecha
- Re-renderiza el canvas principal a escala cada frame con debounce 300ms
- Metodo: `canvas.toDataURL({ multiplier: 180/canvas.width })` -> imagen src
- Viewport indicator (rect azul semitransparente) sincronizado con `viewportTransform`
- Click en minimap navega: convierte coordenadas del click a coordenadas del canvas principal
- Toggle con boton en toolbar

```js
class Minimap {
  constructor(fabricCanvas, hostEl) {}
  render() { /* toDataURL + drawRect viewport */ }
  onClick(x, y) { /* pan canvas al punto */ }
  destroy() {}
}
```

#### DS-1.5 -- Agrupacion (Group/Ungroup)
**Archivos**: `FabricCanvas.js`, `PlantEditor.js` (shortcuts + toolbar)

- `Ctrl+G`: `new fabric.Group(canvas.getActiveObjects())`, hereda `layerId` del primer objeto
- `Ctrl+Shift+G`: `group.toActiveSelection()` para desagrupar
- El grupo se serializa con propiedades custom via `toSerializableJSON`
- En el undo/redo history: guardar estado antes de agrupar

#### DS-1.6 -- Modo presentacion
**Archivos**: `PlantEditor.js`

- Boton `Presentar` en toolbar derecho
- `document.documentElement.requestFullscreen()`
- En modo presentacion: ocultar toolbar, paneles laterales, mostrar solo canvas
- Badge flotante de contexto (nombre del diagrama) en esquina superior
- Escape para salir (escuchar `fullscreenchange`)
- Navegacion por capas como slides: flechas derecha/izquierda hacen zoom a cada capa

---

### Fase DS-2: Simulacion Inteligente
**Objetivo**: motor de simulacion que genere insights accionables reales.

#### DS-2.1 -- Bottleneck overlay sobre canvas
**Archivos**: `PlantEditor.js` (metodo `applyBottleneckOverlay`), sin cambios backend

Tras ejecutar simulacion:
- Los nodos con `tone === 'red'` reciben badge pulsante rojo encima del objeto canvas
- Badge usa la capa `signalOverlayBadge` ya existente (misma infraestructura)
- Diferencia vs signal overlay: este viene del resultado de simulacion, no de polling
- El badge muestra: `score: 142 | util: 1.87x`
- Click en badge: abre panel lateral con detalle del nodo (utilization, effective_capacity, recomendacion)
- Se limpia al ejecutar nuevo escenario o al hacer click en "Limpiar overlay"

```js
applyBottleneckOverlay(criticalPoints) {
  this.clearBottleneckOverlay()
  criticalPoints
    .filter(p => p.tone === 'red')
    .forEach(p => {
      const obj = this.findObjectByNodeId(p.node_id)
      if (!obj) return
      this.renderBottleneckBadge(obj, p)
    })
}

findObjectByNodeId(nodeId) {
  // busca en canvas objetos donde data.assetId === nodeId
}
```

#### DS-2.2 -- Sliders what-if interactivos
**Archivos**: `PlantEditor.js` (panel de simulacion ampliado)

Panel lateral "What-If" con sliders:
- Demanda (u/h): range 10-500, paso 5
- Disponibilidad global (%): range 50-100, paso 1
- Variabilidad (%): range 0-50, paso 1
- Horas turno: range 6-12, paso 0.5

Al mover cualquier slider:
- Recalcula KPIs localmente con motor JS simplificado (no llama al backend)
- Motor local: version simplificada de `_run_simulation_calculation` sin datos de BD
- Respuesta <100ms, actualiza KPI cards en tiempo real
- Grafico sparkline de throughput vs demanda al deslizar (canvas 2D puro)

Al hacer "Guardar + Ejecutar":
- Envia al backend como `config_override` en el endpoint de run existente

```js
_localSimulate(nodes, config) {
  // version JS de _run_simulation_calculation
  // sin consultas a BD, deterministico
  // retorna { kpis, bottleneck, nodes }
}
```

#### DS-2.3 -- Motor estocastico (Monte Carlo)
**Archivos**: `backend/app/api/platform.py` (nuevo endpoint + funcion)

Nuevo endpoint:
```
POST /api/platform/simulation/scenarios/{id}/run-montecarlo
Body: { runs: int (1-200), config_override: {} }
```

Motor:
- Reemplazar onda deterministica por Box-Muller (numpy o implementacion pura Python)
- Por cada nodo: `capacity_sample = normal(mu=base_capacity, sigma=base_capacity * variability)`
- Ejecutar N corridas, acumular KPIs por corrida
- Retornar percentiles p10/p50/p90 para cada KPI
- Resultado: `{ runs: N, kpis: { throughput: { p10, p50, p90 }, ... }, nodes: [...] }`

Frontend:
- Toggle en panel de simulacion: "Deterministico" | "Monte Carlo (N runs)"
- Input para N (1-100, default 50)
- Mostrar resultados como rango p10-p90 en lugar de valor unico
- Fan chart simple con canvas 2D: linea p50 + banda p10-p90

```python
def _run_montecarlo(session, tenant_code, scenario, raw_config, runs=50):
    import random, math
    
    def box_muller(mu, sigma):
        u1, u2 = random.random(), random.random()
        z = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
        return max(0.1, mu + sigma * z)
    
    results = []
    for _ in range(runs):
        # variar capacidades por nodo con distribucion normal
        # ejecutar calculo deterministico con esas capacidades
        results.append(_run_single(config_with_sampled_capacities))
    
    # calcular percentiles
    return { 'p10': percentile(results, 10), 'p50': percentile(results, 50), 'p90': percentile(results, 90) }
```

#### DS-2.4 -- Integracion con datos reales de Ejecucion
**Archivos**: `backend/app/api/platform.py` (nuevo endpoint), `PlantEditor.js` (boton en panel)

Nuevo endpoint:
```
GET /api/platform/simulation/scenarios/{id}/baseline-from-execution?asset_id=...
```

Logica backend:
- Consultar `ProductionLog` del activo: calcular throughput promedio, variabilidad historica
- Calcular variabilidad: stddev / mean de throughput diario
- Retornar: `{ demand_per_hour, variability_coefficient, hours, data_points, date_range }`

Frontend:
- Boton "Usar datos reales" en panel de simulacion
- Al hacer click: carga la config pre-llenada con datos reales
- Muestra badge "Baseline real: {date_range}" junto al nombre del escenario

#### DS-2.5 -- Integracion con Takt Time de Ingenieria
**Archivos**: `backend/app/api/platform.py` (nuevo endpoint), `PlantEditor.js`

Nuevo endpoint:
```
GET /api/platform/simulation/scenarios/{id}/takt-config?asset_id=...
```

Logica:
- Consultar `ProcessStandard.standard_time_minutes` para el activo
- Consultar demanda del modulo de capacidad: `CapacityRecord.demand_per_hour`
- Calcular: `takt_time_sec = (3600 * availability_hours) / demand_units`
- Retornar config con `process_time_sec = takt_time_sec` por nodo

Frontend:
- Badge "Takt Time: Xs" sobre nodos vinculados a activos en el canvas
- Color del badge: verde si `cycle_time < takt_time`, rojo si supera

#### DS-2.6 -- Analisis de sensibilidad
**Archivos**: `backend/app/api/platform.py` (nuevo endpoint), `PlantEditor.js`

Nuevo endpoint:
```
POST /api/platform/simulation/scenarios/{id}/sensitivity
Body: { parameter: 'demand_per_hour', range_pct: 30, steps: 10 }
```

Logica:
- Tomar el valor base del parametro
- Variar de -range_pct% a +range_pct% en `steps` pasos
- Ejecutar simulacion para cada valor
- Retornar: `[{ param_value, throughput, compliance, lead_time }]`

Frontend:
- Grafico de linea (canvas 2D puro) en panel de simulacion
- Selector de parametro a variar: demand / availability / variability
- Selector de KPI a observar: throughput / compliance / lead_time

---

### Fase DS-3: Export y Historial
**Objetivo**: documentacion trazable de diseño y decisiones.

#### DS-3.1 -- Export PDF
**Archivos**: `backend/app/api/plant_layouts.py` (nuevo endpoint), `PlantEditor.js` (boton)

Nuevo endpoint:
```
POST /api/plant-layouts/{id}/export/pdf
Body: { result_id: uuid | null }
```

Logica backend:
- Generar PDF con `simple_pdf.py` (ya existe en el proyecto)
- Contenido: nombre + fecha, thumbnail del diagrama (base64 del json_content), tabla de nodos,
  KPIs de ultima simulacion, recomendaciones, decisiones registradas
- Retornar como `StreamingResponse` con `Content-Type: application/pdf`

Frontend:
- Boton "PDF" en grupo de export del toolbar
- `const blob = await response.blob(); downloadBlob(blob, 'diagrama.pdf')`
- Usar `fileManager.downloadBlob()` ya existente

#### DS-3.2 -- Export ejecutivo estructurado
**Archivos**: `backend/app/api/platform.py` (modificar endpoint existente)

Modificar `GET /api/platform/simulation/scenarios/{id}/export/executive`:
- Agregar parametro `format`: `text` (actual) | `json` | `csv`
- JSON: estructura completa con kpis, nodes, recommendations, decisions
- CSV: tabla de nodos con columnas: node_id, label, utilization, throughput, tone, compliance

Frontend:
- Modal de export con checklist: incluir nodos, KPIs, recomendaciones, decisiones
- Selector de formato: TXT / JSON / CSV

#### DS-3.3 -- UI de historial de cambios
**Archivos**: `PlantEditor.js` (nueva tab en panel derecho)

Panel "Historial" en el right panel (nueva tab junto a Capas | Propiedades):
- Consume `GET /api/platform/diagram/change-log?diagram_id=...`
- Lista cronologica: timestamp, usuario, tipo de cambio, objeto afectado
- Formato por entrada: `[10:32] admin -- object_added rect (capa: Produccion)`
- Boton "Restaurar a este punto": recarga el `json_content` del momento indicado (ver DS-3.4)
- Paginacion simple: cargar mas (limit=120 actual, paginacion por offset)

#### DS-3.4 -- Versionado de layouts
**Archivos**: `backend/app/models.py` (nuevo modelo), `backend/app/api/plant_layouts.py`

Nuevo modelo SQLModel:
```python
class PlantLayoutVersion(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    layout_id: uuid.UUID = Field(foreign_key="plantlayout.id")
    version_number: int
    json_content: str
    thumbnail_data: Optional[str] = None
    label: Optional[str] = None
    created_by: str
    created_at: datetime
```

Nuevos endpoints:
```
GET  /api/plant-layouts/{id}/versions
POST /api/plant-layouts/{id}/versions/{version_number}/restore
```

Logica de auto-versionado:
- Al hacer PUT sobre un layout: comparar con version anterior
- Si el contenido difiere en mas de 5% (comparacion de longitud como proxy): crear version automaticamente
- Maximo 50 versiones por layout (eliminar las mas antiguas)

---

### Fase DS-4: Colaboracion y Tiempo Real
**Objetivo**: multiples usuarios sobre el mismo diagrama.

#### DS-4.1 -- WS push para señales (reemplaza polling)
**Archivos**: `backend/app/api/plant_layouts.py`, `PlantEditor.js`

Backend:
- Cuando se guarda una NC, CAPA o medicion KPI: emitir evento por WS
- Para eso, `quality.py`, `ci.py`, `excellence_advanced.py` importan `_broadcast_ws` de plant_layouts
- Evento: `{ type: 'signal_update', asset_id: '...', status: 'red', payload: {...} }`

Frontend:
- Reemplazar `setInterval 15s` por listener en el WS existente (ya conectado en modo Live)
- Si `payload.type === 'signal_update'`: actualizar `signalOverlay.valuesByAssetId` y re-renderizar
- Mantener el polling como fallback cuando WS esta desconectado

#### DS-4.2 -- Cursores multi-usuario
**Archivos**: `PlantEditor.js`, `backend/app/api/plant_layouts.py` (ya soporta broadcast)

Frontend envia al mover el mouse (throttled 100ms):
```js
ws.send(JSON.stringify({
  type: 'cursor_move',
  x: canvasX,
  y: canvasY,
  username: currentUser,
  color: getUserColor(currentUser)
}))
```

Backend hace broadcast (ya funciona para cualquier tipo de mensaje).

Frontend recibe `cursor_move` de otros usuarios:
- Renderiza cursores como SVG circles con tooltip de username sobre el canvas
- Capa no exportable (`excludeFromExport: true`)
- Desaparecen si no hay movimiento en 3s

Panel de presencia en toolbar: lista de usuarios activos con sus colores.

#### DS-4.3 -- Comentarios por objeto
**Archivos**: `backend/app/models.py` (nuevo modelo), `backend/app/api/plant_layouts.py`, `PlantEditor.js`

Nuevo modelo:
```python
class DiagramComment(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    diagram_id: Optional[uuid.UUID]
    object_id: Optional[str]
    tenant_code: str
    text: str
    created_by: str
    created_at: datetime
    resolved: bool = False
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
```

Endpoints:
```
GET    /api/plant-layouts/{id}/comments?object_id=...
POST   /api/plant-layouts/{id}/comments
PATCH  /api/plant-layouts/{id}/comments/{comment_id}  (resolve)
DELETE /api/plant-layouts/{id}/comments/{comment_id}
```

Frontend:
- Icono de comentario (burbuja) sobre objetos que tienen comentarios (capa no exportable)
- Click en el icono: abre panel lateral con comentarios del objeto
- Campo para agregar nuevo comentario
- Boton "Resolver" por comentario

---

## Prioridad ejecutiva

### Bloque 1 -- Mayor ROI, menor complejidad (arrancar aqui)
| Item | Archivos principales | Complejidad |
|---|---|---|
| DS-1.1 Alineacion y distribucion | FabricCanvas.js, PlantEditor.js | Baja |
| DS-1.2 Grid + snapping | FabricCanvas.js, PlantEditor.js | Baja |
| DS-1.4 Minimap | PlantEditor.js (nuevo Minimap class) | Media |
| DS-2.1 Bottleneck overlay en canvas | PlantEditor.js | Baja |
| DS-2.2 Sliders what-if | PlantEditor.js | Media |
| DS-3.1 Export PDF | plant_layouts.py, PlantEditor.js | Media |

### Bloque 2 -- Diferenciador real
| Item | Archivos principales | Complejidad |
|---|---|---|
| DS-1.3 Conectores ortogonales | ArrowConnector.js | Alta |
| DS-2.3 Motor estocastico MC | platform.py | Media |
| DS-2.4 Datos reales de Ejecucion | platform.py, PlantEditor.js | Media |
| DS-2.5 Takt Time | platform.py, PlantEditor.js | Media |
| DS-3.4 Versionado de layouts | models.py, plant_layouts.py | Media |
| DS-3.3 UI historial de cambios | PlantEditor.js | Baja |

### Bloque 3 -- Premium completo
| Item | Archivos principales | Complejidad |
|---|---|---|
| DS-1.5 Group/Ungroup | FabricCanvas.js | Baja |
| DS-1.6 Modo presentacion | PlantEditor.js | Baja |
| DS-2.6 Analisis sensibilidad | platform.py, PlantEditor.js | Media |
| DS-4.1 WS push señales | plant_layouts.py, PlantEditor.js | Media |
| DS-4.2 Cursores multi-usuario | PlantEditor.js | Media |
| DS-4.3 Comentarios por objeto | models.py, plant_layouts.py, PlantEditor.js | Alta |

---

## Convenciones tecnicas para esta fase

- No introducir dependencias NPM nuevas. Canvas 2D puro para graficos de simulacion.
- D3 ya existe como dependencia opcional -- usarla solo donde ya se usa.
- Nuevos endpoints en `plant_layouts.py` o `platform.py` segun dominio.
- Nuevos modelos: agregar al final de `models.py`, sin modificar columnas existentes.
- Tests nuevos: seguir patron de `conftest.py` en `backend/tests/`.
- Actualizaciones de UI: seguir patron `tk-*` para clases CSS.
- Toda notificacion al usuario via `uiFeedback` (toast), sin `alert()`.
- UTF-8 siempre.

---

## Archivos que se van a modificar por bloque

### Bloque 1
```
frontend/src/components/plant-editor/canvas/FabricCanvas.js    (DS-1.1, DS-1.2)
frontend/src/components/plant-editor/PlantEditor.js             (DS-1.1, DS-1.2, DS-1.4, DS-2.1, DS-2.2)
backend/app/api/plant_layouts.py                                (DS-3.1)
```

### Bloque 2
```
frontend/src/components/plant-editor/tools/ArrowConnector.js    (DS-1.3)
backend/app/api/platform.py                                     (DS-2.3, DS-2.4, DS-2.5, DS-3.2)
frontend/src/components/plant-editor/PlantEditor.js             (DS-2.4, DS-2.5, DS-3.3)
backend/app/models.py                                           (DS-3.4)
backend/app/api/plant_layouts.py                                (DS-3.4)
```

### Bloque 3
```
frontend/src/components/plant-editor/canvas/FabricCanvas.js    (DS-1.5)
frontend/src/components/plant-editor/PlantEditor.js             (DS-1.6, DS-2.6, DS-4.1, DS-4.2, DS-4.3)
backend/app/api/platform.py                                     (DS-2.6)
backend/app/api/plant_layouts.py                                (DS-4.1, DS-4.3)
backend/app/models.py                                           (DS-4.3)
```
