/**
 * ArrowConnector - Crea y gestiona flechas dinámicas entre objetos.
 * Las flechas se actualizan automáticamente cuando los objetos conectados se mueven.
 */
import * as fabric from 'fabric';

export class ArrowConnector {
    constructor(fabricCanvas) {
        this.fabricCanvas = fabricCanvas;
        this.arrows = new Map(); // arrowId -> { line, head, fromObj, toObj }
        this.isConnecting = false;
        this.pendingFrom = null;

        // Listener para actualizar flechas cuando objetos se mueven
        this.setupMoveListener();
    }

    /**
     * Inicia modo de conexión
     */
    startConnecting() {
        this.isConnecting = true;
        this.pendingFrom = null;
        this.fabricCanvas.canvas.defaultCursor = 'crosshair';

        // Listener temporal para clicks
        this.clickHandler = (opt) => {
            const target = opt.target;
            if (!target) return;

            if (!this.pendingFrom) {
                // Primer click: seleccionar origen
                this.pendingFrom = target;
                target.set('stroke', '#8b5cf6');
                target.set('strokeWidth', 3);
                this.fabricCanvas.canvas.renderAll();
            } else if (target !== this.pendingFrom) {
                // Segundo click: crear conexión
                this.createArrow(this.pendingFrom, target);

                // Reset estado visual
                this.pendingFrom.set('stroke', this.pendingFrom._originalStroke || '#4338ca');
                this.pendingFrom.set('strokeWidth', this.pendingFrom._originalStrokeWidth || 2);

                this.stopConnecting();
            }
        };

        this.fabricCanvas.canvas.on('mouse:down', this.clickHandler);
    }

    /**
     * Cancela modo de conexión
     */
    stopConnecting() {
        this.isConnecting = false;
        this.pendingFrom = null;
        this.fabricCanvas.canvas.defaultCursor = 'default';

        if (this.clickHandler) {
            this.fabricCanvas.canvas.off('mouse:down', this.clickHandler);
            this.clickHandler = null;
        }

        this.fabricCanvas.canvas.renderAll();
    }

    /**
     * Crea una flecha entre dos objetos
     */
    createArrow(fromObj, toObj) {
        const arrowId = `arrow-${Date.now()}`;

        // Guardar referencias originales para restore
        fromObj._originalStroke = fromObj.stroke;
        fromObj._originalStrokeWidth = fromObj.strokeWidth;

        // Calcular puntos
        const from = fromObj.getCenterPoint();
        const to = toObj.getCenterPoint();

        // Crear línea
        const line = new fabric.Line([from.x, from.y, to.x, to.y], {
            stroke: '#8b5cf6',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            arrowId: arrowId,
            objectType: 'arrowLine'
        });

        // Crear cabeza de flecha
        const angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
        const head = new fabric.Triangle({
            left: to.x,
            top: to.y,
            width: 15,
            height: 15,
            fill: '#8b5cf6',
            angle: angle + 90,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
            arrowId: arrowId,
            objectType: 'arrowHead'
        });

        // Agregar al canvas
        this.fabricCanvas.canvas.add(line);
        this.fabricCanvas.canvas.add(head);

        // Guardar referencia
        this.arrows.set(arrowId, {
            line,
            head,
            fromObj,
            toObj
        });

        // Agregar ID de flecha a los objetos conectados para rastreo
        if (!fromObj.connectedArrows) fromObj.connectedArrows = [];
        if (!toObj.connectedArrows) toObj.connectedArrows = [];
        fromObj.connectedArrows.push(arrowId);
        toObj.connectedArrows.push(arrowId);

        this.fabricCanvas.canvas.renderAll();

        return arrowId;
    }

    /**
     * Actualiza la posición de una flecha
     */
    updateArrow(arrowId) {
        const arrow = this.arrows.get(arrowId);
        if (!arrow) return;

        const { line, head, fromObj, toObj } = arrow;

        const from = fromObj.getCenterPoint();
        const to = toObj.getCenterPoint();

        // Actualizar línea
        line.set({
            x1: from.x,
            y1: from.y,
            x2: to.x,
            y2: to.y
        });

        // Actualizar cabeza
        const angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
        head.set({
            left: to.x,
            top: to.y,
            angle: angle + 90
        });
    }

    /**
     * Configura listener para actualizar flechas cuando objetos se mueven
     */
    setupMoveListener() {
        this.fabricCanvas.canvas.on('object:moving', (opt) => {
            const obj = opt.target;
            if (obj.connectedArrows && obj.connectedArrows.length > 0) {
                obj.connectedArrows.forEach(arrowId => {
                    this.updateArrow(arrowId);
                });
                this.fabricCanvas.canvas.renderAll();
            }
        });

        // También actualizar al soltar
        this.fabricCanvas.canvas.on('object:modified', (opt) => {
            const obj = opt.target;
            if (obj.connectedArrows && obj.connectedArrows.length > 0) {
                obj.connectedArrows.forEach(arrowId => {
                    this.updateArrow(arrowId);
                });
                this.fabricCanvas.canvas.renderAll();
            }
        });
    }

    /**
     * Elimina una flecha
     */
    removeArrow(arrowId) {
        const arrow = this.arrows.get(arrowId);
        if (!arrow) return;

        // Remover del canvas
        this.fabricCanvas.canvas.remove(arrow.line);
        this.fabricCanvas.canvas.remove(arrow.head);

        // Remover referencia de objetos conectados
        if (arrow.fromObj.connectedArrows) {
            arrow.fromObj.connectedArrows = arrow.fromObj.connectedArrows.filter(id => id !== arrowId);
        }
        if (arrow.toObj.connectedArrows) {
            arrow.toObj.connectedArrows = arrow.toObj.connectedArrows.filter(id => id !== arrowId);
        }

        this.arrows.delete(arrowId);
        this.fabricCanvas.canvas.renderAll();
    }

    /**
     * Elimina todas las flechas conectadas a un objeto
     */
    removeArrowsForObject(obj) {
        if (!obj.connectedArrows) return;

        // Crear copia porque vamos a modificar el array
        const arrowIds = [...obj.connectedArrows];
        arrowIds.forEach(arrowId => {
            this.removeArrow(arrowId);
        });
    }
}
